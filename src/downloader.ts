import { execa } from 'execa';
import fs from 'fs';

export interface DownloadResult {
  videoFile: string;
  vttFile: string;
}

export async function downloadVideoAndCaptions(url: string): Promise<DownloadResult> {
  // Use the one-pass print method mandated
  const { stdout } = await execa('yt-dlp', [
    '--write-auto-subs',
    '--write-subs',
    url,
    '--no-simulate',
    '--print', 'after_move:filepath'
  ]);

  const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Find the video file from the output lines (usually the last printed item)
  const videoFile = lines.find(l => l.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i)) || lines[lines.length - 1];

  // Find the .vtt file in the current directory since yt-dlp saves it here
  const files = fs.readdirSync('.');
  const vttFile = files.find(f => f.endsWith('.vtt'));

  if (!videoFile || !fs.existsSync(videoFile)) {
    throw new Error(`Failed to locate downloaded video file. output was: ${stdout}`);
  }

  if (!vttFile) {
    throw new Error('Failed to locate downloaded VTT subtitles (video might not have captions).');
  }

  return { videoFile, vttFile };
}
