#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import ora from 'ora';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { downloadVideoAndCaptions } from './downloader.js';
import { extractFrames } from './extractor.js';
import { parseVtt } from './parser.js';
import { generateHtml } from './generator.js';
import { resolveResourceProfile } from './resources.js';
import { fetchVideoTitle, sanitizeTitle } from './server/title.js';

interface CliOptions {
  out?: string;
  url?: string;
  concurrency?: string;
  threads?: string;
  sceneThreshold?: string;
}

const abortController = new AbortController();

let aborting = false;
const handleSignal = () => {
  if (aborting) {
    process.exit(130);
  }
  aborting = true;
  process.stderr.write(
    '\n' +
      chalk.yellow(
        'Aborting and cleaning up (press Ctrl-C again to force quit)...'
      ) +
      '\n'
  );
  abortController.abort();
};

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

const program = new Command();

program
  .name('youtube.txt')
  .description(
    'Create a webpage from a Youtube video with a transcript paired with screenshots'
  )
  .argument('[url]', 'URL of the YouTube video')
  .option('-u, --url <url>', 'URL of the YouTube video')
  .option(
    '-o, --out <projectName>',
    'Name of the output project folder (defaults to sanitized video title)'
  )
  .option(
    '-c, --concurrency <number>',
    'Number of parallel extraction workers (default: dynamic auto-tuning)'
  )
  .option(
    '-t, --threads <number>',
    'FFmpeg threads per worker instance (default: 1)'
  )
  .option(
    '-s, --scene-threshold <number>',
    'FFmpeg scene detection sensitivity 0-1, lower = more scenes (default: 0.15)'
  )
  .action(async (urlArg: string | undefined, options: CliOptions) => {
    const url = urlArg || options.url;
    if (!url) {
      program.help();
      return;
    }

    const {
      out: outOpt,
      concurrency: concurrencyOpt,
      threads: threadsOpt,
      sceneThreshold: sceneThresholdOpt,
    } = options;

    try {
      await execa('yt-dlp', ['--version']);
    } catch {
      console.error(
        chalk.red('Error: yt-dlp is not installed or not in PATH.')
      );
      process.exit(1);
    }

    try {
      await execa('ffmpeg', ['-version']);
    } catch {
      console.error(
        chalk.red('Error: ffmpeg is not installed or not in PATH.')
      );
      process.exit(1);
    }

    let projectName = outOpt;
    if (!projectName) {
      const titleSpinner = ora('Fetching video title...').start();
      try {
        const rawTitle = await fetchVideoTitle(url);
        const sanitized = sanitizeTitle(rawTitle);
        projectName = sanitized;
        let counter = 2;
        while (fs.existsSync(projectName)) {
          projectName = `${sanitized}-${counter++}`;
        }
        titleSpinner.succeed(`Output folder: ${projectName}`);
      } catch {
        titleSpinner.warn(
          'Could not fetch video title; defaulting to "output"'
        );
        projectName = 'output';
      }
    }

    const concurrencyParsed = concurrencyOpt
      ? parseInt(concurrencyOpt, 10)
      : undefined;
    const profile = await resolveResourceProfile(concurrencyParsed);
    const threadsPerWorker = threadsOpt
      ? parseInt(threadsOpt, 10)
      : profile.threadsPerWorker;
    const sceneThresholdParsed = sceneThresholdOpt
      ? parseFloat(sceneThresholdOpt)
      : 0.15;

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

    const startTime = Date.now();
    const spinner = ora('Downloading video and captions...').start();
    try {
      const { videoFile, vttFile } = await downloadVideoAndCaptions(url, {
        signal: abortController.signal,
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
        sceneThreshold: sceneThresholdParsed,
        onProgress: (completed, total) => {
          const percent = Math.floor((completed / total) * 100);
          spinner.text = `Extracting frames: ${completed}/${total} (${percent}%) [${profile.recommendedConcurrency} workers, ${threadsPerWorker} th/w]`;
        },
      });
      spinner.succeed(
        `Extracted frames successfully (${paragraphs.length} paragraphs).`
      );

      spinner.start('Generating HTML...');
      const filename = path.parse(videoFile).name;
      const title = filename.replace(/\s\[[a-zA-Z0-9_-]+\]$/, '');
      await generateHtml(url, paragraphs, title);
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      spinner.succeed(
        `Done in ${elapsedSec}s! View your webpage at ${path.join(process.cwd(), 'index.html')}`
      );
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

interface ServeCliOptions {
  port: string;
  outputDir: string;
  maxJobs?: string;
  open: boolean;
}

program
  .command('serve')
  .description('Start local HTTP server for the Tampermonkey userscript bridge')
  .option('-p, --port <number>', 'Port to listen on', '8384')
  .option(
    '-d, --output-dir <path>',
    'Base directory for processed videos',
    path.join(os.homedir(), 'youtube-txt')
  )
  .option(
    '-j, --max-jobs <number>',
    'Max concurrent video processing jobs (default: auto-tuned from hardware)'
  )
  .option(
    '--no-open',
    'Do not automatically open result in browser upon completion'
  )
  .action(async (options: ServeCliOptions) => {
    const port = parseInt(options.port, 10);

    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(chalk.red('Error: Invalid port number.'));
      process.exit(1);
    }

    const maxJobs = options.maxJobs ? parseInt(options.maxJobs, 10) : undefined;
    if (maxJobs !== undefined && (isNaN(maxJobs) || maxJobs < 1)) {
      console.error(chalk.red('Error: Invalid max-jobs number.'));
      process.exit(1);
    }

    try {
      await execa('yt-dlp', ['--version']);
    } catch {
      console.error(
        chalk.red('Error: yt-dlp is not installed or not in PATH.')
      );
      process.exit(1);
    }

    try {
      await execa('ffmpeg', ['-version']);
    } catch {
      console.error(
        chalk.red('Error: ffmpeg is not installed or not in PATH.')
      );
      process.exit(1);
    }

    const outputDir = path.resolve(options.outputDir);
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(chalk.blue('youtube.txt server'));
    console.log(chalk.dim(`Output directory: ${outputDir}`));

    const { startServer } = await import('./server/server.js');
    await startServer({
      port,
      outputDir,
      maxJobs,
      autoOpen: options.open,
    });
  });

program.parse(process.argv);
