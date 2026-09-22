import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { downloadVideoAndCaptions } from '../downloader.js';
import { extractFrames } from '../extractor.js';
import { generateHtml } from '../generator.js';
import { parseVtt } from '../parser.js';
import { checkSystemHealth, resolveResourceProfile } from '../resources.js';
import { openInBrowser, sendDesktopNotification } from './browser.js';
import { logger } from './logger.js';
import { extractVideoId, fetchVideoTitle, sanitizeTitle } from './title.js';

export type JobPhase =
  | 'queued'
  | 'downloading'
  | 'parsing'
  | 'extracting'
  | 'generating'
  | 'completed'
  | 'error';

export interface JobEvent {
  phase: JobPhase;
  progress?: number | undefined; // 0-100 for downloading/extracting
  position?: number | undefined; // queue position (for 'queued' phase)
  viewUrl?: string | undefined; // set on 'completed'
  message?: string | undefined; // set on 'error'
  title?: string | undefined; // video title, set once known
}

export interface Job {
  id: string;
  url: string;
  title: string | null;
  outputDir: string | null;
  phase: JobPhase;
  progress: number;
  emitter: EventEmitter;
  abortController: AbortController;
  createdAt: number;
}

export interface JobManagerOptions {
  baseOutputDir: string;
  port: number;
  autoOpen?: boolean | undefined;
  getActiveCount?: (() => number) | undefined;
}

export class JobManager {
  private jobs = new Map<string, Job>();
  private baseOutputDir: string;
  private port: number;
  private autoOpen: boolean;
  private getActiveCount: () => number;

  constructor(options: JobManagerOptions) {
    this.baseOutputDir = options.baseOutputDir;
    this.port = options.port;
    this.autoOpen = options.autoOpen !== false;
    this.getActiveCount = options.getActiveCount ?? (() => 1);
  }

  findActiveJobByUrl(url: string): Job | undefined {
    for (const job of this.jobs.values()) {
      if (
        job.url === url &&
        job.phase !== 'completed' &&
        job.phase !== 'error'
      ) {
        return job;
      }
    }
    return undefined;
  }

  findCompletedJobByUrl(url: string): Job | undefined {
    // 1. Check in-memory completed jobs
    for (const job of this.jobs.values()) {
      if (
        job.url === url &&
        job.phase === 'completed' &&
        job.outputDir &&
        fs.existsSync(path.join(job.outputDir, 'index.html'))
      ) {
        return job;
      }
    }

    // 2. Check disk in baseOutputDir
    if (!fs.existsSync(this.baseOutputDir)) return undefined;
    const videoId = extractVideoId(url);

    try {
      const entries = fs.readdirSync(this.baseOutputDir, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const candidateDir = path.join(this.baseOutputDir, entry.name);
        const indexPath = path.join(candidateDir, 'index.html');
        if (!fs.existsSync(indexPath)) continue;

        let matches = false;
        if (videoId) {
          try {
            const files = fs.readdirSync(candidateDir);
            if (files.some((f) => f.includes(`[${videoId}]`))) {
              matches = true;
            }
          } catch {
            // Ignore directory read error
          }
        }

        if (!matches) {
          try {
            const buffer = Buffer.alloc(65536);
            const fd = fs.openSync(indexPath, 'r');
            const bytesRead = fs.readSync(fd, buffer, 0, 65536, 0);
            fs.closeSync(fd);
            const chunk = buffer.toString('utf-8', 0, bytesRead);
            if (
              chunk.includes(url) ||
              (videoId &&
                (chunk.includes(videoId) ||
                  chunk.includes(`content="${videoId}"`)))
            ) {
              matches = true;
            }
          } catch {
            // Ignore file read error
          }
        }

        if (matches) {
          const id = randomUUID().slice(0, 8);
          const job: Job = {
            id,
            url,
            title: entry.name,
            outputDir: candidateDir,
            phase: 'completed',
            progress: 100,
            emitter: new EventEmitter(),
            abortController: new AbortController(),
            createdAt: Date.now(),
          };
          this.jobs.set(id, job);
          return job;
        }
      }
    } catch {
      // Ignore scan error
    }

    return undefined;
  }

  createJob(url: string, force: boolean = false): Job {
    if (!force) {
      const active = this.findActiveJobByUrl(url);
      if (active) {
        logger.job(
          active.id,
          'info',
          `Duplicate request for active video. Re-attaching to existing job.`
        );
        return active;
      }

      const completed = this.findCompletedJobByUrl(url);
      if (completed) {
        logger.job(
          completed.id,
          'info',
          `Found existing completed video for "${completed.title || url}". Reusing generated output.`
        );
        return completed;
      }
    }

    const id = randomUUID().slice(0, 8);
    const job: Job = {
      id,
      url,
      title: null,
      outputDir: null,
      phase: 'queued',
      progress: 0,
      emitter: new EventEmitter(),
      abortController: new AbortController(),
      createdAt: Date.now(),
    };
    this.jobs.set(id, job);

    // Keep memory clean: remove old completed/errored jobs if map grows large (>100 entries)
    if (this.jobs.size > 100) {
      for (const [key, j] of this.jobs.entries()) {
        if (j.phase === 'completed' || j.phase === 'error') {
          this.jobs.delete(key);
          break;
        }
      }
    }

    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /**
   * Returns a function that runs the full isolated pipeline for this job.
   * Completely avoids process.chdir() for concurrent safety.
   */
  createJobRunner(job: Job): () => Promise<void> {
    return async () => {
      const startTime = Date.now();
      try {
        const emit = (event: JobEvent) => {
          job.phase = event.phase;
          if (event.progress !== undefined) job.progress = event.progress;
          job.emitter.emit('event', event);
        };

        // 1. Fetch title for auto-directory naming
        emit({ phase: 'downloading', progress: 0 });
        logger.job(job.id, 'downloading', `Resolving video metadata...`);
        const rawTitle = await fetchVideoTitle(job.url);
        const sanitized = sanitizeTitle(rawTitle);
        job.title = rawTitle;

        // 2. Create unique output directory
        let dirName = sanitized;
        let dirPath = path.join(this.baseOutputDir, dirName);
        let counter = 2;
        while (fs.existsSync(dirPath)) {
          const existingIndex = path.join(dirPath, 'index.html');
          if (!fs.existsSync(existingIndex)) {
            logger.job(
              job.id,
              'info',
              `Reusing incomplete directory: ${dirPath}`
            );
            break;
          }
          dirName = `${sanitized}-${counter++}`;
          dirPath = path.join(this.baseOutputDir, dirName);
        }
        fs.mkdirSync(dirPath, { recursive: true });
        fs.mkdirSync(path.join(dirPath, 'images'), { recursive: true });
        job.outputDir = dirPath;

        logger.job(job.id, 'started', `"${rawTitle}" -> ${dirPath}`);

        emit({ phase: 'downloading', progress: 5, title: rawTitle });

        // 3. Download directly into dirPath (without process.chdir)
        logger.job(
          job.id,
          'downloading',
          `📥 Downloading video and VTT captions...`
        );
        const { videoFile, vttFile } = await downloadVideoAndCaptions(job.url, {
          signal: job.abortController.signal,
          outputDir: dirPath,
        });
        emit({ phase: 'downloading', progress: 100 });
        logger.job(job.id, 'downloading', `📥 Download complete.`);

        // 4. Parse VTT captions
        emit({ phase: 'parsing' });
        logger.job(job.id, 'parsing', `📝 Parsing captions with NLP...`);
        const paragraphs = await parseVtt(vttFile);
        logger.job(
          job.id,
          'parsing',
          `📝 Parsed ${paragraphs.length} paragraphs.`
        );

        // 5. Intelligent resource sensing & adaptive worker allocation
        const activeCount = Math.max(1, this.getActiveCount());
        const health = checkSystemHealth();
        if (!health.healthy) {
          logger.warn(
            `System under pressure: ${health.throttleReason}. Throttling workers.`
          );
        }
        const profile = await resolveResourceProfile(undefined, activeCount);
        const allocatedWorkers = health.healthy
          ? profile.recommendedConcurrency
          : Math.max(1, Math.floor(profile.recommendedConcurrency / 2));

        logger.job(
          job.id,
          'extracting',
          `⚡ Extracting frames: ${paragraphs.length} paragraphs [Allocated ${allocatedWorkers} workers | Free RAM: ${profile.freeMemoryMb}MB]`
        );

        emit({ phase: 'extracting', progress: 0 });
        await extractFrames(videoFile, paragraphs, {
          concurrency: allocatedWorkers,
          threadsPerWorker: profile.threadsPerWorker,
          signal: job.abortController.signal,
          outputDir: dirPath,
          onProgress: (completed, total) => {
            const pct = Math.floor((completed / total) * 100);
            emit({ phase: 'extracting', progress: pct });
            logger.progress(
              job.id,
              completed,
              total,
              `${allocatedWorkers} workers`
            );
          },
        });

        // 6. Generate HTML
        emit({ phase: 'generating' });
        logger.job(
          job.id,
          'generating',
          `🔧 Generating responsive HTML webpage...`
        );
        const filename = path.parse(videoFile).name;
        const displayTitle = filename.replace(/\s\[[a-zA-Z0-9_-]+\]$/, '');
        await generateHtml(job.url, paragraphs, displayTitle, dirPath);

        // 7. Complete & Auto-Open
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        const viewUrl = `/view/${job.id}/index.html`;
        const fullUrl = `http://127.0.0.1:${this.port}${viewUrl}`;

        logger.success(
          job.id,
          `Completed in ${elapsedSec}s! Saved to: ${dirPath}`
        );
        logger.server(`🌐 Webpage available at: ${fullUrl}`);

        if (this.autoOpen) {
          const opened = await openInBrowser(fullUrl);
          if (opened) {
            logger.server(`🚀 Auto-opened in default browser: ${fullUrl}`);
          } else {
            logger.server(
              `ℹ️ Auto-open not available (no GUI); open manually: ${fullUrl}`
            );
          }
        }

        void sendDesktopNotification(
          'youtube.txt Complete',
          `Finished: ${displayTitle}`
        );

        emit({
          phase: 'completed',
          viewUrl,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        job.phase = 'error';
        logger.error(job.id, `Failed: ${message}`);
        void sendDesktopNotification(
          'youtube.txt Failed',
          `Failed: ${job.title || job.url}`
        );
        job.emitter.emit('event', { phase: 'error' as const, message });

        // Clean up abandoned directory if it failed before generating index.html
        if (job.outputDir && fs.existsSync(job.outputDir)) {
          const indexPath = path.join(job.outputDir, 'index.html');
          if (!fs.existsSync(indexPath)) {
            try {
              fs.rmSync(job.outputDir, { recursive: true, force: true });
              logger.job(
                job.id,
                'cleanup',
                `Cleaned up incomplete directory: ${job.outputDir}`
              );
            } catch {
              // Ignore cleanup error
            }
          }
        }
      }
    };
  }
}
