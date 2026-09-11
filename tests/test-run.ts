import { parseVtt } from '../src/parser.js';
import { extractFrames } from '../src/extractor.js';
import { generateHtml } from '../src/generator.js';
import fs from 'node:fs';

const videoFile = 'iPhone 18 Pro⧸Duo Impressions： Mogged [Od6M0AXpcxQ].webm';
const vttFile = 'iPhone 18 Pro⧸Duo Impressions： Mogged [Od6M0AXpcxQ].en.vtt';
const url = 'https://www.youtube.com/watch?v=Od6M0AXpcxQ';

async function main() {
  process.chdir('test-marcus');
  if (!fs.existsSync('images')) fs.mkdirSync('images');
  console.log('Parsing VTT...');
  const paragraphs = await parseVtt(vttFile);
  console.log(`Parsed ${paragraphs.length} paragraphs.`);
  console.log('Extracting frames...');
  await extractFrames(videoFile, paragraphs, { concurrency: 4, threadsPerWorker: 1 });
  console.log('Generating HTML...');
  await generateHtml(url, paragraphs);
  console.log('Done!');
}
main();
