import fs from 'fs';
import readline from 'readline';

export interface Cue {
  timestamp: string; // HH:MM:SS.mmm
  seconds: number;
  text: string;
}

export async function parseVtt(vttFile: string): Promise<Cue[]> {
  const fileStream = fs.createReadStream(vttFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const cues: Cue[] = [];
  let currentTimestamp: string | null = null;
  let currentSeconds: number = 0;
  let timestampSeen = false;
  
  // Sliding window to deduplicate rolling captions
  const slidingWindow: string[] = [];
  const WINDOW_SIZE = 5;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Ignore VTT header or formatting cues until we see the first timestamp
    if (!timestampSeen && !trimmed.match(/^\d{2}:\d{2}/)) {
      continue;
    }
    timestampSeen = true;

    // Check for timestamp line (e.g. 00:00:01.199 --> 00:00:05.120)
    // Sometimes it's MM:SS.mmm instead of HH:MM:SS.mmm
    const timeMatch = trimmed.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->/);
    if (timeMatch) {
      const timeStr = timeMatch[1] ? `${timeMatch[1]}${timeMatch[2]}` : `00:${timeMatch[2]}`;
      currentTimestamp = timeStr;
      
      const [hours, minutes, secondsStr] = currentTimestamp.split(':');
      const seconds = parseFloat(secondsStr);
      currentSeconds = (parseInt(hours, 10) * 3600) + (parseInt(minutes, 10) * 60) + seconds;
      continue;
    }

    // Ignore lines that are just numbers (cue indices)
    if (trimmed.match(/^\d+$/)) continue;

    // Remove tags like <c> or <c.colorXXXX>
    const cleanText = trimmed.replace(/<[^>]+>/g, '').trim();
    if (!cleanText) continue;

    if (currentTimestamp) {
      // Deduplicate using the sliding window
      if (!slidingWindow.includes(cleanText)) {
        cues.push({
          timestamp: currentTimestamp, // 00:00:01.199
          seconds: currentSeconds,
          text: cleanText
        });
        
        slidingWindow.push(cleanText);
        if (slidingWindow.length > WINDOW_SIZE) {
          slidingWindow.shift();
        }
      }
    }
  }

  return cues;
}
