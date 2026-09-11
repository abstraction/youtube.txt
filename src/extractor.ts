import { execa } from 'execa';
import { Cue } from './parser.js';

export async function extractFrames(videoFile: string, cues: Cue[]): Promise<void> {
  // Extract unique timestamps to avoid extracting the same frame twice
  const timestamps = [...new Set(cues.map(c => c.timestamp))];
  
  // We process in chunks to avoid spawning thousands of ffmpeg processes simultaneously
  const CHUNK_SIZE = 10;
  
  for (let i = 0; i < timestamps.length; i += CHUNK_SIZE) {
    const chunk = timestamps.slice(i, i + CHUNK_SIZE);
    
    await Promise.all(chunk.map(async (ts) => {
      const tsFilename = ts.replace(/:/g, '-');
      const outPath = `images/${tsFilename}.jpg`;
      
      // The -ss flag MUST be before -i for O(1) input seeking
      await execa('ffmpeg', [
        '-y', // Overwrite if exists
        '-ss', ts,
        '-nostdin',
        '-i', videoFile,
        '-frames:v', '1',
        '-q:v', '2',
        '-vf', 'scale=1024:-1',
        outPath
      ]);
    }));
  }
}
