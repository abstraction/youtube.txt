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
  } = options;

  if (paragraphs.length === 0) return;

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
      sceneTimes.push(parseFloat(match[1] as string));
    }
  } catch (err: any) {
    if (signal?.aborted) throw new Error('Frame extraction aborted by user');
    // If it fails for another reason, we at least have [0]
  }

  sceneTimes.sort((a, b) => a - b);

  // Phase B: Map paragraphs to scene times
  const uniqueScenes = new Set<number>();
  for (const p of paragraphs) {
    let matchedScene = sceneTimes[0] as number;
    for (const st of sceneTimes) {
      if (st <= p.seconds) {
        matchedScene = st;
      } else {
        break;
      }
    }
    p.sceneTimestamp = String(matchedScene);
    uniqueScenes.add(matchedScene);
  }

  // Phase B2: Fallback frames for paragraphs far from their scene
  const FALLBACK_THRESHOLD = 8;
  const fallbackTimestamps = new Set<number>();
  for (const p of paragraphs) {
    let sceneTs = p.sceneTimestamp ? parseFloat(p.sceneTimestamp) : NaN;
    if (isNaN(sceneTs) || Math.abs(p.seconds - sceneTs) > FALLBACK_THRESHOLD) {
      fallbackTimestamps.add(p.seconds);
      p.sceneTimestamp = String(p.seconds);
    }
  }
  // Merge fallbacks into the extraction set
  for (const ts of fallbackTimestamps) {
    uniqueScenes.add(ts);
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
      const outPath = `images/${ts}.jpg`;

      if (!fs.existsSync(outPath)) {
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

  // Phase D: Deduplication (dHash)
  timestampsToExtract.sort((a, b) => a - b);

  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'yt-dhash-')
  );

  async function computeDHash(ts: number): Promise<string> {
    const imagePath = `images/${ts}.jpg`;
    const tmpPath = path.join(tempDir, `${ts}.raw`);
    await execa('ffmpeg', [
      '-i',
      imagePath,
      '-vf',
      'scale=9:8,format=gray',
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
        hash += left > right ? '1' : '0';
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

  let lastKeptTs: number | null = null;
  let lastKeptHash: string | null = null;
  const remapping = new Map<number, number>();

  for (const ts of timestampsToExtract) {
    if (signal?.aborted) throw new Error('Frame extraction aborted by user');
    try {
      const hash = await computeDHash(ts);
      if (lastKeptTs !== null && lastKeptHash !== null) {
        const dist = hammingDistance(lastKeptHash, hash);
        if (dist <= 10) {
          // It's a duplicate
          remapping.set(ts, lastKeptTs);
          // Try deleting it
          fs.unlinkSync(`images/${ts}.jpg`);
          continue;
        }
      }
      lastKeptTs = ts;
      lastKeptHash = hash;
      remapping.set(ts, ts);
    } catch (err) {
      // If image doesn't exist or fails, just keep mapping to self
      remapping.set(ts, ts);
    }
  }

  // Cleanup temp dir
  await fs.promises.rm(tempDir, { recursive: true, force: true });

  // Update paragraphs with new remapped timestamps
  for (const p of paragraphs) {
    if (p.sceneTimestamp) {
      const oldTs = parseFloat(p.sceneTimestamp);
      if (remapping.has(oldTs)) {
        p.sceneTimestamp = String(remapping.get(oldTs));
      }
    }
  }
}
