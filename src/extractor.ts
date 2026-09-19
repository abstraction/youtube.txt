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
}
