import { execa as Q } from 'execa';
import W from 'fs';
import N from 'path';
async function be(r, t = {}) {
  let o = t.outputDir ? N.resolve(t.outputDir) : process.cwd();
  W.existsSync(o) || W.mkdirSync(o, { recursive: !0 });
  let l = { cwd: o, ...(t.signal ? { cancelSignal: t.signal } : {}) },
    g = [
      '--write-auto-subs',
      '--write-subs',
      r,
      '--no-simulate',
      '--print',
      'after_move:filepath',
    ];
  t.outputDir && g.push('-P', o);
  let i;
  for (let m = 1; m <= 3; m++)
    try {
      let { stdout: d } = await Q('yt-dlp', g, l),
        p = d
          .split(
            `
`
          )
          .map((u) => u.trim())
          .filter(Boolean),
        f =
          p.find((u) => u.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i)) ||
          p[p.length - 1];
      f && !N.isAbsolute(f) && (f = N.resolve(o, f));
      let E = W.readdirSync(o).find((u) => u.endsWith('.vtt'));
      if (!f || !W.existsSync(f))
        throw new Error(
          `Failed to locate downloaded video file. Output was: ${d}`
        );
      if (!E)
        throw new Error(
          'Failed to locate downloaded VTT subtitles (video might not have captions).'
        );
      let y = N.resolve(o, E);
      return { videoFile: f, vttFile: y };
    } catch (d) {
      if (((i = d), t.signal?.aborted)) throw d;
      let p = d instanceof Error ? d.message : String(d);
      if (
        m < 3 &&
        (p.includes('429') ||
          p.includes('Too Many Requests') ||
          p.includes('HTTP Error 429'))
      ) {
        await new Promise((f) => setTimeout(f, m * 2500));
        continue;
      }
      throw d;
    }
  throw i;
}
import M from 'path';
import ee from 'os';
import T from 'fs';
import { execa as U } from 'execa';
async function Te(r, t, o = {}) {
  let {
      concurrency: l = 4,
      threadsPerWorker: g = 1,
      signal: i,
      onProgress: m,
      sceneThreshold: d = 0.15,
      dedupThreshold: p = 4,
      outputDir: f,
    } = o,
    x = f ? M.resolve(f, 'images') : M.resolve('images');
  if ((T.existsSync(x) || T.mkdirSync(x, { recursive: !0 }), t.length === 0))
    return;
  let E = null;
  try {
    let { stdout: e } = await U('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        r,
      ]),
      n = parseFloat(e.trim());
    !isNaN(n) && n > 0 && (E = n);
  } catch {}
  let y = E !== null ? Math.max(0, E - 0.5) : 1 / 0,
    u = [0];
  try {
    let e = i ? { cancelSignal: i } : {},
      { stderr: n } = await U(
        'ffmpeg',
        [
          '-i',
          r,
          '-filter:v',
          `select='gt(scene,${d})',showinfo`,
          '-f',
          'null',
          '-',
        ],
        e
      ),
      s = /pts_time:([0-9.]+)/g,
      c;
    for (; (c = s.exec(n)) !== null;) {
      let b = parseFloat(c[1]);
      b <= y && u.push(b);
    }
  } catch {
    if (i?.aborted) throw new Error('Frame extraction aborted by user');
  }
  u.sort((e, n) => e - n);
  let v = new Set();
  for (let e of u) e <= y && v.add(e);
  v.size === 0 && v.add(0);
  let R = 5;
  for (let e = 0; e < t.length; e++) {
    let n = t[e],
      s = t[e + 1],
      c = s ? s.seconds : n.seconds + 10;
    c > y && (c = y);
    for (let b = n.seconds; b <= c && !(b > y); b += R) {
      let k = Math.round(b * 100) / 100;
      Array.from(v).some((H) => Math.abs(H - k) < 2.5) || v.add(k);
    }
  }
  let L = Array.from(v).sort((e, n) => e - n);
  for (let e = 0; e < t.length; e++) {
    let n = t[e],
      s = t[e + 1],
      c = s ? s.seconds : n.seconds + 10,
      b = L[0] ?? 0,
      k = [];
    for (let P of L)
      if (P <= n.seconds) b = P;
      else if (P < c) k.push(P);
      else break;
    ((n.sceneTimestamp = String(b)),
      (n.sceneTimestamps = Array.from(new Set([b, ...k])).map(String)));
  }
  let C = Array.from(v),
    _ = C.length,
    I = 0,
    D = 0,
    B = async () => {
      for (; D < C.length;) {
        if (i?.aborted) throw new Error('Frame extraction aborted by user');
        let e = D++,
          n = C[e],
          s = M.join(x, `${n}.jpg`);
        if (!T.existsSync(s))
          try {
            let c = i ? { cancelSignal: i } : {};
            await U(
              'ffmpeg',
              [
                '-y',
                '-ss',
                String(n),
                '-nostdin',
                '-threads',
                String(g),
                '-i',
                r,
                '-frames:v',
                '1',
                '-q:v',
                '2',
                '-vf',
                'scale=1024:-1',
                s,
              ],
              c
            );
          } catch {
            if (i?.aborted) throw new Error('Frame extraction aborted by user');
            if (T.existsSync(s))
              try {
                T.statSync(s).size === 0 && T.unlinkSync(s);
              } catch {}
          }
        (I++, m && m(I, _));
      }
    },
    w = Math.max(1, Math.min(l, C.length)),
    S = Array.from({ length: w }, () => B());
  await Promise.all(S);
  let a = C.filter((e) => {
      let n = M.join(x, `${e}.jpg`);
      try {
        return T.existsSync(n) && T.statSync(n).size > 0;
      } catch {
        return !1;
      }
    }).sort((e, n) => e - n),
    h = new Map();
  for (let e of C) {
    let n = M.join(x, `${e}.jpg`);
    if (!(T.existsSync(n) && T.statSync(n).size > 0) && a.length > 0) {
      let c = a[0],
        b = Math.abs(e - c);
      for (let k of a) {
        let P = Math.abs(e - k);
        P < b && ((b = P), (c = k));
      }
      h.set(e, c);
    }
  }
  let F = await T.promises.mkdtemp(M.join(ee.tmpdir(), 'yt-dhash-'));
  async function V(e) {
    let n = M.join(x, `${e}.jpg`);
    if (!T.existsSync(n)) return '';
    let s = M.join(F, `${e}.raw`);
    await U('ffmpeg', [
      '-i',
      n,
      '-vf',
      'scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:-1:-1:color=black,scale=9:8,format=gray',
      '-f',
      'rawvideo',
      '-y',
      s,
    ]);
    let c = await T.promises.readFile(s),
      b = '';
    for (let k = 0; k < 8; k++)
      for (let P = 0; P < 8; P++) {
        let H = c[k * 9 + P],
          X = c[k * 9 + P + 1];
        H !== void 0 && X !== void 0 && (b += H > X ? '1' : '0');
      }
    return b;
  }
  function O(e, n) {
    let s = 0;
    for (let c = 0; c < 64; c++) e[c] !== n[c] && s++;
    return s;
  }
  let q = new Map(),
    j = 0,
    Y = async () => {
      for (; j < a.length;) {
        if (i?.aborted) throw new Error('Frame extraction aborted by user');
        let e = j++,
          n = a[e];
        if (n === void 0) break;
        try {
          let s = await V(n);
          s && q.set(n, s);
        } catch {}
      }
    },
    K = Math.max(1, Math.min(l, a.length));
  await Promise.all(Array.from({ length: K }, () => Y()));
  let z = null,
    G = null,
    $ = new Map();
  for (let e of a) {
    let n = q.get(e);
    if (!n) {
      $.set(e, e);
      continue;
    }
    if (z !== null && G !== null && O(G, n) <= p) {
      $.set(e, z);
      try {
        T.unlinkSync(M.join(x, `${e}.jpg`));
      } catch {}
      continue;
    }
    ((z = e), (G = n), $.set(e, e));
  }
  await T.promises.rm(F, { recursive: !0, force: !0 });
  function J(e) {
    let n = h.has(e) ? h.get(e) : e;
    return ($.has(n) && (n = $.get(n)), n);
  }
  for (let e of t) {
    if (e.sceneTimestamp) {
      let n = parseFloat(e.sceneTimestamp);
      e.sceneTimestamp = String(J(n));
    }
    if (e.sceneTimestamps) {
      let n = e.sceneTimestamps.map((s) => {
        let c = parseFloat(s);
        return String(J(c));
      });
      e.sceneTimestamps = Array.from(new Set(n));
    }
  }
}
import te from 'fs';
import ne from 'readline';
import re from 'compromise';
async function Ae(r) {
  let t = te.createReadStream(r),
    o = ne.createInterface({ input: t, crlfDelay: 1 / 0 }),
    l = [],
    g = null,
    i = 0,
    m = 0,
    d = !1,
    p = [],
    f = 5;
  for await (let w of o) {
    let S = w.trim();
    if (!S || (!d && !S.match(/^\d{2}:\d{2}/))) continue;
    d = !0;
    let a = S.match(
      /^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/
    );
    if (a) {
      let F = a[1] ? `${a[1]}${a[2]}` : `00:${a[2]}`,
        V = a[3] ? `${a[3]}${a[4]}` : `00:${a[4]}`;
      g = F;
      let O = (q) => {
        let j = q.split(':'),
          Y = parseInt(j[0] ?? '0', 10),
          K = parseInt(j[1] ?? '0', 10),
          z = parseFloat(j[2] ?? '0');
        return Y * 3600 + K * 60 + z;
      };
      ((i = O(F)), (m = O(V)));
      continue;
    }
    let h = S;
    ((h.startsWith('>> ') || h.startsWith('&gt;&gt; ')) &&
      (h = '[New Speaker]: ' + h.replace(/^(>>|&gt;&gt;)\s*/, '')),
      (h = h
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")),
      (h = h.replace(/<[^>]+>/g, '').trim()),
      h &&
        ((h = h.replace(/</g, '&lt;').replace(/>/g, '&gt;')),
        g &&
          (p.includes(h) ||
            (l.push({ timestamp: g, seconds: i, endSeconds: m, text: h }),
            p.push(h),
            p.length > f && p.shift()))));
  }
  let x = [];
  if (l.length === 0) return x;
  let E = l.map((w) => w.text).join(' '),
    y = [],
    u = 0;
  for (let w of l) {
    let S = w.text.length;
    (y.push({ cue: w, startChar: u, endChar: u + S }), (u += S + 1));
  }
  let R = re(E).sentences().out('array'),
    L = [],
    C = 40,
    _ = 20;
  for (let w of R) {
    let S = w.split(' ');
    if (S.length <= C) L.push(w);
    else
      for (let a = 0; a < S.length; a += _) L.push(S.slice(a, a + _).join(' '));
  }
  let I = [],
    D = null,
    B = 0;
  for (let w = 0; w < L.length; w++) {
    let S = L[w],
      a = y.find((F) => F.endChar > B) || y[y.length - 1];
    if (!a) continue;
    let h = a.cue;
    (I.length === 0 && (D = h),
      I.push(S),
      (B += S.length + 1),
      (I.length >= 3 || w === L.length - 1) &&
        (x.push({
          timestamp: D.timestamp,
          seconds: D.seconds,
          text: I.join(' '),
        }),
        (I = [])));
  }
  return x;
}
import oe from 'fs';
import ie from 'path';
import se from 'ejs';
var ae = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #fcfcfc;
      --text: #1a1a1a;
      --link: #065fd4;
      --link-hover: #00368a;
      --accent: #065fd4;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111111;
        --text: #e5e5e5;
        --link: #3ea6ff;
        --link-hover: #83c6ff;
        --accent: #3ea6ff;
      }
    }
    body {
      margin: 0;
      padding: 1rem 0 3rem 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 18px;
      line-height: 1.65;
      background-color: var(--bg);
      color: var(--text);
      letter-spacing: -0.01em;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    a {
      color: var(--link);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    
    .header-container {
      max-width: calc(65ch + 600px + 3rem);
      margin: 0 auto;
      padding: 0 2rem;
      margin-bottom: 2rem;
      display: flex;
    }
    .header-content {
      font-size: 0.9rem;
      width: 100%;
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      min-width: 0;
    }
    .video-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.8;
      min-width: 0;
      transition: opacity 0.2s ease;
    }
    .video-title:hover {
      opacity: 1;
    }
    .copy-ai-btn {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      font-family: inherit;
      font-size: 0.82rem;
      color: inherit;
      opacity: 0.45;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: opacity 0.2s ease, color 0.2s ease;
      letter-spacing: -0.01em;
    }
    .copy-ai-btn:hover,
    .copy-ai-btn:focus-visible {
      opacity: 0.85;
      text-decoration: underline;
    }
    .copy-ai-btn.copied {
      opacity: 0.85;
      color: var(--accent);
      text-decoration: none;
    }

    .footer-container {
      max-width: calc(65ch + 600px + 3rem);
      margin: 0 auto;
      padding: 0 2rem;
      margin-top: 2rem;
      margin-bottom: 4rem;
      border-top: 1px solid rgba(128,128,128,0.2);
      padding-top: 2rem;
    }
    .footer-content {
      font-size: 0.85rem;
      opacity: 0.5;
      text-align: right;
    }

    .scene {
      display: grid;
      grid-template-columns: min(65ch, 100%) minmax(400px, 600px);
      gap: 3rem;
      justify-content: center;
      align-items: start;
      padding: 0 2rem;
      margin-bottom: 4rem;
    }
    .visuals-column {
      position: sticky;
      top: 2rem;
      display: flex;
      flex-direction: column;
      justify-content: start;
      z-index: 10;
      overflow: visible;
    }
    .text-column {
      max-width: 65ch;
    }
    .bento-grid {
      display: grid;
      gap: 0.5rem;
    }
    .bento-grid[data-count="1"] { grid-template-columns: 1fr; }
    
    .bento-grid[data-count="2"] { grid-template-columns: repeat(2, 1fr); }
    
    .bento-grid[data-count="3"] { grid-template-columns: repeat(2, 1fr); }
    .bento-grid[data-count="3"] > div:first-child { grid-column: span 2; }
    
    .bento-grid[data-count="4"] { grid-template-columns: repeat(2, 1fr); }
    
    .bento-grid[data-count="5"] { grid-template-columns: repeat(6, 1fr); }
    .bento-grid[data-count="5"] > div:nth-child(-n+2) { grid-column: span 3; }
    .bento-grid[data-count="5"] > div:nth-child(n+3) { grid-column: span 2; }
    
    .bento-grid[data-count="6"] { grid-template-columns: repeat(2, 1fr); }
    
    button.lightbox-trigger {
      background: none;
      border: none;
      padding: 0;
      width: 100%;
      height: 100%;
      text-align: left;
      position: relative;
      display: block;
    }
    
    .scene-timestamp {
      position: absolute;
      bottom: 6px;
      right: 6px;
      background: rgba(0, 0, 0, 0.72);
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.7rem;
      font-weight: 500;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 2px 5px;
      border-radius: 4px;
      letter-spacing: 0.02em;
      pointer-events: none;
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      transition: opacity 0.2s ease;
      line-height: 1.2;
    }

    .bento-grid img {
      width: 100%;
      height: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      display: block;
      border-radius: 6px;
      cursor: zoom-in;
      transition: transform 0.2s, opacity 0.2s;
      border: 1px solid rgba(128,128,128,0.12);
      opacity: 1;
    }
    .bento-grid button.lightbox-trigger:hover img,
    .bento-grid button.lightbox-trigger:focus img {
      transform: scale(1.02);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .prose p {
      margin: 0 0 2rem 0;
      text-wrap: pretty;
    }
    .anchor {
      color: inherit;
      margin-left: 0.5rem;
      opacity: 0;
      transition: opacity 0.2s;
      font-size: 0.85em;
      text-decoration: none;
    }
    .prose p:hover .anchor, .anchor:focus {
      opacity: 0.5;
    }
    .anchor:hover {
      opacity: 1 !important;
      text-decoration: underline;
    }
    
    .lightbox {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: zoom-out;
    }
    .lightbox.active {
      opacity: 1;
      pointer-events: auto;
    }
    .lightbox img {
      max-width: 90%;
      max-height: 90vh;
      border-radius: 8px;
    }

    @media (max-width: 800px) {
      .scene, .header-container, .footer-container {
        grid-template-columns: 1fr;
        padding: 0 1.25rem;
        gap: 1.5rem;
      }
      .visuals-column {
        position: relative;
        top: auto;
        margin-bottom: 1.5rem;
        padding-top: 0.5rem;
        padding-bottom: 0.5rem;
        max-height: none;
        overflow: visible;
        order: -1;
        border-bottom: 1px solid rgba(128,128,128,0.1);
      }
      /* Horizontal scrolling for bento grid on mobile */
      .bento-grid {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        gap: 0.75rem;
        -ms-overflow-style: none;  /* IE and Edge */
        scrollbar-width: none;  /* Firefox */
      }
      .bento-grid::-webkit-scrollbar {
        display: none;
      }
      .bento-grid > div {
        flex: 0 0 85%;
        scroll-snap-align: center;
      }
      /* The first item doesn't need to be spanning if it's horizontal */
      .bento-grid[data-count="3"] > div:first-child { grid-column: auto; }
      
      body {
        font-size: 17px;
        line-height: 1.7;
      }
      .prose p {
        margin: 0 0 1.75rem 0;
      }
    }
  
    /* Active scene highlights with subtle elevation */
    .bento-grid img {
      transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.25s ease, filter 0.25s ease;
      will-change: transform;
    }
    .bento-grid.has-active img:not(.active-scene) {
      opacity: 0.35;
      filter: grayscale(0.4);
    }
    .bento-grid.has-active img.active-scene {
      opacity: 1;
      transform: scale(1.04);
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      z-index: 30;
      position: relative;
    }
    .transcript-p {
      transition: color 0.3s ease;
      border-left: 3px solid transparent;
      padding-left: 1rem;
      margin-left: -1rem;
    }
    .transcript-p.active-p {
      border-left-color: var(--accent);
    }

  </style>
</head>
<body>
  <header class="header-container">
    <div class="header-content">
      <div class="video-title" title="<%= title %>"><a href="<%= url %>" target="_blank" style="color: inherit;"><%= title %></a></div>
      <button type="button" class="copy-ai-btn" id="copy-ai-btn" title="Copy transcript with AI cleanup prompt" aria-label="Copy transcript with AI cleanup prompt">[copy for ai]</button>
    </div>
  </header>
  <main>
    <% chapters.forEach(chapter => { 
         const sceneImages = chapter.uniqueScenes.slice(0, 6);
    %>
      <div class="scene">
        <div class="text-column prose">
          <% chapter.paragraphs.forEach(p => { 
               const linkChar = url.includes('?') ? '&' : '?';
               const timestampUrl = \`\${url}\${linkChar}t=\${Math.floor(p.seconds)}\`;
               let timeLabel = p.timestamp.replace(/^d{2}:/, '');
               timeLabel = timeLabel.split('.')[0];
               const scenesAttr = (p.sceneTimestamps && p.sceneTimestamps.length > 0 ? p.sceneTimestamps : [p.sceneTimestamp]).filter(Boolean).join(',');
          %>
            <p data-scenes="<%= scenesAttr %>" data-scene="<%= p.sceneTimestamp %>" class="transcript-p"><%- p.text %> <a href="<%= timestampUrl %>" target="_blank" class="anchor" title="Jump to <%= p.timestamp %>"><%= timeLabel %></a></p>
          <% }) %>
        </div>
        <div class="visuals-column">
          <div class="bento-container">
            <div class="bento-grid" data-count="<%= sceneImages.length %>">
              <% sceneImages.forEach(sceneTs => { 
                   const s = Math.floor(parseFloat(sceneTs));
                   const mins = Math.floor(s / 60);
                   const secs = s % 60;
                   const minsStr = mins < 10 ? '0' + mins : '' + mins;
                   const secsStr = secs < 10 ? '0' + secs : '' + secs;
                   const sceneLabel = minsStr + ':' + secsStr;
              %>
                <div>
                  <button type="button" class="lightbox-trigger" aria-haspopup="dialog" aria-label="Video frame at <%= sceneTs %>s">
                    <img id="img-<%= sceneTs %>" src="images/<%= sceneTs %>.jpg" alt="Video frame at <%= sceneTs %>s" loading="lazy">
                    <span class="scene-timestamp"><%= sceneLabel %></span>
                  </button>
                </div>
              <% }) %>
            </div>
          </div>
        </div>
      </div>
    <% }) %>
  </main>

  <footer class="footer-container">
    <div class="footer-content">
      generated by <a href="https://github.com/abstraction/youtube.txt" target="_blank">youtube.txt</a>
    </div>
  </footer>

  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Image fullscreen view">
    <img src="" id="lightbox-img">
  </div>
  
  <textarea id="ai-prompt" style="display: none;" aria-hidden="true"><%= aiPrompt %></textarea>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const copyBtn = document.getElementById('copy-ai-btn');
      const aiPromptEl = document.getElementById('ai-prompt');
      let copyTimer = null;

      if (copyBtn && aiPromptEl) {
        copyBtn.addEventListener('click', async () => {
          const text = aiPromptEl.value;
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try {
              document.execCommand('copy');
            } catch (err) {
              console.error('Failed to copy', err);
            }
            document.body.removeChild(ta);
          }

          if (copyTimer) clearTimeout(copyTimer);
          copyBtn.textContent = '[copied!]';
          copyBtn.classList.add('copied');
          copyTimer = setTimeout(() => {
            copyBtn.textContent = '[copy for ai]';
            copyBtn.classList.remove('copied');
            copyTimer = null;
          }, 2000);
        });
      }
    });
  </script>
  
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const lightbox = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightbox-img');
      
      const closeLightbox = () => lightbox.classList.remove('active');
      
      document.querySelectorAll('.lightbox-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
          const img = btn.querySelector('img');
          if (img) {
            lightboxImg.src = img.src;
            lightbox.classList.add('active');
          }
        });
      });
      
      lightbox.addEventListener('click', closeLightbox);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
      });
      
      // Frictionless dismiss: Close instantly on scroll attempt
      window.addEventListener('wheel', closeLightbox, { passive: true });
      window.addEventListener('touchmove', closeLightbox, { passive: true });
    });
  </script>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const paragraphs = document.querySelectorAll('.transcript-p');
      const images = document.querySelectorAll('.bento-grid img');
      let dwellTimer = null;

      function clearActive() {
        if (dwellTimer) {
          clearTimeout(dwellTimer);
          dwellTimer = null;
        }
        document.querySelectorAll('.active-p').forEach(p => p.classList.remove('active-p'));
        document.querySelectorAll('.active-scene').forEach(img => img.classList.remove('active-scene'));
        document.querySelectorAll('.bento-grid.has-active').forEach(g => g.classList.remove('has-active'));
      }

      function highlightScenes(sceneIds) {
        sceneIds.forEach(sceneId => {
          const img = document.getElementById('img-' + sceneId);
          if (img) {
            const grid = img.closest('.bento-grid');
            if (grid) {
              grid.classList.add('has-active');
              img.classList.add('active-scene');
            }
          }
        });
      }

      // 1. Image Hover Intent (750ms dwell filter)
      images.forEach(img => {
        const sceneId = img.id.replace('img-', '');
        
        img.addEventListener('mouseenter', (e) => {
          if (e.pointerType === 'touch') return;
          clearActive();
          dwellTimer = setTimeout(() => {
            img.classList.add('active-scene');
            const grid = img.closest('.bento-grid');
            if (grid) grid.classList.add('has-active');

            paragraphs.forEach(p => {
              const scenes = (p.getAttribute('data-scenes') || p.getAttribute('data-scene') || '').split(',');
              if (scenes.includes(sceneId)) {
                p.classList.add('active-p');
              }
            });
          }, 750);
        });

        img.addEventListener('mouseleave', () => {
          clearActive();
        });
      });

      // 2. Paragraph Click-to-Focus
      paragraphs.forEach(p => {
        p.addEventListener('click', (e) => {
          // Ignore anchor clicks and drag text selection
          if (e.target.tagName.toLowerCase() === 'a') return;
          if (window.getSelection && window.getSelection().toString().length > 0) return;

          const isAlreadyActive = p.classList.contains('active-p');
          clearActive();

          if (!isAlreadyActive) {
            p.classList.add('active-p');
            const scenes = (p.getAttribute('data-scenes') || p.getAttribute('data-scene') || '').split(',').filter(Boolean);
            highlightScenes(scenes);
          }
        });
      });

      // 3. Global Frictionless Dismissal on Scroll
      const scrollOpts = { passive: true };
      window.addEventListener('wheel', clearActive, scrollOpts);
      window.addEventListener('scroll', clearActive, scrollOpts);
      window.addEventListener('touchmove', clearActive, scrollOpts);

      // Click outside text/bento dismisses active highlight
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.transcript-p') && !e.target.closest('.bento-grid')) {
          clearActive();
        }
      });
    });
  </script>
</body>

</html>
`;
function ce(r) {
  let t = [];
  if (r.length === 0) return t;
  let o = [],
    l = new Set();
  for (let g = 0; g < r.length; g++) {
    let i = r[g];
    if ((o.push(i), i.sceneTimestamps && i.sceneTimestamps.length > 0))
      for (let d of i.sceneTimestamps) l.add(d);
    else i.sceneTimestamp && l.add(i.sceneTimestamp);
    let m = r[g + 1];
    if (m) {
      let p = (
          m.sceneTimestamps && m.sceneTimestamps.length > 0
            ? m.sceneTimestamps
            : m.sceneTimestamp
              ? [m.sceneTimestamp]
              : []
        ).some((v) => !l.has(v)),
        f = i.seconds - o[0].seconds,
        x = p && l.size >= 6,
        E = o.length >= 14,
        y = f > 180,
        u = p && (o.length >= 6 || f > 60);
      (x || E || y || u) &&
        (t.push({
          uniqueScenes: Array.from(l).sort(
            (v, R) => parseFloat(v) - parseFloat(R)
          ),
          paragraphs: o,
        }),
        (o = []),
        (l = new Set()));
    }
  }
  return (
    o.length > 0 &&
      t.push({
        uniqueScenes: Array.from(l).sort(
          (g, i) => parseFloat(g) - parseFloat(i)
        ),
        paragraphs: o,
      }),
    t
  );
}
var Z = `Execute a highly precise cleanup of the provided YouTube transcript. Your objective is to translate raw, auto-generated spoken text into a visually readable, semantically coherent format without destroying the speaker\u2019s original voice, slang, or pacing.

**Hierarchy of Operations:**
If two rules conflict, the rule higher on this list supersedes the lower rule.

**1. Semantic Localization & Auto-Sub Repair (Highest Priority)**
Correct blatant auto-translation and captioning artifacts. Fix mismatched gender pronouns (e.g., referring to a mother as "him"). Translate isolated regional idioms into their English equivalents (e.g., *Ehsan Faramos* to *ungrateful*). Repair false starts generated by unreliable auto-captions (e.g., "it it redirects", "he she knew") to restore the intended sentence baseline.

**2. Voice, Slang & Originality Preservation**
Do not rewrite sentences into rigid, formal prose. Slang, colloquialisms, and the speaker's original associative pacing must remain entirely intact. Maintaining the originality of the spoken voice is paramount.

**3. Dynamic Punctuation & Typography**
Eradicate rogue spacing and typographical glitches (e.g., "do n't", "problems ,"). Convert disjointed, fragmented periods inserted by the auto-captioner into commas or em dashes (\u2014) to naturally bridge sprawling or run-on thoughts without truncating them.

**4. Selective Pruning & Anchor Words**
Strip all numerical timestamps. You may selectively remove excessive non-lexical fillers ("um", "uh"), but you must strictly retain anchor words that establish the speaker's cadence ("like", "right", "honestly", "bro").

**5. Thematic & Visual Paragraphing**
Group text into paragraphs based on natural shifts in thought or conversational breath. To optimize visual white space, cap all paragraphs at a maximum of 5 to 6 sentences.

**6. Profanity Artifact Replacement**
Replace the YouTube auto-censor artifact \`[ __ ]\` with \`[expletive]\` to remove visual friction while accurately indicating the redaction.`;
function le(r) {
  return r
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
function me(r) {
  return r.map((t) => le(t.text).trim()).filter(Boolean).join(`

`);
}
function de(r) {
  let t = r.trim();
  return t
    ? `${Z}

\`\`\`
${t}
\`\`\``
    : `${Z}

\`\`\`
\`\`\``;
}
async function De(r, t, o = 'YouTube Transcript', l) {
  let g = ce(t),
    i = me(t),
    m = de(i),
    d = se.render(ae, { url: r, chapters: g, title: o, aiPrompt: m }),
    p = l ? ie.resolve(l, 'index.html') : 'index.html';
  oe.writeFileSync(p, d, 'utf-8');
}
import A from 'os';
import { execa as pe } from 'execa';
async function $e(r, t = 1) {
  let l = A.cpus().length || 1,
    g = Math.floor(A.freemem() / (1024 * 1024)),
    i = Math.floor(A.totalmem() / (1024 * 1024)),
    m = A.loadavg()[0] ?? 0,
    d = Math.max(1, Math.min(8, Math.floor(l * 0.35))),
    p = Math.max(1, Math.floor(g / 250)),
    f = m > l * 0.7 ? 0.5 : 1,
    x = Math.max(1, Math.floor(Math.min(d, p) * f)),
    E = Math.max(1, t),
    y = Math.max(1, Math.floor(x / E));
  r && r > 0 && (y = r);
  let u = null;
  try {
    let { stdout: v } = await pe('ffmpeg', ['-hwaccels']);
    v.includes('cuda')
      ? (u = 'cuda')
      : v.includes('vaapi')
        ? (u = 'vaapi')
        : v.includes('qsv') && (u = 'qsv');
  } catch {
    u = null;
  }
  return {
    cpuCount: l,
    freeMemoryMb: g,
    totalMemoryMb: i,
    loadAverage: m,
    recommendedConcurrency: y,
    threadsPerWorker: 1,
    hwaccel: u,
  };
}
function _e() {
  let r = A.cpus().length || 1,
    t = Math.floor(A.freemem() / (1024 * 1024));
  return r >= 16 && t >= 8e3 ? 3 : r >= 8 && t >= 4e3 ? 2 : 1;
}
function Be() {
  let r = A.cpus().length || 1,
    t = Math.floor(A.freemem() / (1024 * 1024)),
    o = A.loadavg()[0] ?? 0;
  return t < 500
    ? {
        healthy: !1,
        freeMemoryMb: t,
        loadAverage: o,
        cpuCount: r,
        throttleReason: `Low RAM (${t} MB free)`,
      }
    : o > r * 0.85
      ? {
          healthy: !1,
          freeMemoryMb: t,
          loadAverage: o,
          cpuCount: r,
          throttleReason: `High CPU load (${o.toFixed(1)} / ${r} cores)`,
        }
      : { healthy: !0, freeMemoryMb: t, loadAverage: o, cpuCount: r };
}
import { execa as ue } from 'execa';
function He(r) {
  try {
    let t = new URL(r);
    if (t.hostname.includes('youtube.com')) {
      if (t.pathname === '/watch') return t.searchParams.get('v');
      let o = t.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'live', 'v'].includes(o[0] || ''))
        return o[1] || null;
    } else if (t.hostname === 'youtu.be')
      return t.pathname.split('/').filter(Boolean)[0] || null;
  } catch {}
  return null;
}
async function We(r) {
  let { stdout: t } = await ue('yt-dlp', ['--print', '%(title)s', r]);
  return t.trim();
}
function Ne(r) {
  return (
    r
      .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^[_.]+|[_.]+$/g, '')
      .trim()
      .slice(0, 200) || 'untitled'
  );
}
export {
  be as a,
  Te as b,
  Ae as c,
  De as d,
  $e as e,
  _e as f,
  Be as g,
  He as h,
  We as i,
  Ne as j,
};
