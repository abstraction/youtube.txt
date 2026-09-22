import {
  a as I,
  b as U,
  c as q,
  d as j,
  e as B,
  f as z,
  g as L,
  h as A,
  i as G,
  j as W,
} from './chunk-QNXZU6BX.js';
import ee from 'http';
import X from 'fs';
import R from 'os';
import N from 'path';
import { URL as te } from 'url';
import h from 'chalk';
import { randomUUID as Q } from 'crypto';
import { EventEmitter as Y } from 'events';
import f from 'fs';
import x from 'path';
import { execa as T } from 'execa';
async function H(o) {
  let e = process.platform;
  try {
    return e === 'darwin'
      ? (await T('open', [o]), !0)
      : e === 'win32'
        ? (await T('cmd.exe', ['/c', 'start', '""', o]), !0)
        : (await T('xdg-open', [o]), !0);
  } catch {
    return !1;
  }
}
function V(o) {
  return o
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 250);
}
async function E(o, e) {
  let r = process.platform;
  try {
    if (r === 'linux') await T('notify-send', ['-a', 'youtube.txt', o, e]);
    else if (r === 'darwin') {
      let n = V(o),
        a = V(e);
      await T('osascript', [
        '-e',
        `display notification "${a}" with title "${n}"`,
      ]);
    }
  } catch {}
}
import g from 'chalk';
function _() {
  let o = new Date(),
    e = String(o.getHours()).padStart(2, '0'),
    r = String(o.getMinutes()).padStart(2, '0'),
    n = String(o.getSeconds()).padStart(2, '0');
  return g.dim(`${e}:${r}:${n}`);
}
var k = class {
    lastReportedProgress = new Map();
    server(e) {
      console.log(`${_()} ${g.cyan('[Server]')} ${e}`);
    }
    queue(e, r, n, a) {
      let c = [`${g.bold(String(e))} active`, `${g.bold(String(r))} queued`];
      (n !== void 0 &&
        c.push(`RAM: ${Math.floor((n / 1024) * 10) / 10}GB free`),
        a !== void 0 && c.push(`Load: ${a.toFixed(2)}`),
        console.log(`${_()} ${g.yellow('[Queue]')} ${c.join(g.dim(' | '))}`));
    }
    job(e, r, n) {
      let a = g.magenta(`[Job ${e}]`);
      console.log(`${_()} ${a} ${n}`);
    }
    progress(e, r, n, a = '') {
      let c = Math.floor((r / n) * 100),
        i = this.lastReportedProgress.get(e) ?? -1;
      if (i === -1 || c === 100 || c - i >= 20) {
        this.lastReportedProgress.set(e, c);
        let t = g.magenta(`[Job ${e}]`),
          p = g.blue(`\u26A1 Extracting frames: ${c}% (${r}/${n})`),
          u = a ? g.dim(` [${a}]`) : '';
        console.log(`${_()} ${t} ${p}${u}`);
      }
      c === 100 && this.lastReportedProgress.delete(e);
    }
    success(e, r) {
      let n = g.green(`[Job ${e}]`);
      console.log(`${_()} ${n} ${g.green('\u2713')} ${r}`);
    }
    error(e, r) {
      let n = e ? g.red(`[Job ${e}]`) : g.red('[Error]');
      console.error(`${_()} ${n} ${g.red('\u2717')} ${r}`);
    }
    warn(e) {
      console.warn(`${_()} ${g.yellow('[Warn]')} ${g.yellow('!')} ${e}`);
    }
  },
  s = new k();
var P = class {
  jobs = new Map();
  baseOutputDir;
  port;
  autoOpen;
  getActiveCount;
  constructor(e) {
    ((this.baseOutputDir = e.baseOutputDir),
      (this.port = e.port),
      (this.autoOpen = e.autoOpen !== !1),
      (this.getActiveCount = e.getActiveCount ?? (() => 1)));
  }
  findActiveJobByUrl(e) {
    for (let r of this.jobs.values())
      if (r.url === e && r.phase !== 'completed' && r.phase !== 'error')
        return r;
  }
  findCompletedJobByUrl(e) {
    for (let n of this.jobs.values())
      if (
        n.url === e &&
        n.phase === 'completed' &&
        n.outputDir &&
        f.existsSync(x.join(n.outputDir, 'index.html'))
      )
        return n;
    if (!f.existsSync(this.baseOutputDir)) return;
    let r = j(e);
    try {
      let n = f.readdirSync(this.baseOutputDir, { withFileTypes: !0 });
      for (let a of n) {
        if (!a.isDirectory()) continue;
        let c = x.join(this.baseOutputDir, a.name),
          i = x.join(c, 'index.html');
        if (!f.existsSync(i)) continue;
        let t = !1;
        if (r)
          try {
            f.readdirSync(c).some((u) => u.includes(`[${r}]`)) && (t = !0);
          } catch {}
        if (!t)
          try {
            let p = Buffer.alloc(65536),
              u = f.openSync(i, 'r'),
              w = f.readSync(u, p, 0, 65536, 0);
            f.closeSync(u);
            let b = p.toString('utf-8', 0, w);
            (b.includes(e) ||
              (r && (b.includes(r) || b.includes(`content="${r}"`)))) &&
              (t = !0);
          } catch {}
        if (t) {
          let p = Q().slice(0, 8),
            u = {
              id: p,
              url: e,
              title: a.name,
              outputDir: c,
              phase: 'completed',
              progress: 100,
              emitter: new Y(),
              abortController: new AbortController(),
              createdAt: Date.now(),
            };
          return (this.jobs.set(p, u), u);
        }
      }
    } catch {}
  }
  createJob(e, r = !1) {
    if (!r) {
      let c = this.findActiveJobByUrl(e);
      if (c)
        return (
          s.job(
            c.id,
            'info',
            'Duplicate request for active video. Re-attaching to existing job.'
          ),
          c
        );
      let i = this.findCompletedJobByUrl(e);
      if (i)
        return (
          s.job(
            i.id,
            'info',
            `Found existing completed video for "${i.title || e}". Reusing generated output.`
          ),
          i
        );
    }
    let n = Q().slice(0, 8),
      a = {
        id: n,
        url: e,
        title: null,
        outputDir: null,
        phase: 'queued',
        progress: 0,
        emitter: new Y(),
        abortController: new AbortController(),
        createdAt: Date.now(),
      };
    if ((this.jobs.set(n, a), this.jobs.size > 100)) {
      for (let [c, i] of this.jobs.entries())
        if (i.phase === 'completed' || i.phase === 'error') {
          this.jobs.delete(c);
          break;
        }
    }
    return a;
  }
  getJob(e) {
    return this.jobs.get(e);
  }
  createJobRunner(e) {
    return async () => {
      let r = Date.now();
      try {
        let n = (m) => {
          ((e.phase = m.phase),
            m.progress !== void 0 && (e.progress = m.progress),
            e.emitter.emit('event', m));
        };
        (n({ phase: 'downloading', progress: 0 }),
          s.job(e.id, 'downloading', 'Resolving video metadata...'));
        let a = await B(e.url),
          c = z(a);
        e.title = a;
        let i = c,
          t = x.join(this.baseOutputDir, i),
          p = 2;
        for (; f.existsSync(t);) {
          let m = x.join(t, 'index.html');
          if (!f.existsSync(m)) {
            s.job(e.id, 'info', `Reusing incomplete directory: ${t}`);
            break;
          }
          ((i = `${c}-${p++}`), (t = x.join(this.baseOutputDir, i)));
        }
        (f.mkdirSync(t, { recursive: !0 }),
          f.mkdirSync(x.join(t, 'images'), { recursive: !0 }),
          (e.outputDir = t),
          s.job(e.id, 'started', `"${a}" -> ${t}`),
          n({ phase: 'downloading', progress: 5, title: a }),
          s.job(
            e.id,
            'downloading',
            '\u{1F4E5} Downloading video and VTT captions...'
          ));
        let { videoFile: u, vttFile: w } = await I(e.url, {
          signal: e.abortController.signal,
          outputDir: t,
        });
        (n({ phase: 'downloading', progress: 100 }),
          s.job(e.id, 'downloading', '\u{1F4E5} Download complete.'),
          n({ phase: 'parsing' }),
          s.job(e.id, 'parsing', '\u{1F4DD} Parsing captions with NLP...'));
        let b = await q(w);
        s.job(e.id, 'parsing', `\u{1F4DD} Parsed ${b.length} paragraphs.`);
        let O = Math.max(1, this.getActiveCount()),
          $ = W();
        $.healthy ||
          s.warn(
            `System under pressure: ${$.throttleReason}. Throttling workers.`
          );
        let v = await A(void 0, O),
          d = $.healthy
            ? v.recommendedConcurrency
            : Math.max(1, Math.floor(v.recommendedConcurrency / 2));
        (s.job(
          e.id,
          'extracting',
          `\u26A1 Extracting frames: ${b.length} paragraphs [Allocated ${d} workers | Free RAM: ${v.freeMemoryMb}MB]`
        ),
          n({ phase: 'extracting', progress: 0 }),
          await U(u, b, {
            concurrency: d,
            threadsPerWorker: v.threadsPerWorker,
            signal: e.abortController.signal,
            outputDir: t,
            onProgress: (m, D) => {
              let Z = Math.floor((m / D) * 100);
              (n({ phase: 'extracting', progress: Z }),
                s.progress(e.id, m, D, `${d} workers`));
            },
          }),
          n({ phase: 'generating' }),
          s.job(
            e.id,
            'generating',
            '\u{1F527} Generating responsive HTML webpage...'
          ));
        let C = x.parse(u).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/, '');
        await L(e.url, b, C, t);
        let l = ((Date.now() - r) / 1e3).toFixed(1),
          y = `/view/${e.id}/index.html`,
          J = `http://127.0.0.1:${this.port}${y}`;
        (s.success(e.id, `Completed in ${l}s! Saved to: ${t}`),
          s.server(`\u{1F310} Webpage available at: ${J}`),
          this.autoOpen &&
            ((await H(J))
              ? s.server(`\u{1F680} Auto-opened in default browser: ${J}`)
              : s.server(
                  `\u2139\uFE0F Auto-open not available (no GUI); open manually: ${J}`
                )),
          E('youtube.txt Complete', `Finished: ${C}`),
          n({ phase: 'completed', viewUrl: y }));
      } catch (n) {
        let a = n instanceof Error ? n.message : String(n);
        if (
          ((e.phase = 'error'),
          s.error(e.id, `Failed: ${a}`),
          E('youtube.txt Failed', `Failed: ${e.title || e.url}`),
          e.emitter.emit('event', { phase: 'error', message: a }),
          e.outputDir && f.existsSync(e.outputDir))
        ) {
          let c = x.join(e.outputDir, 'index.html');
          if (!f.existsSync(c))
            try {
              (f.rmSync(e.outputDir, { recursive: !0, force: !0 }),
                s.job(
                  e.id,
                  'cleanup',
                  `Cleaned up incomplete directory: ${e.outputDir}`
                ));
            } catch {}
        }
      }
    };
  }
};
import { EventEmitter as K } from 'events';
var M = class extends K {
  queue = [];
  activeJobs = new Map();
  maxConcurrency;
  constructor(e = 2) {
    (super(), (this.maxConcurrency = Math.max(1, e)));
  }
  get size() {
    return this.queue.length;
  }
  get activeCount() {
    return this.activeJobs.size;
  }
  get concurrency() {
    return this.maxConcurrency;
  }
  setConcurrency(e) {
    ((this.maxConcurrency = Math.max(1, e)), this.drain());
  }
  isActive(e) {
    return this.activeJobs.has(e);
  }
  enqueue(e, r) {
    return new Promise((n, a) => {
      (this.queue.push({ id: e, run: r, resolve: n, reject: a }),
        this.emit('queued', {
          id: e,
          position: this.queue.length,
          activeCount: this.activeJobs.size,
          queuedCount: this.queue.length,
        }),
        this.drain());
    });
  }
  positionOf(e) {
    if (this.activeJobs.has(e)) return 0;
    let r = this.queue.findIndex((n) => n.id === e);
    return r === -1 ? -1 : r + 1;
  }
  drain() {
    for (
      ;
      this.activeJobs.size < this.maxConcurrency && this.queue.length > 0;
    ) {
      let e = this.queue.shift();
      if (!e) break;
      (this.activeJobs.set(e.id, e),
        this.emit('started', {
          id: e.id,
          activeCount: this.activeJobs.size,
          queuedCount: this.queue.length,
        }));
      for (let r = 0; r < this.queue.length; r++)
        this.emit('position', { id: this.queue[r].id, position: r + 1 });
      (async () => {
        try {
          (await e.run(), e.resolve(), this.emit('completed', { id: e.id }));
        } catch (r) {
          (e.reject(r), this.emit('failed', { id: e.id, error: r }));
        } finally {
          (this.activeJobs.delete(e.id), this.drain());
        }
      })();
    }
  }
};
var re = {
    '.html': 'text/html',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.svg': 'image/svg+xml',
  },
  F = 'https://www.youtube.com';
function ne(o) {
  (o.setHeader('Access-Control-Allow-Origin', F),
    o.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
    o.setHeader('Access-Control-Allow-Headers', 'Content-Type'),
    o.setHeader('Access-Control-Allow-Private-Network', 'true'));
}
async function Ee(o) {
  let e = o.maxJobs && o.maxJobs > 0 ? o.maxJobs : G(),
    r = new M(e),
    n = new P({
      baseOutputDir: o.outputDir,
      port: o.port,
      autoOpen: o.autoOpen,
      getActiveCount: () => r.activeCount,
    });
  (r.on('queued', ({ id: i, position: t, activeCount: p, queuedCount: u }) => {
    let w = Math.floor(R.freemem() / 1048576),
      b = R.loadavg()[0];
    s.queue(p, u, w, b);
  }),
    r.on('started', ({ id: i, activeCount: t, queuedCount: p }) => {
      let u = Math.floor(R.freemem() / 1048576),
        w = R.loadavg()[0];
      s.queue(t, p, u, w);
    }),
    r.on('position', ({ id: i, position: t }) => {
      let p = n.getJob(i);
      p && p.emitter.emit('event', { phase: 'queued', position: t });
    }));
  let a = ee.createServer(async (i, t) => {
      let u = (i.headers.host || '').split(':')[0]?.toLowerCase();
      if (u && u !== '127.0.0.1' && u !== 'localhost') {
        (t.writeHead(403, { 'Content-Type': 'application/json' }),
          t.end(JSON.stringify({ error: 'Forbidden: Invalid Host header' })));
        return;
      }
      let w = i.headers.origin;
      if (w && w !== F) {
        (t.writeHead(403, { 'Content-Type': 'application/json' }),
          t.end(
            JSON.stringify({ error: 'Forbidden: Cross-origin access denied' })
          ));
        return;
      }
      if ((ne(t), i.method === 'OPTIONS')) {
        (t.writeHead(204), t.end());
        return;
      }
      try {
        let b = i.headers.host || '127.0.0.1',
          O = new te(i.url || '/', `http://${b}`),
          $ = O.pathname;
        if (i.method === 'GET' && $ === '/api/health') {
          (t.writeHead(200, { 'Content-Type': 'application/json' }),
            t.end(
              JSON.stringify({
                ok: !0,
                activeJobs: r.activeCount,
                queuedJobs: r.size,
                maxConcurrency: r.concurrency,
              })
            ));
          return;
        }
        if (i.method === 'POST' && $ === '/api/process') {
          if (!(i.headers['content-type'] || '').includes('application/json')) {
            (t.writeHead(415, { 'Content-Type': 'application/json' }),
              t.end(
                JSON.stringify({
                  error:
                    'Unsupported Media Type: Content-Type must be application/json',
                })
              ));
            return;
          }
          let d = await oe(i);
          if (!d.url || typeof d.url != 'string') {
            (t.writeHead(400, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Missing or invalid url field' })));
            return;
          }
          if (!j(d.url)) {
            (s.warn(`Rejected non-video URL: ${h.yellow(d.url)}`),
              t.writeHead(400, { 'Content-Type': 'application/json' }),
              t.end(
                JSON.stringify({
                  error: 'Invalid or unsupported YouTube video URL',
                })
              ));
            return;
          }
          let C = d.force === !0 || O.searchParams.get('force') === 'true';
          s.server(`Received request for: ${h.underline(d.url)}`);
          let l = n.createJob(d.url, C);
          if (l.phase === 'completed') {
            s.server(
              `Cache hit: "${l.title || d.url}" already generated. Reusing output.`
            );
            let m = `/view/${l.id}/index.html`,
              D = `http://127.0.0.1:${o.port}${m}`;
            (o.autoOpen !== !1 && (await H(D)),
              t.writeHead(200, { 'Content-Type': 'application/json' }),
              t.end(
                JSON.stringify({
                  id: l.id,
                  status: 'completed',
                  viewUrl: m,
                  message: 'Already generated. Opened in browser.',
                })
              ));
            return;
          }
          let y = n.createJobRunner(l);
          l.phase === 'queued' &&
            r.enqueue(l.id, y).catch((m) => {
              s.error(l.id, `Execution failed: ${m}`);
            });
          let J = r.positionOf(l.id);
          (t.writeHead(200, { 'Content-Type': 'application/json' }),
            t.end(
              JSON.stringify({
                id: l.id,
                status: l.phase,
                position: J,
                message:
                  'Processing in background. You may safely close this window.',
              })
            ));
          return;
        }
        if (i.method === 'GET' && $.startsWith('/api/status/')) {
          let v = $.substring(12),
            d = n.getJob(v);
          if (!d) {
            (t.writeHead(404, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Job not found' })));
            return;
          }
          let S = r.positionOf(d.id),
            C = {
              id: d.id,
              phase: d.phase,
              progress: d.progress,
              position: S,
              viewUrl:
                d.phase === 'completed' ? `/view/${d.id}/index.html` : void 0,
              title: d.title || void 0,
            };
          if (
            (i.headers.accept || '').includes('application/json') ||
            O.searchParams.get('format') === 'json'
          ) {
            (t.writeHead(200, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify(C)));
            return;
          }
          (t.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          }),
            t.flushHeaders?.(),
            t.write(`data: ${JSON.stringify(C)}

`));
          let y = (J) => {
            (t.write(`data: ${JSON.stringify(J)}

`),
              (J.phase === 'completed' || J.phase === 'error') && t.end());
          };
          (d.emitter.on('event', y),
            i.on('close', () => {
              d.emitter.off('event', y);
            }));
          return;
        }
        if (i.method === 'GET' && $.startsWith('/view/')) {
          let v = $.split('/');
          if (v.length < 4) {
            (t.writeHead(400, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Invalid path' })));
            return;
          }
          let d = v[2];
          if (!d) {
            (t.writeHead(400, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Missing job ID' })));
            return;
          }
          let S = n.getJob(d);
          if (!S || !S.outputDir) {
            (t.writeHead(404, { 'Content-Type': 'application/json' }),
              t.end(
                JSON.stringify({ error: 'Job not found or not yet processed' })
              ));
            return;
          }
          let C;
          try {
            C = decodeURIComponent(v.slice(3).join('/'));
          } catch {
            (t.writeHead(400, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Malformed path' })));
            return;
          }
          let l = N.resolve(S.outputDir),
            y = N.resolve(S.outputDir, C);
          if (y !== l && !y.startsWith(l + N.sep)) {
            (t.writeHead(403, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Forbidden' })));
            return;
          }
          ie(y, t);
          return;
        }
        (t.writeHead(404, { 'Content-Type': 'application/json' }),
          t.end(JSON.stringify({ error: 'Not Found' })));
      } catch (b) {
        (s.error(null, `Internal error: ${b}`),
          t.headersSent ||
            (t.writeHead(500, { 'Content-Type': 'application/json' }),
            t.end(JSON.stringify({ error: 'Internal Server Error' }))));
      }
    }),
    c = await A();
  a.listen(o.port, '127.0.0.1', () => {
    (console.log(''),
      console.log(
        h.bold.blue('  __   __            _         _            _        _   ')
      ),
      console.log(
        h.bold.blue(
          '  \\ \\ / /__  _   _  | |_ _   _| |__   ___  | |___  _| |_ '
        )
      ),
      console.log(
        h.bold.blue(
          "   \\ V / _ \\| | | | | __| | | | '_ \\ / _ \\ | __\\ \\/ / __|"
        )
      ),
      console.log(
        h.bold.blue('    | | (_) | |_| | | |_| |_| | |_) |  __/ | |_ >  <| |_ ')
      ),
      console.log(
        h.bold.blue(
          '    |_|\\___/ \\__,_|  \\__|\\__,_|_.__/ \\___|  \\__/_/\\_\\__|'
        )
      ),
      console.log(''),
      s.server(`Listening at ${h.bold.green(`http://127.0.0.1:${o.port}`)}`),
      s.server(`Saving to: ${h.underline(o.outputDir)}`),
      s.server(
        `Hardware: ${c.cpuCount} CPU cores | ${c.freeMemoryMb} MB free RAM | Load avg: ${c.loadAverage.toFixed(2)}`
      ),
      s.server(
        `Capacity: ${h.bold.yellow(`${e} concurrent videos`)} | ${h.bold.yellow(`${c.recommendedConcurrency} worker pool`)}`
      ),
      s.server(
        `Auto-open in browser: ${o.autoOpen !== !1 ? h.green('enabled (xdg-open)') : h.dim('disabled')}`
      ),
      s.server(`CORS: Accepting requests from ${h.dim(F)}`),
      s.server(
        h.dim('Ready. Click the button on YouTube to enqueue videos...')
      ),
      console.log(''));
  });
}
function oe(o) {
  return new Promise((e, r) => {
    let n = '';
    (o.on('data', (a) => {
      n += a.toString();
    }),
      o.on('end', () => {
        try {
          e(n ? JSON.parse(n) : {});
        } catch (a) {
          r(a);
        }
      }),
      o.on('error', r));
  });
}
function ie(o, e) {
  X.stat(o, (r, n) => {
    if (r || !n.isFile()) {
      (e.writeHead(404, { 'Content-Type': 'application/json' }),
        e.end(JSON.stringify({ error: 'File not found' })));
      return;
    }
    let a = N.extname(o).toLowerCase(),
      c = re[a] || 'application/octet-stream';
    e.writeHead(200, { 'Content-Type': c, 'Content-Length': n.size });
    let i = X.createReadStream(o);
    (i.pipe(e),
      i.on('error', (t) => {
        (s.error(null, `Error reading file ${o}: ${t}`),
          e.headersSent || (e.writeHead(500), e.end()));
      }));
  });
}
export { Ee as startServer };
