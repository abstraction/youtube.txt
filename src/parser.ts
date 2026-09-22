import fs from 'fs';
import readline from 'readline';
import nlp from 'compromise';

export interface Paragraph {
  timestamp: string; // HH:MM:SS.mmm
  seconds: number;
  text: string;
  sceneTimestamp?: string;
  sceneTimestamps?: string[];
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
    crlfDelay: Infinity,
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

    const timeMatch = trimmed.match(
      /^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/
    );
    if (timeMatch) {
      const startStr = timeMatch[1]
        ? `${timeMatch[1]}${timeMatch[2]}`
        : `00:${timeMatch[2]}`;
      const endStr = timeMatch[3]
        ? `${timeMatch[3]}${timeMatch[4]}`
        : `00:${timeMatch[4]}`;
      currentTimestamp = startStr;

      const parseTime = (ts: string) => {
        const parts = ts.split(':');
        const h = parseInt(parts[0] ?? '0', 10);
        const m = parseInt(parts[1] ?? '0', 10);
        const s = parseFloat(parts[2] ?? '0');
        return h * 3600 + m * 60 + s;
      };

      currentSeconds = parseTime(startStr);
      currentEndSeconds = parseTime(endStr);
      continue;
    }

    let cleanText = trimmed;
    if (cleanText.startsWith('>> ') || cleanText.startsWith('&gt;&gt; ')) {
      cleanText =
        '[New Speaker]: ' + cleanText.replace(/^(>>|&gt;&gt;)\s*/, '');
    }

    // Decode safe HTML entities first
    cleanText = cleanText
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Strip WebVTT formatting tags (<c>, <b>, <v>, etc.)
    cleanText = cleanText.replace(/<[^>]+>/g, '').trim();
    if (!cleanText) continue;

    // Re-escape angle brackets to prevent stored XSS injection in HTML templates
    cleanText = cleanText.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (currentTimestamp) {
      if (!slidingWindow.includes(cleanText)) {
        rawCues.push({
          timestamp: currentTimestamp,
          seconds: currentSeconds,
          endSeconds: currentEndSeconds,
          text: cleanText,
        });

        slidingWindow.push(cleanText);
        if (slidingWindow.length > WINDOW_SIZE) slidingWindow.shift();
      }
    }
  }

  const paragraphs: Paragraph[] = [];
  if (rawCues.length === 0) return paragraphs;

  // 1. Join all text first to give NLP full context
  const combinedText = rawCues.map((c) => c.text).join(' ');

  // 2. Track offsets so we can map sentences back to timestamps
  const cueOffsets: { cue: RawCue; startChar: number; endChar: number }[] = [];
  let offset = 0;
  for (const cue of rawCues) {
    const len = cue.text.length;
    cueOffsets.push({ cue, startChar: offset, endChar: offset + len });
    offset += len + 1; // +1 for the space
  }

  // 3. Let NLP parse the full text with complete context
  const doc = nlp(combinedText);
  const rawSentences = doc.sentences().out('array') as string[];

  const sentences: string[] = [];
  const MAX_WORDS = 40;
  const CHUNK_SIZE = 20;

  for (const rs of rawSentences) {
    const trimmed = rs.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length <= MAX_WORDS) {
      sentences.push(trimmed);
    } else {
      // Split excessively long unpunctuated sentences into smaller pseudo-sentences
      for (let i = 0; i < words.length; i += CHUNK_SIZE) {
        sentences.push(words.slice(i, i + CHUNK_SIZE).join(' '));
      }
    }
  }

  // 4. Reconstruct paragraphs cleanly
  let currentParagraphSentences: string[] = [];
  let paragraphStartCue: RawCue | null = null;
  let charTracker = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i] as string;

    // Find the cue corresponding to the start of this sentence
    const matchedCueObj =
      cueOffsets.find((c) => c.endChar > charTracker) ||
      cueOffsets[cueOffsets.length - 1];
    if (!matchedCueObj) continue;
    const matchedCue = matchedCueObj.cue;

    if (currentParagraphSentences.length === 0) {
      paragraphStartCue = matchedCue;
    }

    currentParagraphSentences.push(sentence);
    charTracker += sentence.length + 1;

    if (currentParagraphSentences.length >= 3 || i === sentences.length - 1) {
      paragraphs.push({
        timestamp: paragraphStartCue!.timestamp,
        seconds: paragraphStartCue!.seconds,
        text: currentParagraphSentences.join(' '),
      });
      currentParagraphSentences = [];
    }
  }

  return paragraphs;
}
