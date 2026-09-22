import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { startServer } from '../src/server/server.js';
import { JobManager } from '../src/server/jobs.js';

describe('Server Security & Origin Validation', () => {
  let tmpDir: string;
  let testPort: number;
  let serverInstance: http.Server | null = null;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-txt-sec-test-'));
    testPort = 18385; // dedicated test port

    // Start server in background
    await startServer({
      port: testPort,
      outputDir: tmpDir,
      maxJobs: 1,
      autoOpen: false,
    });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeRequest(
    method: string,
    pathName: string,
    headers: Record<string, string> = {},
    body?: string
  ): Promise<{
    statusCode: number;
    headers: http.IncomingHttpHeaders;
    body: string;
  }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: testPort,
          path: pathName,
          method,
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk.toString();
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode || 0,
              headers: res.headers,
              body: data,
            });
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  it('rejects requests with malicious Host headers (DNS rebinding protection)', async () => {
    const res = await makeRequest('GET', '/api/health', {
      Host: 'evil-attacker.com',
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('Invalid Host header');
  });

  it('rejects cross-origin requests from non-YouTube origins with 403', async () => {
    const res = await makeRequest(
      'POST',
      '/api/process',
      {
        Origin: 'https://malicious-site.com',
        'Content-Type': 'application/json',
      },
      JSON.stringify({ url: 'https://www.youtube.com/watch?v=3vyPSMSnMT4' })
    );
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('Cross-origin access denied');
  });

  it('rejects POST /api/process when Content-Type is not application/json', async () => {
    const res = await makeRequest(
      'POST',
      '/api/process',
      {
        Origin: 'https://www.youtube.com',
        'Content-Type': 'text/plain',
      },
      JSON.stringify({ url: 'https://www.youtube.com/watch?v=3vyPSMSnMT4' })
    );
    expect(res.statusCode).toBe(415);
    expect(res.body).toContain('Content-Type must be application/json');
  });

  it('rejects sibling directory traversal in /view/ route with 403', async () => {
    // Create base project dir and a sibling directory
    const projectDir = path.join(tmpDir, 'test-project');
    const siblingDir = path.join(tmpDir, 'test-project-sibling');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(siblingDir, { recursive: true });
    fs.writeFileSync(path.join(siblingDir, 'secret.txt'), 'confidential');
    // In projectDir, create index.html with meta tag for instant cache detection
    fs.writeFileSync(
      path.join(projectDir, 'index.html'),
      '<!DOCTYPE html><html><head><meta name="youtube-txt-url" content="https://www.youtube.com/watch?v=3vyPSMSnMT4"></head><body>ok</body></html>'
    );

    // Register completed job via server process endpoint
    const postRes = await makeRequest(
      'POST',
      '/api/process',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ url: 'https://www.youtube.com/watch?v=3vyPSMSnMT4' })
    );
    const postData = JSON.parse(postRes.body);
    const jobId = postData.id;

    // Attempt traversal to sibling directory sharing prefix
    const res = await makeRequest(
      'GET',
      `/view/${jobId}/..%2ftest-project-sibling/secret.txt`,
      {
        Host: `127.0.0.1:${testPort}`,
      }
    );
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('Forbidden');
  });
});
