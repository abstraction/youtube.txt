#!/usr/bin/env node
import{Command as J}from"commander";import v from"chalk";import{execa as O}from"execa";import K from"ora";import E from"fs";import D from"path";import{execa as V}from"execa";import $ from"fs";async function A(u,d={}){let f=d.signal?{cancelSignal:d.signal}:{},{stdout:i}=await V("yt-dlp",["--write-auto-subs","--write-subs",u,"--no-simulate","--print","after_move:filepath"],f),o=i.split(`
`).map(e=>e.trim()).filter(Boolean),r=o.find(e=>e.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i))||o[o.length-1],n=$.readdirSync(".").find(e=>e.endsWith(".vtt"));if(!r||!$.existsSync(r))throw new Error(`Failed to locate downloaded video file. Output was: ${i}`);if(!n)throw new Error("Failed to locate downloaded VTT subtitles (video might not have captions).");return{videoFile:r,vttFile:n}}import B from"fs";import{execa as F}from"execa";async function I(u,d,f={}){let{concurrency:i=4,threadsPerWorker:o=1,signal:r,onProgress:l}=f;if(d.length===0)return;let n=[0];try{let t=r?{cancelSignal:r}:{},{stderr:a}=await F("ffmpeg",["-i",u,"-filter:v","select='gt(scene,0.2)',showinfo","-f","null","-"],t),b=/pts_time:([0-9.]+)/g,x;for(;(x=b.exec(a))!==null;)n.push(parseFloat(x[1]))}catch{if(r?.aborted)throw new Error("Frame extraction aborted by user")}n.sort((t,a)=>t-a);let e=new Set;for(let t of d){let a=n[0];for(let b of n)if(b<=t.seconds)a=b;else break;t.sceneTimestamp=String(a),e.add(a)}let s=Array.from(e),h=s.length,c=0,w=0,p=async()=>{for(;w<s.length;){if(r?.aborted)throw new Error("Frame extraction aborted by user");let t=w++,a=s[t],b=`images/${a}.jpg`;if(!B.existsSync(b)){let x=r?{cancelSignal:r}:{};await F("ffmpeg",["-y","-ss",String(a),"-nostdin","-threads",String(o),"-i",u,"-frames:v","1","-q:v","2","-vf","scale=1024:-1",b],x)}c++,l&&l(c,h)}},g=Math.max(1,Math.min(i,s.length)),m=Array.from({length:g},()=>p());await Promise.all(m)}import N from"fs";import _ from"readline";import H from"compromise";async function L(u){let d=N.createReadStream(u),f=_.createInterface({input:d,crlfDelay:1/0}),i=[],o=null,r=0,l=0,n=!1,e=[],s=5;for await(let p of f){let g=p.trim();if(!g||!n&&!g.match(/^\d{2}:\d{2}/))continue;n=!0;let m=g.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/);if(m){let a=m[1]?`${m[1]}${m[2]}`:`00:${m[2]}`,b=m[3]?`${m[3]}${m[4]}`:`00:${m[4]}`;o=a;let x=y=>{let S=y.split(":"),P=parseInt(S[0]??"0",10),C=parseInt(S[1]??"0",10),k=parseFloat(S[2]??"0");return P*3600+C*60+k};r=x(a),l=x(b);continue}if(g.match(/^\d+$/))continue;let t=g.replace(/<[^>]+>/g,"").trim();t&&o&&(e.includes(t)||(i.push({timestamp:o,seconds:r,endSeconds:l,text:t}),e.push(t),e.length>s&&e.shift()))}let h=[],c=[],w=p=>{if(p.length===0)return;let g=p.map(y=>y.text).join(" "),t=H(g).sentences().out("array"),a=[],b=0,x=null;for(let y=0;y<t.length;y++){let S=t[y];if(a.length===0){let P=0,C=p[0];for(let k of p){if(P+k.text.length>=b){C=k;break}P+=k.text.length+1}x=C}a.push(S),b+=S.length+1,(a.length>=3||y===t.length-1)&&(h.push({timestamp:x.timestamp,seconds:x.seconds,text:a.join(" ")}),a=[])}};for(let p=0;p<i.length;p++){let g=i[p],m=p>0?i[p-1]:null,t=!1;if(c.length>0&&m){let a=g.seconds-m.endSeconds,b=g.seconds-c[0].seconds;(a>1.5||b>30)&&(t=!0)}t&&(w(c),c=[]),c.push(g)}return w(c),h}import U from"fs";import Y from"ejs";var G=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <style>
    :root {
      --bg: #fcfcfc;
      --text: #1a1a1a;
      --link: #065fd4;
      --link-hover: #00368a;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111111;
        --text: #e5e5e5;
        --link: #3ea6ff;
        --link-hover: #83c6ff;
      }
    }
    body {
      margin: 0;
      padding: 1rem 0 3rem 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 18px;
      line-height: 1.6;
      background-color: var(--bg);
      color: var(--text);
      letter-spacing: -0.01em;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    a {
      color: var(--link);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    
    .header-container {
      display: grid;
      grid-template-columns: minmax(0, 800px) min(65ch, 100%);
      gap: 3rem;
      justify-content: end;
      padding-left: 2rem;
      padding-right: max(2rem, calc(50vw - 480px));
      margin-bottom: 2rem;
    }
    .header-content {
      grid-column: 2;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    .video-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .footer-container {
      display: grid;
      grid-template-columns: minmax(0, 800px) min(65ch, 100%);
      gap: 3rem;
      justify-content: end;
      padding-left: 2rem;
      padding-right: max(2rem, calc(50vw - 480px));
      margin-top: 2rem;
      margin-bottom: 4rem;
      border-top: 1px solid rgba(128,128,128,0.2);
      padding-top: 2rem;
    }
    .footer-content {
      grid-column: 2;
      font-size: 0.85rem;
      opacity: 0.5;
      text-align: right;
    }

    .scene {
      display: grid;
      grid-template-columns: minmax(0, 800px) min(65ch, 100%);
      gap: 3rem;
      justify-content: end;
      align-items: start;
      padding-left: 2rem;
      padding-right: max(2rem, calc(50vw - 480px));
      margin-bottom: 5rem;
    }
    .visuals-column {
      position: sticky;
      top: 2rem;
      max-height: calc(100vh - 4rem);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .text-column {
      max-width: 65ch;
    }
    .bento-grid {
      display: grid;
      gap: 0.75rem;
    }
    .bento-grid[data-count="1"] {
      grid-template-columns: 1fr;
    }
    .bento-grid[data-count="2"] {
      grid-template-columns: 1fr 1fr;
    }
    .bento-grid[data-count="3"] {
      grid-template-columns: 1fr 1fr;
    }
    .bento-grid[data-count="3"] > div:first-child {
      grid-column: span 2;
    }
    .bento-grid[data-count="4"] {
      grid-template-columns: 1fr 1fr;
    }
    
    button.lightbox-trigger {
      background: none;
      border: none;
      padding: 0;
      width: 100%;
      text-align: left;
    }
    
    .bento-grid img {
      width: 100%;
      height: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      display: block;
      border-radius: 8px;
      cursor: zoom-in;
      transition: transform 0.2s;
      border: 1px solid rgba(128,128,128,0.2);
    }
    .bento-grid button.lightbox-trigger:hover img {
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .prose p {
      margin: 0 0 1.5rem 0;
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
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 9999;
      align-items: center;
      justify-content: center;
      cursor: zoom-out;
    }
    .lightbox.active {
      display: flex;
    }
    .lightbox img {
      max-width: 90%;
      max-height: 90vh;
      border-radius: 8px;
    }

    @media (max-width: 600px) {
      .scene, .header-container, .footer-container {
        grid-template-columns: 1fr;
      }
      .header-content, .footer-content {
        grid-column: 1;
      }
      .visuals-column {
        position: relative;
        top: 0;
        margin-bottom: 2rem;
      }
    }
  </style>
</head>
<body>
  <header class="header-container">
    <div class="header-content">
      <div class="video-title" title="<%= title %>"><a href="<%= url %>" target="_blank" style="color: inherit;"><%= title %></a></div>
    </div>
  </header>
  <main>
    <% chapters.forEach(chapter => { 
         const sceneImages = chapter.uniqueScenes.slice(0, 4);
    %>
      <div class="scene">
        <div class="visuals-column">
          <div class="bento-container">
            <div class="bento-grid" data-count="<%= sceneImages.length %>">
              <% sceneImages.forEach(sceneTs => { %>
                <div>
                  <button type="button" class="lightbox-trigger" aria-haspopup="dialog" aria-label="Video frame at <%= sceneTs %>s">
                    <img src="images/<%= sceneTs %>.jpg" alt="Video frame at <%= sceneTs %>s" loading="lazy">
                  </button>
                </div>
              <% }) %>
            </div>
          </div>
        </div>
        <div class="text-column prose">
          <% chapter.paragraphs.forEach(p => { 
               const linkChar = url.includes('?') ? '&' : '?';
               const timestampUrl = \`\${url}\${linkChar}t=\${Math.floor(p.seconds)}\`;
               let timeLabel = p.timestamp.replace(/^\\d{2}:/, '');
               timeLabel = timeLabel.split('.')[0];
          %>
            <p><%= p.text %> <a href="<%= timestampUrl %>" target="_blank" class="anchor" title="Jump to <%= p.timestamp %>"><%= timeLabel %></a></p>
          <% }) %>
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
  
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const lightbox = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightbox-img');
      
      document.querySelectorAll('.lightbox-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
          const img = btn.querySelector('img');
          if (img) {
            lightboxImg.src = img.src;
            lightbox.classList.add('active');
          }
        });
      });
      
      lightbox.addEventListener('click', () => {
        lightbox.classList.remove('active');
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
          lightbox.classList.remove('active');
        }
      });
    });
  </script>
</body>
</html>
`;async function R(u,d,f="YouTube Transcript"){let i=[],o=[],r=new Set;for(let n=0;n<d.length;n++){let e=d[n];o.push(e),e.sceneTimestamp&&r.add(e.sceneTimestamp);let s=d[n+1];if(s){let h=s.sceneTimestamp!==e.sceneTimestamp;o.length>=4&&h&&(i.push({uniqueScenes:Array.from(r),paragraphs:o}),o=[],r=new Set)}}o.length>0&&i.push({uniqueScenes:Array.from(r),paragraphs:o});let l=Y.render(G,{url:u,chapters:i,title:f});U.writeFileSync("index.html",l,"utf-8")}import M from"os";import{execa as Z}from"execa";async function j(u){let f=M.cpus().length||1,i=Math.floor(M.freemem()/(1024*1024)),o=Math.floor(M.totalmem()/(1024*1024)),r=M.loadavg()[0]??0,l=Math.max(1,Math.min(8,Math.floor(f*.35))),n=Math.max(1,Math.floor(i/250)),e=r>f*.7?.5:1,s=Math.max(1,Math.floor(Math.min(l,n)*e));u&&u>0&&(s=u);let h=null;try{let{stdout:c}=await Z("ffmpeg",["-hwaccels"]);c.includes("cuda")?h="cuda":c.includes("vaapi")?h="vaapi":c.includes("qsv")&&(h="qsv")}catch{h=null}return{cpuCount:f,freeMemoryMb:i,totalMemoryMb:o,loadAverage:r,recommendedConcurrency:s,threadsPerWorker:1,hwaccel:h}}var T=new AbortController,q=!1,z=()=>{q&&process.exit(130),q=!0,process.stderr.write(`
`+v.yellow("Aborting and cleaning up (press Ctrl-C again to force quit)...")+`
`),T.abort()};process.on("SIGINT",z);process.on("SIGTERM",z);var W=new J;W.name("youtube.txt").description("Create a webpage from a Youtube video with a transcript paired with screenshots").requiredOption("-u, --url <url>","URL of the YouTube video").requiredOption("-o, --out <projectName>","Name of the output project folder").option("-c, --concurrency <number>","Number of parallel extraction workers (default: dynamic auto-tuning)").option("-t, --threads <number>","FFmpeg threads per worker instance (default: 1)").action(async u=>{let{out:d,url:f,concurrency:i,threads:o}=u;try{await O("yt-dlp",["--version"])}catch{console.error(v.red("Error: yt-dlp is not installed or not in PATH.")),process.exit(1)}try{await O("ffmpeg",["-version"])}catch{console.error(v.red("Error: ffmpeg is not installed or not in PATH.")),process.exit(1)}let r=i?parseInt(i,10):void 0,l=await j(r),n=o?parseInt(o,10):l.threadsPerWorker;console.log(v.blue(`Initializing project: ${d}...`)),console.log(v.dim(`System: ${l.cpuCount} CPU cores | ${l.freeMemoryMb} MB free RAM | Load avg: ${l.loadAverage.toFixed(2)}`)),console.log(v.dim(`Dynamic allocation: ${l.recommendedConcurrency} worker pool (${n} thread/worker)`)),E.existsSync(d)||E.mkdirSync(d,{recursive:!0}),process.chdir(d),E.existsSync("images")||E.mkdirSync("images");let e=K("Downloading video and captions...").start();try{let{videoFile:s,vttFile:h}=await A(f,{signal:T.signal});e.succeed(`Downloaded video and captions: ${s}`),e.start("Parsing captions...");let c=await L(h);e.succeed(`Parsed ${c.length} paragraphs.`),e.start("Extracting frames (0%)..."),await I(s,c,{concurrency:l.recommendedConcurrency,threadsPerWorker:n,signal:T.signal,onProgress:(g,m)=>{let t=Math.floor(g/m*100);e.text=`Extracting frames: ${g}/${m} (${t}%) [${l.recommendedConcurrency} workers, ${n} th/w]`}}),e.succeed(`Extracted frames successfully (${c.length} paragraphs).`),e.start("Generating HTML...");let p=D.parse(s).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/,"");await R(f,c,p),e.succeed(`Done! View your webpage at ${D.join(process.cwd(),"index.html")}`)}catch(s){T.signal.aborted&&(e.fail("Process aborted."),process.exit(130)),e.fail("An error occurred during processing."),s instanceof Error&&console.error(v.red(s.message)),process.exit(1)}});W.parse(process.argv);
