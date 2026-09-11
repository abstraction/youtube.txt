import fs from 'fs';
import readline from 'readline';
import nlp from 'compromise';

export interface Paragraph {
  timestamp: string; // HH:MM:SS.mmm
  seconds: number;
  text: string;
  sceneTimestamp?: string;
}

interface RawCue {
  timestamp: string;
  seconds: number;
  endSeconds: number;
  text: string;
}

export async function parseVtt(vttFile: string): Promise<Paragraph[]> {
  const fileStream = fs.createReadStream(vttFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const rawCues: RawCue[] = [];
  let currentTimestamp: string | null = null;
  let currentSeconds = 0;
  let currentEndSeconds = 0;
  let timestampSeen = false;
  
  const slidingWindow: string[] = [];
  const WINDOW_SIZE = 5;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (!timestampSeen && !trimmed.match(/^\d{2}:\d{2}/)) continue;
    timestampSeen = true;

    const timeMatch = trimmed.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/);
    if (timeMatch) {
      const startStr = timeMatch[1] ? `${timeMatch[1]}${timeMatch[2]}` : `00:${timeMatch[2]}`;
      const endStr = timeMatch[3] ? `${timeMatch[3]}${timeMatch[4]}` : `00:${timeMatch[4]}`;
      currentTimestamp = startStr;
      
      const parseTime = (ts: string) => {
        const parts = ts.split(':');
        const h = parseInt(parts[0] ?? '0', 10);
        const m = parseInt(parts[1] ?? '0', 10);
        const s = parseFloat(parts[2] ?? '0');
        return (h * 3600) + (m * 60) + s;
      };
      
      currentSeconds = parseTime(startStr);
      currentEndSeconds = parseTime(endStr);
      continue;
    }

    if (trimmed.match(/^\d+$/)) continue;

    const cleanText = trimmed.replace(/<[^>]+>/g, '').trim();
    if (!cleanText) continue;

    if (currentTimestamp) {
      if (!slidingWindow.includes(cleanText)) {
        rawCues.push({
          timestamp: currentTimestamp,
          seconds: currentSeconds,
          endSeconds: currentEndSeconds,
          text: cleanText
        });
        
        slidingWindow.push(cleanText);
        if (slidingWindow.length > WINDOW_SIZE) slidingWindow.shift();
      }
    }
  }

  const paragraphs: Paragraph[] = [];
  let buffer: RawCue[] = [];

  const processBuffer = (cues: RawCue[]) => {
    if (cues.length === 0) return;
    const combinedText = cues.map(c => c.text).join(' ');
    const doc = nlp(combinedText);
    const sentences = doc.sentences().out('array') as string[];

    let currentParagraphSentences: string[] = [];
    let charCount = 0;
    let thisParagraphCue: RawCue | null = null;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i] as string;
      
      // When starting a new paragraph, accurately map the character offset back to the original Cue
      if (currentParagraphSentences.length === 0) {
         let currentLen = 0;
         let matchedCue = cues[0] as RawCue;
         for (const c of cues) {
           if (currentLen + c.text.length >= charCount) {
             matchedCue = c;
             break;
           }
           currentLen += c.text.length + 1; // +1 for the space
         }
         thisParagraphCue = matchedCue;
      }

      currentParagraphSentences.push(sentence);
      charCount += sentence.length + 1;
      
      if (currentParagraphSentences.length >= 3 || i === sentences.length - 1) {
        paragraphs.push({
          timestamp: thisParagraphCue!.timestamp,
          seconds: thisParagraphCue!.seconds,
          text: currentParagraphSentences.join(' ')
        });
        currentParagraphSentences = [];
      }
    }
  };

  for (let i = 0; i < rawCues.length; i++) {
    const cue = rawCues[i] as RawCue;
    const prev = i > 0 ? (rawCues[i - 1] as RawCue) : null;
    let shouldBreak = false;

    if (buffer.length > 0 && prev) {
      const pauseDuration = cue.seconds - prev.endSeconds;
      const bufferDuration = cue.seconds - (buffer[0] as RawCue).seconds;
      
      if (pauseDuration > 1.5) {
        shouldBreak = true;
      } else if (bufferDuration > 30) {
        shouldBreak = true;
      }
    }

    if (shouldBreak) {
      processBuffer(buffer);
      buffer = [];
    }
    
    buffer.push(cue);
  }
  processBuffer(buffer);

  return paragraphs;
}
