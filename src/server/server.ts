import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';
import chalk from 'chalk';
import {
  calculateMaxConcurrentJobs,
  resolveResourceProfile,
} from '../resources.js';
import { JobManager } from './jobs.js';
import type { JobEvent } from './jobs.js';
import { logger } from './logger.js';
import { JobQueue } from './queue.js';
import { openInBrowser } from './browser.js';
import { extractVideoId } from './title.js';

export interface ServeOptions {
  port: number;
  outputDir: string;
  maxJobs?: number | undefined;
  autoOpen?: boolean | undefined;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
};

const CORS_ORIGIN = 'https://www.youtube.com';

function setCorsHeaders(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

export async function startServer(options: ServeOptions): Promise<void> {
  const maxConcurrency =
    options.maxJobs && options.maxJobs > 0
      ? options.maxJobs
      : calculateMaxConcurrentJobs();

  const queue = new JobQueue(maxConcurrency);

  const jobManager = new JobManager({
    baseOutputDir: options.outputDir,
    port: options.port,
    autoOpen: options.autoOpen,
    getActiveCount: () => queue.activeCount,
  });

  // Wire up queue events to logger and job SSE emitters
  queue.on('queued', ({ id, position, activeCount, queuedCount }) => {
    const freeRam = Math.floor(os.freemem() / (1024 * 1024));
    const loadAvg = os.loadavg()[0];
    logger.queue(activeCount, queuedCount, freeRam, loadAvg);
  });

  queue.on('started', ({ id, activeCount, queuedCount }) => {
    const freeRam = Math.floor(os.freemem() / (1024 * 1024));
    const loadAvg = os.loadavg()[0];
    logger.queue(activeCount, queuedCount, freeRam, loadAvg);
  });

  queue.on('position', ({ id, position }: { id: string; position: number }) => {
    const job = jobManager.getJob(id);
    if (job) {
      job.emitter.emit('event', {
        phase: 'queued',
        position,
      } satisfies JobEvent);
    }
  });

  const server = http.createServer(async (req, res) => {
    // Validate Host header against DNS rebinding
    const hostHeader = req.headers.host || '';
    const reqHostname = hostHeader.split(':')[0]?.toLowerCase();
    if (
      reqHostname &&
      reqHostname !== '127.0.0.1' &&
      reqHostname !== 'localhost'
    ) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: Invalid Host header' }));
      return;
    }

    // Validate Origin header if present (block cross-origin requests from non-YouTube origins)
    const origin = req.headers.origin;
    if (origin && origin !== CORS_ORIGIN) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({ error: 'Forbidden: Cross-origin access denied' })
      );
      return;
    }

    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const host = req.headers.host || '127.0.0.1';
      const reqUrl = new URL(req.url || '/', `http://${host}`);
      const pathname = reqUrl.pathname;

      if (req.method === 'GET' && pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            activeJobs: queue.activeCount,
            queuedJobs: queue.size,
            maxConcurrency: queue.concurrency,
          })
        );
        return;
      }

      if (req.method === 'POST' && pathname === '/api/process') {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('application/json')) {
          res.writeHead(415, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error:
                'Unsupported Media Type: Content-Type must be application/json',
            })
          );
          return;
        }

        const body = await parseBody(req);
        if (!body.url || typeof body.url !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing or invalid url field' }));
          return;
        }

        const videoId = extractVideoId(body.url);
        if (!videoId) {
          logger.warn(`Rejected non-video URL: ${chalk.yellow(body.url)}`);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: 'Invalid or unsupported YouTube video URL',
            })
          );
          return;
        }

        const force =
          body.force === true || reqUrl.searchParams.get('force') === 'true';
        logger.server(`Received request for: ${chalk.underline(body.url)}`);
        const job = jobManager.createJob(body.url, force);

        if (job.phase === 'completed') {
          logger.server(
            `Cache hit: "${job.title || body.url}" already generated. Reusing output.`
          );
          const viewUrl = `/view/${job.id}/index.html`;
          const fullUrl = `http://127.0.0.1:${options.port}${viewUrl}`;
          if (options.autoOpen !== false) {
            await openInBrowser(fullUrl);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: job.id,
              status: 'completed',
              viewUrl,
              message: 'Already generated. Opened in browser.',
            })
          );
          return;
        }

        const runner = jobManager.createJobRunner(job);

        // Enqueue background processing if it's a freshly created job
        if (job.phase === 'queued') {
          queue.enqueue(job.id, runner).catch((err) => {
            logger.error(job.id, `Execution failed: ${err}`);
          });
        }

        const position = queue.positionOf(job.id);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            id: job.id,
            status: job.phase,
            position,
            message:
              'Processing in background. You may safely close this window.',
          })
        );
        return;
      }

      if (req.method === 'GET' && pathname.startsWith('/api/status/')) {
        const id = pathname.substring('/api/status/'.length);
        const job = jobManager.getJob(id);

        if (!job) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Job not found' }));
          return;
        }

        const position = queue.positionOf(job.id);
        const statusPayload: JobEvent & { id: string } = {
          id: job.id,
          phase: job.phase,
          progress: job.progress,
          position,
          viewUrl:
            job.phase === 'completed'
              ? `/view/${job.id}/index.html`
              : undefined,
          title: job.title || undefined,
        };

        const accept = req.headers.accept || '';
        if (
          accept.includes('application/json') ||
          reqUrl.searchParams.get('format') === 'json'
        ) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(statusPayload));
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.flushHeaders?.();

        res.write(`data: ${JSON.stringify(statusPayload)}\n\n`);

        const onEvent = (event: JobEvent) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
          if (event.phase === 'completed' || event.phase === 'error') {
            res.end();
          }
        };

        job.emitter.on('event', onEvent);

        req.on('close', () => {
          job.emitter.off('event', onEvent);
        });

        return;
      }

      if (req.method === 'GET' && pathname.startsWith('/view/')) {
        // Path format: /view/:id/*
        const parts = pathname.split('/');
        if (parts.length < 4) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }

        const id = parts[2];
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing job ID' }));
          return;
        }
        const job = jobManager.getJob(id);

        if (!job || !job.outputDir) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({ error: 'Job not found or not yet processed' })
          );
          return;
        }

        let relPath: string;
        try {
          relPath = decodeURIComponent(parts.slice(3).join('/'));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Malformed path' }));
          return;
        }

        const resolvedBase = path.resolve(job.outputDir);
        const absolutePath = path.resolve(job.outputDir, relPath);

        // Security check to prevent directory traversal
        if (
          absolutePath !== resolvedBase &&
          !absolutePath.startsWith(resolvedBase + path.sep)
        ) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden' }));
          return;
        }

        serveStaticFile(absolutePath, res);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (err) {
      logger.error(null, `Internal error: ${err}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  });

  const profile = await resolveResourceProfile();

  server.listen(options.port, '127.0.0.1', () => {
    console.log('');
    console.log(
      chalk.bold.blue(
        '  __   __            _         _            _        _   '
      )
    );
    console.log(
      chalk.bold.blue(
        '  \\ \\ / /__  _   _  | |_ _   _| |__   ___  | |___  _| |_ '
      )
    );
    console.log(
      chalk.bold.blue(
        "   \\ V / _ \\| | | | | __| | | | '_ \\ / _ \\ | __\\ \\/ / __|"
      )
    );
    console.log(
      chalk.bold.blue(
        '    | | (_) | |_| | | |_| |_| | |_) |  __/ | |_ >  <| |_ '
      )
    );
    console.log(
      chalk.bold.blue(
        '    |_|\\___/ \\__,_|  \\__|\\__,_|_.__/ \\___|  \\__/_/\\_\\__|'
      )
    );
    console.log('');
    logger.server(
      `Listening at ${chalk.bold.green(`http://127.0.0.1:${options.port}`)}`
    );
    logger.server(`Saving to: ${chalk.underline(options.outputDir)}`);
    logger.server(
      `Hardware: ${profile.cpuCount} CPU cores | ${profile.freeMemoryMb} MB free RAM | Load avg: ${profile.loadAverage.toFixed(2)}`
    );
    logger.server(
      `Capacity: ${chalk.bold.yellow(`${maxConcurrency} concurrent videos`)} | ${chalk.bold.yellow(`${profile.recommendedConcurrency} worker pool`)}`
    );
    logger.server(
      `Auto-open in browser: ${options.autoOpen !== false ? chalk.green('enabled (xdg-open)') : chalk.dim('disabled')}`
    );
    logger.server(`CORS: Accepting requests from ${chalk.dim(CORS_ORIGIN)}`);
    logger.server(
      chalk.dim('Ready. Click the button on YouTube to enqueue videos...')
    );
    console.log('');
  });
}

function parseBody(
  req: http.IncomingMessage
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function serveStaticFile(filePath: string, res: http.ServerResponse) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': stats.size,
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    readStream.on('error', (streamErr) => {
      logger.error(null, `Error reading file ${filePath}: ${streamErr}`);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end();
      }
    });
  });
}
