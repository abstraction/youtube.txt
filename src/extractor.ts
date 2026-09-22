import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { execa } from 'execa';
import type { Paragraph } from './parser.js';

export interface ExtractFramesOptions {
  concurrency?: number;
  threadsPerWorker?: number;
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
  sceneThreshold?: number;
  dedupThreshold?: number;
  outputDir?: string;
}

export async function extractFrames(
  videoFile: string,
  paragraphs: Paragraph[],
  options: ExtractFramesOptions = {}
): Promise<void> {
  const {
    concurrency = 4,
    threadsPerWorker = 1,
    signal,
    onProgress,
    sceneThreshold = 0.15,
    dedupThreshold = 4,
    outputDir,
  } = options;

  const imagesDir = outputDir
    ? path.resolve(outputDir, 'images')
    : path.resolve('images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  if (paragraphs.length === 0) return;

  // Probe video duration to avoid seeking past EOF
  let videoDuration: number | null = null;
  try {
    const { stdout } = await execa('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      videoFile,
    ]);
    const parsed = parseFloat(stdout.trim());
    if (!isNaN(parsed) && parsed > 0) {
      videoDuration = parsed;
    }
  } catch {
    // ffprobe failed or format unknown, proceed without duration clamping
  }

  const maxSafeTimestamp =
    videoDuration !== null ? Math.max(0, videoDuration - 0.5) : Infinity;

  // Phase A: Scene detection pre-pass
  let sceneTimes: number[] = [0];
  try {
    const execOptions = signal ? { cancelSignal: signal } : {};
    const { stderr } = await execa(
      'ffmpeg',
      [
        '-i',
        videoFile,
        '-filter:v',
        `select='gt(scene,${sceneThreshold})',showinfo`,
        '-f',
        'null',
        '-',
      ],
      execOptions
    );

    const regex = /pts_time:([0-9.]+)/g;
    let match;
    while ((match = regex.exec(stderr)) !== null) {
      const st = parseFloat(match[1] as string);
      if (st <= maxSafeTimestamp) {
        sceneTimes.push(st);
      }
    }
  } catch (err: any) {
    if (signal?.aborted) throw new Error('Frame extraction aborted by user');
    // If it fails for another reason, we at least have [0]
  }

  sceneTimes.sort((a, b) => a - b);

  // Phase B: Collect all detected scene cuts and map paragraphs
  const uniqueScenes = new Set<number>();
  for (const st of sceneTimes) {
    if (st <= maxSafeTimestamp) {
      uniqueScenes.add(st);
    }
  }
  if (uniqueScenes.size === 0) {
    uniqueScenes.add(0);
  }

  // Phase B2: 5-second span-based fallback for long continuous takes
  const FALLBACK_THRESHOLD = 5;
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]!;
    const nextP = paragraphs[i + 1];
    let pEnd = nextP ? nextP.seconds : p.seconds + 10;
    if (pEnd > maxSafeTimestamp) {
      pEnd = maxSafeTimestamp;
    }

    // Ensure we sample intermediate frames every 5s if no scene cut exists
    for (let t = p.seconds; t <= pEnd; t += FALLBACK_THRESHOLD) {
      if (t > maxSafeTimestamp) break;
      const roundedT = Math.round(t * 100) / 100;
      const hasNearbyScene = Array.from(uniqueScenes).some(
        (s) => Math.abs(s - roundedT) < 2.5
      );
      if (!hasNearbyScene) {
        uniqueScenes.add(roundedT);
      }
    }
  }

  // Map each paragraph to its base scene and any scenes occurring during its speech
  const sortedUniqueScenes = Array.from(uniqueScenes).sort((a, b) => a - b);
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]!;
    const nextP = paragraphs[i + 1];
    const pEnd = nextP ? nextP.seconds : p.seconds + 10;

    let baseScene = sortedUniqueScenes[0] ?? 0;
    const midScenes: number[] = [];

    for (const st of sortedUniqueScenes) {
      if (st <= p.seconds) {
        baseScene = st;
      } else if (st < pEnd) {
        midScenes.push(st);
      } else {
        break;
      }
    }

    p.sceneTimestamp = String(baseScene);
    p.sceneTimestamps = Array.from(new Set([baseScene, ...midScenes])).map(
      String
    );
  }

  // Phase C: Extract frames
  const timestampsToExtract = Array.from(uniqueScenes);
  const total = timestampsToExtract.length;
  let completed = 0;
  let currentIndex = 0;

  const worker = async (): Promise<void> => {
    while (currentIndex < timestampsToExtract.length) {
      if (signal?.aborted) {
        throw new Error('Frame extraction aborted by user');
      }

      const idx = currentIndex++;
      const ts = timestampsToExtract[idx] as number;
      const outPath = path.join(imagesDir, `${ts}.jpg`);

      if (!fs.existsSync(outPath)) {
        try {
          const execOptions = signal ? { cancelSignal: signal } : {};
          await execa(
            'ffmpeg',
            [
              '-y',
              '-ss',
              String(ts),
              '-nostdin',
              '-threads',
              String(threadsPerWorker),
              '-i',
              videoFile,
              '-frames:v',
              '1',
              '-q:v',
              '2',
              '-vf',
              'scale=1024:-1',
              outPath,
            ],
            execOptions
          );
        } catch (err: unknown) {
          if (signal?.aborted) {
            throw new Error('Frame extraction aborted by user');
          }
          // Non-fatal: if extraction of a specific frame fails (e.g. past EOF or corrupted frame),
          // clean up any 0-byte file that ffmpeg may have touched and continue
          if (fs.existsSync(outPath)) {
            try {
              const stat = fs.statSync(outPath);
              if (stat.size === 0) fs.unlinkSync(outPath);
            } catch {}
          }
        }
      }

      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }
    }
  };

  const poolSize = Math.max(
    1,
    Math.min(concurrency, timestampsToExtract.length)
  );
  const workers = Array.from({ length: poolSize }, () => worker());

  await Promise.all(workers);

  // Validate extracted images and build fallback for any missing frames
  const validTimestamps = timestampsToExtract
    .filter((ts) => {
      const p = path.join(imagesDir, `${ts}.jpg`);
      try {
        return fs.existsSync(p) && fs.statSync(p).size > 0;
      } catch {
        return false;
      }
    })
    .sort((a, b) => a - b);

  const missingRemap = new Map<number, number>();
  for (const ts of timestampsToExtract) {
    const p = path.join(imagesDir, `${ts}.jpg`);
    const exists = fs.existsSync(p) && fs.statSync(p).size > 0;
    if (!exists && validTimestamps.length > 0) {
      let closest = validTimestamps[0]!;
      let minDiff = Math.abs(ts - closest);
      for (const vt of validTimestamps) {
        const diff = Math.abs(ts - vt);
        if (diff < minDiff) {
          minDiff = diff;
          closest = vt;
        }
      }
      missingRemap.set(ts, closest);
    }
  }

  // Phase D: Deduplication (dHash)
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'yt-dhash-')
  );

  async function computeDHash(ts: number): Promise<string> {
    const imagePath = path.join(imagesDir, `${ts}.jpg`);
    if (!fs.existsSync(imagePath)) return '';
    const tmpPath = path.join(tempDir, `${ts}.raw`);
    await execa('ffmpeg', [
      '-i',
      imagePath,
      '-vf',
      'scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:-1:-1:color=black,scale=9:8,format=gray',
      '-f',
      'rawvideo',
      '-y',
      tmpPath,
    ]);
    const buf = await fs.promises.readFile(tmpPath);
    let hash = '';
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = buf[y * 9 + x];
        const right = buf[y * 9 + x + 1];
        if (left !== undefined && right !== undefined) {
          hash += left > right ? '1' : '0';
        }
      }
    }
    return hash;
  }

  function hammingDistance(hash1: string, hash2: string): number {
    let diff = 0;
    for (let i = 0; i < 64; i++) {
      if (hash1[i] !== hash2[i]) diff++;
    }
    return diff;
  }

  // Parallelize hash calculation across workers for valid images only
  const hashes = new Map<number, string>();
  let hashIdx = 0;
  const hashWorker = async (): Promise<void> => {
    while (hashIdx < validTimestamps.length) {
      if (signal?.aborted) throw new Error('Frame extraction aborted by user');
      const idx = hashIdx++;
      const ts = validTimestamps[idx];
      if (ts === undefined) break;
      try {
        const h = await computeDHash(ts);
        if (h) hashes.set(ts, h);
      } catch {
        // If hash generation fails, leave unset so it won't be deleted
      }
    }
  };

  const hashPool = Math.max(1, Math.min(concurrency, validTimestamps.length));
  await Promise.all(Array.from({ length: hashPool }, () => hashWorker()));

  let lastKeptTs: number | null = null;
  let lastKeptHash: string | null = null;
  const remapping = new Map<number, number>();

  for (const ts of validTimestamps) {
    const hash = hashes.get(ts);
    if (!hash) {
      remapping.set(ts, ts);
      continue;
    }

    if (lastKeptTs !== null && lastKeptHash !== null) {
      const dist = hammingDistance(lastKeptHash, hash);
      if (dist <= dedupThreshold) {
        // It's a duplicate
        remapping.set(ts, lastKeptTs);
        try {
          fs.unlinkSync(path.join(imagesDir, `${ts}.jpg`));
        } catch {
          // Keep deduplication mapping even if physical deletion fails
        }
        continue;
      }
    }
    lastKeptTs = ts;
    lastKeptHash = hash;
    remapping.set(ts, ts);
  }

  // Cleanup temp dir
  await fs.promises.rm(tempDir, { recursive: true, force: true });

  function resolveTs(ts: number): number {
    let current = missingRemap.has(ts) ? missingRemap.get(ts)! : ts;
    if (remapping.has(current)) {
      current = remapping.get(current)!;
    }
    return current;
  }

  // Update paragraphs with new remapped timestamps
  for (const p of paragraphs) {
    if (p.sceneTimestamp) {
      const oldTs = parseFloat(p.sceneTimestamp);
      p.sceneTimestamp = String(resolveTs(oldTs));
    }
    if (p.sceneTimestamps) {
      const remappedList = p.sceneTimestamps.map((tsStr) => {
        const oldTs = parseFloat(tsStr);
        return String(resolveTs(oldTs));
      });
      p.sceneTimestamps = Array.from(new Set(remappedList));
    }
  }
}
