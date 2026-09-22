import {
  a as N,
  b as q,
  c as I,
  d as F,
  e as S,
  f as U,
  g as B,
  h as O,
  i as z,
  j as L,
} from './chunk-KCUOQQ3Q.js';
import X from 'http';
import V from 'fs';
import P from 'os';
import H from 'path';
import { URL as Z } from 'url';
import h from 'chalk';
import { randomUUID as G } from 'crypto';
import { EventEmitter as W } from 'events';
import f from 'fs';
import x from 'path';
import { execa as M } from 'execa';
async function D(n) {
  let e = process.platform;
  try {
    return e === 'darwin'
      ? (await M('open', [n]), !0)
      : e === 'win32'
        ? (await M('cmd.exe', ['/c', 'start', '""', n]), !0)
        : (await M('xdg-open', [n]), !0);
  } catch {
    return !1;
  }
}
import g from 'chalk';
function J() {
  let n = new Date(),
    e = String(n.getHours()).padStart(2, '0'),
    r = String(n.getMinutes()).padStart(2, '0'),
    o = String(n.getSeconds()).padStart(2, '0');
  return g.dim(`${e}:${r}:${o}`);
}
var R = class {
    lastReportedProgress = new Map();
    server(e) {
      console.log(`${J()} ${g.cyan('[Server]')} ${e}`);
    }
    queue(e, r, o, s) {
      let a = [`${g.bold(String(e))} active`, `${g.bold(String(r))} queued`];
      (o !== void 0 &&
        a.push(`RAM: ${Math.floor((o / 1024) * 10) / 10}GB free`),
        s !== void 0 && a.push(`Load: ${s.toFixed(2)}`),
        console.log(`${J()} ${g.yellow('[Queue]')} ${a.join(g.dim(' | '))}`));
    }
    job(e, r, o) {
      let s = g.magenta(`[Job ${e}]`);
      console.log(`${J()} ${s} ${o}`);
    }
    progress(e, r, o, s = '') {
      let a = Math.floor((r / o) * 100),
        c = this.lastReportedProgress.get(e) ?? -1;
      if (c === -1 || a === 100 || a - c >= 20) {
        this.lastReportedProgress.set(e, a);
        let t = g.magenta(`[Job ${e}]`),
          u = g.blue(`\u26A1 Extracting frames: ${a}% (${r}/${o})`),
          p = s ? g.dim(` [${s}]`) : '';
        console.log(`${J()} ${t} ${u}${p}`);
      }
      a === 100 && this.lastReportedProgress.delete(e);
    }
    success(e, r) {
      let o = g.green(`[Job ${e}]`);
      console.log(`${J()} ${o} ${g.green('\u2713')} ${r}`);
    }
    error(e, r) {
      let o = e ? g.red(`[Job ${e}]`) : g.red('[Error]');
      console.error(`${J()} ${o} ${g.red('\u2717')} ${r}`);
    }
    warn(e) {
      console.warn(`${J()} ${g.yellow('[Warn]')} ${g.yellow('!')} ${e}`);
    }
  },
  i = new R();
var T = class {
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
    for (let o of this.jobs.values())
      if (
        o.url === e &&
        o.phase === 'completed' &&
        o.outputDir &&
        f.existsSync(x.join(o.outputDir, 'index.html'))
      )
        return o;
    if (!f.existsSync(this.baseOutputDir)) return;
    let r = O(e);
    try {
      let o = f.readdirSync(this.baseOutputDir, { withFileTypes: !0 });
      for (let s of o) {
        if (!s.isDirectory()) continue;
        let a = x.join(this.baseOutputDir, s.name),
          c = x.join(a, 'index.html');
        if (!f.existsSync(c)) continue;
        let t = !1;
        if (r)
          try {
            f.readdirSync(a).some((p) => p.includes(`[${r}]`)) && (t = !0);
          } catch {}
        if (!t)
          try {
            let u = Buffer.alloc(2048),
              p = f.openSync(c, 'r'),
              b = f.readSync(p, u, 0, 2048, 0);
            f.closeSync(p);
            let d = u.toString('utf-8', 0, b);
            (d.includes(e) || (r && d.includes(r))) && (t = !0);
          } catch {}
        if (t) {
          let u = G().slice(0, 8),
            p = {
              id: u,
              url: e,
              title: s.name,
              outputDir: a,
              phase: 'completed',
              progress: 100,
              emitter: new W(),
              abortController: new AbortController(),
              createdAt: Date.now(),
            };
          return (this.jobs.set(u, p), p);
        }
      }
    } catch {}
  }
  createJob(e, r = !1) {
    if (!r) {
      let a = this.findActiveJobByUrl(e);
      if (a)
        return (
          i.job(
            a.id,
            'info',
            'Duplicate request for active video. Re-attaching to existing job.'
          ),
          a
        );
      let c = this.findCompletedJobByUrl(e);
      if (c)
        return (
          i.job(
            c.id,
            'info',
            `Found existing completed video for "${c.title || e}". Reusing generated output.`
          ),
          c
        );
    }
    let o = G().slice(0, 8),
      s = {
        id: o,
        url: e,
        title: null,
        outputDir: null,
        phase: 'queued',
        progress: 0,
        emitter: new W(),
        abortController: new AbortController(),
        createdAt: Date.now(),
      };
    if ((this.jobs.set(o, s), this.jobs.size > 100)) {
      let a = this.jobs.keys().next().value;
      a && this.jobs.delete(a);
    }
    return s;
  }
  getJob(e) {
    return this.jobs.get(e);
  }
  createJobRunner(e) {
    return async () => {
      let r = Date.now();
      try {
        let o = (w) => {
          ((e.phase = w.phase),
            w.progress !== void 0 && (e.progress = w.progress),
            e.emitter.emit('event', w));
        };
        (o({ phase: 'downloading', progress: 0 }),
          i.job(e.id, 'downloading', 'Resolving video metadata...'));
        let s = await z(e.url),
          a = L(s);
        e.title = s;
        let c = a,
          t = x.join(this.baseOutputDir, c),
          u = 2;
        for (; f.existsSync(t);) {
          let w = x.join(t, 'index.html');
          if (!f.existsSync(w)) {
            i.job(e.id, 'info', `Reusing incomplete directory: ${t}`);
            break;
          }
          ((c = `${a}-${u++}`), (t = x.join(this.baseOutputDir, c)));
        }
        (f.mkdirSync(t, { recursive: !0 }),
          f.mkdirSync(x.join(t, 'images'), { recursive: !0 }),
          (e.outputDir = t),
          i.job(e.id, 'started', `"${s}" -> ${t}`),
          o({ phase: 'downloading', progress: 5, title: s }),
          i.job(
            e.id,
            'downloading',
            '\u{1F4E5} Downloading video and VTT captions...'
          ));
        let { videoFile: p, vttFile: b } = await N(e.url, {
          signal: e.abortController.signal,
          outputDir: t,
        });
        (o({ phase: 'downloading', progress: 100 }),
          i.job(e.id, 'downloading', '\u{1F4E5} Download complete.'),
          o({ phase: 'parsing' }),
          i.job(e.id, 'parsing', '\u{1F4DD} Parsing captions with NLP...'));
        let d = await I(b);
        i.job(e.id, 'parsing', `\u{1F4DD} Parsed ${d.length} paragraphs.`);
        let m = Math.max(1, this.getActiveCount()),
          v = B();
        v.healthy ||
          i.warn(
            `System under pressure: ${v.throttleReason}. Throttling workers.`
          );
        let l = await S(void 0, m),
          $ = v.healthy
            ? l.recommendedConcurrency
            : Math.max(1, Math.floor(l.recommendedConcurrency / 2));
        (i.job(
          e.id,
          'extracting',
          `\u26A1 Extracting frames: ${d.length} paragraphs [Allocated ${$} workers | Free RAM: ${l.freeMemoryMb}MB]`
        ),
          o({ phase: 'extracting', progress: 0 }),
          await q(p, d, {
            concurrency: $,
            threadsPerWorker: l.threadsPerWorker,
            signal: e.abortController.signal,
            outputDir: t,
            onProgress: (w, k) => {
              let Y = Math.floor((w / k) * 100);
              (o({ phase: 'extracting', progress: Y }),
                i.progress(e.id, w, k, `${$} workers`));
            },
          }),
          o({ phase: 'generating' }),
          i.job(
            e.id,
            'generating',
            '\u{1F527} Generating responsive HTML webpage...'
          ));
        let y = x.parse(p).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/, '');
        await F(e.url, d, y, t);
        let j = ((Date.now() - r) / 1e3).toFixed(1),
          E = `/view/${e.id}/index.html`,
          _ = `http://127.0.0.1:${this.port}${E}`;
        (i.success(e.id, `Completed in ${j}s! Saved to: ${t}`),
          i.server(`\u{1F310} Webpage available at: ${_}`),
          this.autoOpen &&
            ((await D(_))
              ? i.server(`\u{1F680} Auto-opened in default browser: ${_}`)
              : i.server(
                  `\u2139\uFE0F Auto-open not available (no GUI); open manually: ${_}`
                )),
          o({ phase: 'completed', viewUrl: E }));
      } catch (o) {
        let s = o instanceof Error ? o.message : String(o);
        if (
          ((e.phase = 'error'),
          i.error(e.id, `Failed: ${s}`),
          e.emitter.emit('event', { phase: 'error', message: s }),
          e.outputDir && f.existsSync(e.outputDir))
        ) {
          let a = x.join(e.outputDir, 'index.html');
          if (!f.existsSync(a))
            try {
              (f.rmSync(e.outputDir, { recursive: !0, force: !0 }),
                i.job(
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
var A = class extends K {
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
    return new Promise((o, s) => {
      (this.queue.push({ id: e, run: r, resolve: o, reject: s }),
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
    let r = this.queue.findIndex((o) => o.id === e);
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
var ee = {
    '.html': 'text/html',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.svg': 'image/svg+xml',
  },
  Q = 'https://www.youtube.com';
function te(n) {
  (n.setHeader('Access-Control-Allow-Origin', Q),
    n.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
    n.setHeader('Access-Control-Allow-Headers', 'Content-Type'),
    n.setHeader('Access-Control-Allow-Private-Network', 'true'));
}
async function He(n) {
  let e = n.maxJobs && n.maxJobs > 0 ? n.maxJobs : U(),
    r = new A(e),
    o = new T({
      baseOutputDir: n.outputDir,
      port: n.port,
      autoOpen: n.autoOpen,
      getActiveCount: () => r.activeCount,
    });
  (r.on('queued', ({ id: c, position: t, activeCount: u, queuedCount: p }) => {
    let b = Math.floor(P.freemem() / 1048576),
      d = P.loadavg()[0];
    i.queue(u, p, b, d);
  }),
    r.on('started', ({ id: c, activeCount: t, queuedCount: u }) => {
      let p = Math.floor(P.freemem() / 1048576),
        b = P.loadavg()[0];
      i.queue(t, u, p, b);
    }),
    r.on('position', ({ id: c, position: t }) => {
      let u = o.getJob(c);
      u && u.emitter.emit('event', { phase: 'queued', position: t });
    }));
  let s = X.createServer(async (c, t) => {
      if ((te(t), c.method === 'OPTIONS')) {
        (t.writeHead(204), t.end());
        return;
      }
      try {
        let u = c.headers.host || '127.0.0.1',
          p = new Z(c.url || '/', `http://${u}`),
          b = p.pathname;
        if (c.method === 'GET' && b === '/api/health') {
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
        if (c.method === 'POST' && b === '/api/process') {
          let d = await re(c);
          if (!d.url || typeof d.url != 'string') {
            (t.writeHead(400, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Missing or invalid url field' })));
            return;
          }
          if (!O(d.url)) {
            (i.warn(`Rejected non-video URL: ${h.yellow(d.url)}`),
              t.writeHead(400, { 'Content-Type': 'application/json' }),
              t.end(
                JSON.stringify({
                  error: 'Invalid or unsupported YouTube video URL',
                })
              ));
            return;
          }
          let v = d.force === !0 || p.searchParams.get('force') === 'true';
          i.server(`Received request for: ${h.underline(d.url)}`);
          let l = o.createJob(d.url, v);
          if (l.phase === 'completed') {
            i.server(
              `Cache hit: "${l.title || d.url}" already generated. Reusing output.`
            );
            let y = `/view/${l.id}/index.html`,
              j = `http://127.0.0.1:${n.port}${y}`;
            (n.autoOpen !== !1 && (await D(j)),
              t.writeHead(200, { 'Content-Type': 'application/json' }),
              t.end(
                JSON.stringify({
                  id: l.id,
                  status: 'completed',
                  viewUrl: y,
                  message: 'Already generated. Opened in browser.',
                })
              ));
            return;
          }
          let $ = o.createJobRunner(l);
          l.phase === 'queued' &&
            r.enqueue(l.id, $).catch((y) => {
              i.error(l.id, `Execution failed: ${y}`);
            });
          let C = r.positionOf(l.id);
          (t.writeHead(200, { 'Content-Type': 'application/json' }),
            t.end(
              JSON.stringify({
                id: l.id,
                status: l.phase,
                position: C,
                message:
                  'Processing in background. You may safely close this window.',
              })
            ));
          return;
        }
        if (c.method === 'GET' && b.startsWith('/api/status/')) {
          let d = b.substring(12),
            m = o.getJob(d);
          if (!m) {
            (t.writeHead(404, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Job not found' })));
            return;
          }
          let v = r.positionOf(m.id),
            l = {
              id: m.id,
              phase: m.phase,
              progress: m.progress,
              position: v,
              viewUrl:
                m.phase === 'completed' ? `/view/${m.id}/index.html` : void 0,
              title: m.title || void 0,
            };
          if (
            (c.headers.accept || '').includes('application/json') ||
            p.searchParams.get('format') === 'json'
          ) {
            (t.writeHead(200, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify(l)));
            return;
          }
          (t.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          }),
            t.flushHeaders?.(),
            t.write(`data: ${JSON.stringify(l)}

`));
          let C = (y) => {
            (t.write(`data: ${JSON.stringify(y)}

`),
              (y.phase === 'completed' || y.phase === 'error') && t.end());
          };
          (m.emitter.on('event', C),
            c.on('close', () => {
              m.emitter.off('event', C);
            }));
          return;
        }
        if (c.method === 'GET' && b.startsWith('/view/')) {
          let d = b.split('/');
          if (d.length < 4) {
            (t.writeHead(400, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Invalid path' })));
            return;
          }
          let m = d[2];
          if (!m) {
            (t.writeHead(400, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Missing job ID' })));
            return;
          }
          let v = o.getJob(m);
          if (!v || !v.outputDir) {
            (t.writeHead(404, { 'Content-Type': 'application/json' }),
              t.end(
                JSON.stringify({ error: 'Job not found or not yet processed' })
              ));
            return;
          }
          let l = d.slice(3).join('/'),
            $ = H.resolve(v.outputDir, l);
          if (!$.startsWith(H.resolve(v.outputDir))) {
            (t.writeHead(403, { 'Content-Type': 'application/json' }),
              t.end(JSON.stringify({ error: 'Forbidden' })));
            return;
          }
          oe($, t);
          return;
        }
        (t.writeHead(404, { 'Content-Type': 'application/json' }),
          t.end(JSON.stringify({ error: 'Not Found' })));
      } catch (u) {
        (i.error(null, `Internal error: ${u}`),
          t.headersSent ||
            (t.writeHead(500, { 'Content-Type': 'application/json' }),
            t.end(JSON.stringify({ error: 'Internal Server Error' }))));
      }
    }),
    a = await S();
  s.listen(n.port, '127.0.0.1', () => {
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
      i.server(`Listening at ${h.bold.green(`http://127.0.0.1:${n.port}`)}`),
      i.server(`Saving to: ${h.underline(n.outputDir)}`),
      i.server(
        `Hardware: ${a.cpuCount} CPU cores | ${a.freeMemoryMb} MB free RAM | Load avg: ${a.loadAverage.toFixed(2)}`
      ),
      i.server(
        `Capacity: ${h.bold.yellow(`${e} concurrent videos`)} | ${h.bold.yellow(`${a.recommendedConcurrency} worker pool`)}`
      ),
      i.server(
        `Auto-open in browser: ${n.autoOpen !== !1 ? h.green('enabled (xdg-open)') : h.dim('disabled')}`
      ),
      i.server(`CORS: Accepting requests from ${h.dim(Q)}`),
      i.server(
        h.dim('Ready. Click the button on YouTube to enqueue videos...')
      ),
      console.log(''));
  });
}
function re(n) {
  return new Promise((e, r) => {
    let o = '';
    (n.on('data', (s) => {
      o += s.toString();
    }),
      n.on('end', () => {
        try {
          e(o ? JSON.parse(o) : {});
        } catch (s) {
          r(s);
        }
      }),
      n.on('error', r));
  });
}
function oe(n, e) {
  V.stat(n, (r, o) => {
    if (r || !o.isFile()) {
      (e.writeHead(404, { 'Content-Type': 'application/json' }),
        e.end(JSON.stringify({ error: 'File not found' })));
      return;
    }
    let s = H.extname(n).toLowerCase(),
      a = ee[s] || 'application/octet-stream';
    e.writeHead(200, { 'Content-Type': a, 'Content-Length': o.size });
    let c = V.createReadStream(n);
    (c.pipe(e),
      c.on('error', (t) => {
        (i.error(null, `Error reading file ${n}: ${t}`),
          e.headersSent || (e.writeHead(500), e.end()));
      }));
  });
}
export { He as startServer };
