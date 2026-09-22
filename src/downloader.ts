import { execa } from 'execa';
import fs from 'node:fs';
import path from 'node:path';

export interface DownloadResult {
  videoFile: string;
  vttFile: string;
}

export interface DownloadOptions {
  signal?: AbortSignal;
  outputDir?: string;
}

export async function downloadVideoAndCaptions(
  url: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const targetDir = options.outputDir
    ? path.resolve(options.outputDir)
    : process.cwd();
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const execOptions: Record<PropertyKey, unknown> = {
    cwd: targetDir,
    ...(options.signal ? { cancelSignal: options.signal } : {}),
  };

  const args = [
    '--write-auto-subs',
    '--write-subs',
    url,
    '--no-simulate',
    '--print',
    'after_move:filepath',
  ];

  if (options.outputDir) {
    args.push('-P', targetDir);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { stdout } = await execa('yt-dlp', args, execOptions);

      const lines = stdout
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      // Find the video file from the output lines (usually the last printed item)
      let videoFile =
        lines.find((l) => l.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i)) ||
        lines[lines.length - 1];

      if (videoFile && !path.isAbsolute(videoFile)) {
        videoFile = path.resolve(targetDir, videoFile);
      }

      // Find the .vtt file in targetDir since yt-dlp saves it here
      const files = fs.readdirSync(targetDir);
      const vttFilename = files.find((f) => f.endsWith('.vtt'));

      if (!videoFile || !fs.existsSync(videoFile)) {
        throw new Error(
          `Failed to locate downloaded video file. Output was: ${stdout}`
        );
      }

      if (!vttFilename) {
        throw new Error(
          'Failed to locate downloaded VTT subtitles (video might not have captions).'
        );
      }

      const vttFile = path.resolve(targetDir, vttFilename);

      return { videoFile, vttFile };
    } catch (err: unknown) {
      lastError = err;
      if (options.signal?.aborted) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        attempt < 3 &&
        (msg.includes('429') ||
          msg.includes('Too Many Requests') ||
          msg.includes('HTTP Error 429'))
      ) {
        // Wait with backoff before retrying
        await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
