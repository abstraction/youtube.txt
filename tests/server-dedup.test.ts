import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { extractVideoId } from '../src/server/title.js';
import { JobManager } from '../src/server/jobs.js';

describe('extractVideoId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=3vyPSMSnMT4')).toBe(
      '3vyPSMSnMT4'
    );
    expect(
      extractVideoId('https://www.youtube.com/watch?v=3vyPSMSnMT4&t=120')
    ).toBe('3vyPSMSnMT4');
  });

  it('extracts ID from youtu.be short URL', () => {
    expect(extractVideoId('https://youtu.be/3vyPSMSnMT4')).toBe('3vyPSMSnMT4');
    expect(extractVideoId('https://youtu.be/3vyPSMSnMT4?t=45')).toBe(
      '3vyPSMSnMT4'
    );
  });

  it('extracts ID from shorts and embed URLs', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/3vyPSMSnMT4')).toBe(
      '3vyPSMSnMT4'
    );
    expect(extractVideoId('https://www.youtube.com/embed/3vyPSMSnMT4')).toBe(
      '3vyPSMSnMT4'
    );
  });

  it('returns null for non-YouTube or invalid URLs', () => {
    expect(extractVideoId('https://vimeo.com/123456')).toBeNull();
    expect(extractVideoId('invalid-url')).toBeNull();
  });
});

describe('JobManager Deduplication and Cache', () => {
  let tmpDir: string;
  let jobManager: JobManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'youtube-txt-test-'));
    jobManager = new JobManager({
      baseOutputDir: tmpDir,
      port: 8384,
      autoOpen: false,
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns the active job when requesting the same URL currently in progress', () => {
    const job1 = jobManager.createJob(
      'https://www.youtube.com/watch?v=test1234'
    );
    expect(job1.phase).toBe('queued');

    const job2 = jobManager.createJob(
      'https://www.youtube.com/watch?v=test1234'
    );
    expect(job2.id).toBe(job1.id);
  });

  it('detects already completed output on disk and returns completed job without re-enqueuing', () => {
    const videoUrl = 'https://www.youtube.com/watch?v=3vyPSMSnMT4';
    const folderName = 'How to become smart';
    const completedDir = path.join(tmpDir, folderName);
    fs.mkdirSync(completedDir, { recursive: true });
    // Write index.html containing the video URL
    fs.writeFileSync(
      path.join(completedDir, 'index.html'),
      `<html><head><title>Test</title></head><body><a href="${videoUrl}">Test</a></body></html>`
    );

    const job = jobManager.createJob(videoUrl);
    expect(job.phase).toBe('completed');
    expect(job.progress).toBe(100);
    expect(job.outputDir).toBe(completedDir);
  });

  it('bypasses disk cache when force is true', () => {
    const videoUrl = 'https://www.youtube.com/watch?v=3vyPSMSnMT4';
    const folderName = 'How to become smart';
    const completedDir = path.join(tmpDir, folderName);
    fs.mkdirSync(completedDir, { recursive: true });
    fs.writeFileSync(
      path.join(completedDir, 'index.html'),
      `<html><body><a href="${videoUrl}">Test</a></body></html>`
    );

    const job = jobManager.createJob(videoUrl, true);
    expect(job.phase).toBe('queued');
  });

  it('detects completed folder by videoId in filenames even if URL is not in index.html', () => {
    const videoUrl = 'https://www.youtube.com/watch?v=O6odycjRA04';
    const folderName = 'Viral Pills';
    const completedDir = path.join(tmpDir, folderName);
    fs.mkdirSync(completedDir, { recursive: true });
    fs.writeFileSync(
      path.join(completedDir, 'index.html'),
      '<html><body>Generated</body></html>'
    );
    fs.writeFileSync(
      path.join(completedDir, 'Viral Pills [O6odycjRA04].webm'),
      'dummy video'
    );

    const job = jobManager.createJob(videoUrl);
    expect(job.phase).toBe('completed');
    expect(job.outputDir).toBe(completedDir);
  });
});
