#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import ora from 'ora';
import fs from 'node:fs';
import path from 'node:path';
import { downloadVideoAndCaptions } from './downloader.js';
import { extractFrames } from './extractor.js';
import { parseVtt } from './parser.js';
import { generateHtml } from './generator.js';
import { resolveResourceProfile } from './resources.js';

interface CliOptions {
  out: string;
  url: string;
  concurrency?: string;
  threads?: string;
}

const abortController = new AbortController();

let aborting = false;
const handleSignal = () => {
  if (aborting) {
    process.exit(130);
  }
  aborting = true;
  process.stderr.write('\n' + chalk.yellow('Aborting and cleaning up (press Ctrl-C again to force quit)...') + '\n');
  abortController.abort();
};

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

const program = new Command();

program
  .name('youtube.txt')
  .description('Create a webpage from a Youtube video with a transcript paired with screenshots')
  .requiredOption('-u, --url <url>', 'URL of the YouTube video')
  .requiredOption('-o, --out <projectName>', 'Name of the output project folder')
  .option('-c, --concurrency <number>', 'Number of parallel extraction workers (default: dynamic auto-tuning)')
  .option('-t, --threads <number>', 'FFmpeg threads per worker instance (default: 1)')
  .action(async (options: CliOptions) => {
    const { out: projectName, url, concurrency: concurrencyOpt, threads: threadsOpt } = options;

    try {
      await execa('yt-dlp', ['--version']);
    } catch {
      console.error(chalk.red('Error: yt-dlp is not installed or not in PATH.'));
      process.exit(1);
    }

    try {
      await execa('ffmpeg', ['-version']);
    } catch {
      console.error(chalk.red('Error: ffmpeg is not installed or not in PATH.'));
      process.exit(1);
    }

    const concurrencyParsed = concurrencyOpt ? parseInt(concurrencyOpt, 10) : undefined;
    const profile = await resolveResourceProfile(concurrencyParsed);
    const threadsPerWorker = threadsOpt ? parseInt(threadsOpt, 10) : profile.threadsPerWorker;

    console.log(chalk.blue(`Initializing project: ${projectName}...`));
    console.log(
      chalk.dim(
        `System: ${profile.cpuCount} CPU cores | ${profile.freeMemoryMb} MB free RAM | Load avg: ${profile.loadAverage.toFixed(2)}`
      )
    );
    console.log(
      chalk.dim(
        `Dynamic allocation: ${profile.recommendedConcurrency} worker pool (${threadsPerWorker} thread/worker)`
      )
    );

    if (!fs.existsSync(projectName)) {
      fs.mkdirSync(projectName, { recursive: true });
    }

    // Switch into the directory so all relative paths work seamlessly
    process.chdir(projectName);

    if (!fs.existsSync('images')) {
      fs.mkdirSync('images');
    }

    const spinner = ora('Downloading video and captions...').start();
    try {
      const { videoFile, vttFile } = await downloadVideoAndCaptions(url, {
        signal: abortController.signal
      });
      spinner.succeed(`Downloaded video and captions: ${videoFile}`);

      spinner.start('Parsing captions...');
      const paragraphs = await parseVtt(vttFile);
      spinner.succeed(`Parsed ${paragraphs.length} paragraphs.`);

      spinner.start('Extracting frames (0%)...');
      await extractFrames(videoFile, paragraphs, {
        concurrency: profile.recommendedConcurrency,
        threadsPerWorker,
        signal: abortController.signal,
        onProgress: (completed, total) => {
          const percent = Math.floor((completed / total) * 100);
          spinner.text = `Extracting frames: ${completed}/${total} (${percent}%) [${profile.recommendedConcurrency} workers, ${threadsPerWorker} th/w]`;
        }
      });
      spinner.succeed(`Extracted frames successfully (${paragraphs.length} paragraphs).`);

      spinner.start('Generating HTML...');
      await generateHtml(url, paragraphs);
      spinner.succeed(`Done! View your webpage at ${path.join(process.cwd(), 'index.html')}`);
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        spinner.fail('Process aborted.');
        process.exit(130);
      }
      spinner.fail('An error occurred during processing.');
      if (err instanceof Error) {
        console.error(chalk.red(err.message));
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
