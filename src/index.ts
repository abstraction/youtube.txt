#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { downloadVideoAndCaptions } from './downloader.js';
import { extractFrames } from './extractor.js';
import { parseVtt } from './parser.js';
import { generateHtml } from './generator.js';

const program = new Command();

program
  .name('youtube.txt')
  .description('Create a webpage from a Youtube video with a transcript paired with screenshots')
  .requiredOption('-u, --url <url>', 'URL of the YouTube video')
  .requiredOption('-o, --out <projectName>', 'Name of the output project folder')
  .action(async (options: { out: string; url: string }) => {
    const { out: projectName, url } = options;
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

    console.log(chalk.blue(`Initializing project: ${projectName}...`));
    
    if (!fs.existsSync(projectName)) {
      fs.mkdirSync(projectName, { recursive: true });
    }
    
    // Switch into the directory so all relative paths work seamlessly just like the Perl script
    process.chdir(projectName);

    if (!fs.existsSync('images')) {
      fs.mkdirSync('images');
    }

    const spinner = ora('Downloading video and captions...').start();
    try {
      const { videoFile, vttFile } = await downloadVideoAndCaptions(url);
      spinner.succeed(`Downloaded video and captions: ${videoFile}`);

      spinner.start('Parsing captions...');
      const cues = await parseVtt(vttFile);
      spinner.succeed(`Parsed ${cues.length} caption cues.`);

      spinner.start('Extracting frames (this may take a while)...');
      await extractFrames(videoFile, cues);
      spinner.succeed('Extracted frames successfully.');

      spinner.start('Generating HTML...');
      await generateHtml(url, cues);
      spinner.succeed(`Done! View your webpage at ${path.join(process.cwd(), 'index.html')}`);
    } catch (err: unknown) {
      spinner.fail('An error occurred during processing.');
      if (err instanceof Error) {
        console.error(chalk.red(err.message));
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
