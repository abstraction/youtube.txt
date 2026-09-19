#!/usr/bin/env node
import{Command as J}from"commander";import k from"chalk";import{execa as O}from"execa";import K from"ora";import M from"fs";import j from"path";import{execa as N}from"execa";import $ from"fs";async function F(h,p={}){let f=p.signal?{cancelSignal:p.signal}:{},{stdout:d}=await N("yt-dlp",["--write-auto-subs","--write-subs",h,"--no-simulate","--print","after_move:filepath"],f),n=d.split(`
`).map(e=>e.trim()).filter(Boolean),t=n.find(e=>e.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i))||n[n.length-1],i=$.readdirSync(".").find(e=>e.endsWith(".vtt"));if(!t||!$.existsSync(t))throw new Error(`Failed to locate downloaded video file. Output was: ${d}`);if(!i)throw new Error("Failed to locate downloaded VTT subtitles (video might not have captions).");return{videoFile:t,vttFile:i}}import B from"fs";import{execa as I}from"execa";async function A(h,p,f={}){let{concurrency:d=4,threadsPerWorker:n=1,signal:t,onProgress:y,sceneThreshold:i=.15}=f;if(p.length===0)return;let e=[0];try{let r=t?{cancelSignal:t}:{},{stderr:s}=await I("ffmpeg",["-i",h,"-filter:v",`select='gt(scene,${i})',showinfo`,"-f","null","-"],r),x=/pts_time:([0-9.]+)/g,S;for(;(S=x.exec(s))!==null;)e.push(parseFloat(S[1]))}catch{if(t?.aborted)throw new Error("Frame extraction aborted by user")}e.sort((r,s)=>r-s);let b=new Set;for(let r of p){let s=e[0];for(let x of e)if(x<=r.seconds)s=x;else break;r.sceneTimestamp=String(s),b.add(s)}let o=8,a=new Set;for(let r of p){let s=r.sceneTimestamp?parseFloat(r.sceneTimestamp):NaN;(isNaN(s)||Math.abs(r.seconds-s)>o)&&(a.add(r.seconds),r.sceneTimestamp=String(r.seconds))}for(let r of a)b.add(r);let w=Array.from(b),c=w.length,g=0,l=0,m=async()=>{for(;l<w.length;){if(t?.aborted)throw new Error("Frame extraction aborted by user");let r=l++,s=w[r],x=`images/${s}.jpg`;if(!B.existsSync(x)){let S=t?{cancelSignal:t}:{};await I("ffmpeg",["-y","-ss",String(s),"-nostdin","-threads",String(n),"-i",h,"-frames:v","1","-q:v","2","-vf","scale=1024:-1",x],S)}g++,y&&y(g,c)}},u=Math.max(1,Math.min(d,w.length)),v=Array.from({length:u},()=>m());await Promise.all(v)}import H from"fs";import V from"readline";import _ from"compromise";async function L(h){let p=H.createReadStream(h),f=V.createInterface({input:p,crlfDelay:1/0}),d=[],n=null,t=0,y=0,i=!1,e=[],b=5;for await(let c of f){let g=c.trim();if(!g||!i&&!g.match(/^\d{2}:\d{2}/))continue;i=!0;let l=g.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/);if(l){let u=l[1]?`${l[1]}${l[2]}`:`00:${l[2]}`,v=l[3]?`${l[3]}${l[4]}`:`00:${l[4]}`;n=u;let r=s=>{let x=s.split(":"),S=parseInt(x[0]??"0",10),P=parseInt(x[1]??"0",10),T=parseFloat(x[2]??"0");return S*3600+P*60+T};t=r(u),y=r(v);continue}if(g.match(/^\d+$/))continue;let m=g.replace(/<[^>]+>/g,"").trim();m&&n&&(e.includes(m)||(d.push({timestamp:n,seconds:t,endSeconds:y,text:m}),e.push(m),e.length>b&&e.shift()))}let o=[],a=[],w=c=>{if(c.length===0)return;let g=c.map(s=>s.text).join(" "),m=_(g).sentences().out("array"),u=[],v=0,r=null;for(let s=0;s<m.length;s++){let x=m[s];if(u.length===0){let S=0,P=c[0];for(let T of c){if(S+T.text.length>=v){P=T;break}S+=T.text.length+1}r=P}u.push(x),v+=x.length+1,(u.length>=3||s===m.length-1)&&(o.push({timestamp:r.timestamp,seconds:r.seconds,text:u.join(" ")}),u=[])}};for(let c=0;c<d.length;c++){let g=d[c],l=c>0?d[c-1]:null,m=!1;if(a.length>0&&l){let u=g.seconds-l.endSeconds,v=g.seconds-a[0].seconds;(u>1.5||v>30)&&(m=!0)}m&&(w(a),a=[]),a.push(g)}return w(a),o}import U from"fs";import Y from"ejs";var G=`<!DOCTYPE html>
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
      max-width: calc(65ch + 450px + 3rem);
      margin: 0 auto;
      padding: 0 2rem;
      margin-bottom: 2rem;
      display: flex;
    }
    .header-content {
      font-size: 0.9rem;
      opacity: 0.8;
      width: 100%;
    }
    .video-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .footer-container {
      max-width: calc(65ch + 450px + 3rem);
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
      grid-template-columns: min(65ch, 100%) minmax(300px, 450px);
      gap: 3rem;
      justify-content: center;
      align-items: start;
      padding: 0 2rem;
      margin-bottom: 4rem;
    }
    .visuals-column {
      position: sticky;
      top: 2rem;
      max-height: calc(100vh - 4rem);
      display: flex;
      flex-direction: column;
      justify-content: start;
      z-index: 10;
    }
    .text-column {
      max-width: 65ch;
    }
    .bento-grid {
      display: grid;
      gap: 0.5rem;
    }
    .bento-grid[data-count="1"] { grid-template-columns: 1fr; }
    .bento-grid[data-count="2"] { grid-template-columns: 1fr 1fr; }
    .bento-grid[data-count="3"] { grid-template-columns: 1fr 1fr; }
    .bento-grid[data-count="3"] > div:first-child { grid-column: span 2; }
    .bento-grid[data-count="4"] { grid-template-columns: 1fr 1fr; }
    .bento-grid[data-count="5"] { grid-template-columns: 1fr 1fr 1fr; }
    .bento-grid[data-count="5"] > div:nth-child(4),
    .bento-grid[data-count="5"] > div:nth-child(5) { /* Last two items span the remaining row, centered */ }
    .bento-grid[data-count="6"] { grid-template-columns: 1fr 1fr 1fr; }
    
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
      border-radius: 6px;
      cursor: zoom-in;
      transition: transform 0.2s, opacity 0.2s;
      border: 1px solid rgba(128,128,128,0.12);
      opacity: 0.85;
    }
    .bento-grid button.lightbox-trigger:hover img,
    .bento-grid button.lightbox-trigger:focus img {
      transform: scale(1.02);
      opacity: 1;
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

    @media (max-width: 800px) {
      .scene, .header-container, .footer-container {
        grid-template-columns: 1fr;
        padding: 0 1.25rem;
        gap: 1.5rem;
      }
      .visuals-column {
        position: sticky;
        top: 0;
        margin-bottom: 0.5rem;
        padding-top: 1rem;
        background: var(--bg); /* To cover text scrolling underneath */
        padding-bottom: 0.5rem;
        max-height: none;
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
         const sceneImages = chapter.uniqueScenes.slice(0, 6);
    %>
      <div class="scene">
        <div class="text-column prose">
          <% chapter.paragraphs.forEach(p => { 
               const linkChar = url.includes('?') ? '&' : '?';
               const timestampUrl = \`\${url}\${linkChar}t=\${Math.floor(p.seconds)}\`;
               let timeLabel = p.timestamp.replace(/^d{2}:/, '');
               timeLabel = timeLabel.split('.')[0];
          %>
            <p><%= p.text %> <a href="<%= timestampUrl %>" target="_blank" class="anchor" title="Jump to <%= p.timestamp %>"><%= timeLabel %></a></p>
          <% }) %>
        </div>
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
`;async function R(h,p,f="YouTube Transcript"){let d=[],n=[],t=new Set;for(let i=0;i<p.length;i++){let e=p[i];n.push(e),e.sceneTimestamp&&t.add(e.sceneTimestamp);let b=p[i+1];if(b){let o=b.sceneTimestamp!==e.sceneTimestamp,a=b.sceneTimestamp,w=o&&t.size>=6&&a&&!t.has(a),c=n.length>=6&&o,g=n.length>=12,l=n[0].seconds,m=e.seconds-l>120;(w||c||g||m)&&(d.push({uniqueScenes:Array.from(t),paragraphs:n}),n=[],t=new Set)}}n.length>0&&d.push({uniqueScenes:Array.from(t),paragraphs:n});let y=Y.render(G,{url:h,chapters:d,title:f});U.writeFileSync("index.html",y,"utf-8")}import C from"os";import{execa as Z}from"execa";async function z(h){let f=C.cpus().length||1,d=Math.floor(C.freemem()/(1024*1024)),n=Math.floor(C.totalmem()/(1024*1024)),t=C.loadavg()[0]??0,y=Math.max(1,Math.min(8,Math.floor(f*.35))),i=Math.max(1,Math.floor(d/250)),e=t>f*.7?.5:1,b=Math.max(1,Math.floor(Math.min(y,i)*e));h&&h>0&&(b=h);let o=null;try{let{stdout:a}=await Z("ffmpeg",["-hwaccels"]);a.includes("cuda")?o="cuda":a.includes("vaapi")?o="vaapi":a.includes("qsv")&&(o="qsv")}catch{o=null}return{cpuCount:f,freeMemoryMb:d,totalMemoryMb:n,loadAverage:t,recommendedConcurrency:b,threadsPerWorker:1,hwaccel:o}}var E=new AbortController,D=!1,q=()=>{D&&process.exit(130),D=!0,process.stderr.write(`
`+k.yellow("Aborting and cleaning up (press Ctrl-C again to force quit)...")+`
`),E.abort()};process.on("SIGINT",q);process.on("SIGTERM",q);var W=new J;W.name("youtube.txt").description("Create a webpage from a Youtube video with a transcript paired with screenshots").requiredOption("-u, --url <url>","URL of the YouTube video").requiredOption("-o, --out <projectName>","Name of the output project folder").option("-c, --concurrency <number>","Number of parallel extraction workers (default: dynamic auto-tuning)").option("-t, --threads <number>","FFmpeg threads per worker instance (default: 1)").option("-s, --scene-threshold <number>","FFmpeg scene detection sensitivity 0-1, lower = more scenes (default: 0.15)").action(async h=>{let{out:p,url:f,concurrency:d,threads:n,sceneThreshold:t}=h;try{await O("yt-dlp",["--version"])}catch{console.error(k.red("Error: yt-dlp is not installed or not in PATH.")),process.exit(1)}try{await O("ffmpeg",["-version"])}catch{console.error(k.red("Error: ffmpeg is not installed or not in PATH.")),process.exit(1)}let y=d?parseInt(d,10):void 0,i=await z(y),e=n?parseInt(n,10):i.threadsPerWorker,b=t?parseFloat(t):.15;console.log(k.blue(`Initializing project: ${p}...`)),console.log(k.dim(`System: ${i.cpuCount} CPU cores | ${i.freeMemoryMb} MB free RAM | Load avg: ${i.loadAverage.toFixed(2)}`)),console.log(k.dim(`Dynamic allocation: ${i.recommendedConcurrency} worker pool (${e} thread/worker)`)),M.existsSync(p)||M.mkdirSync(p,{recursive:!0}),process.chdir(p),M.existsSync("images")||M.mkdirSync("images");let o=K("Downloading video and captions...").start();try{let{videoFile:a,vttFile:w}=await F(f,{signal:E.signal});o.succeed(`Downloaded video and captions: ${a}`),o.start("Parsing captions...");let c=await L(w);o.succeed(`Parsed ${c.length} paragraphs.`),o.start("Extracting frames (0%)..."),await A(a,c,{concurrency:i.recommendedConcurrency,threadsPerWorker:e,signal:E.signal,sceneThreshold:b,onProgress:(m,u)=>{let v=Math.floor(m/u*100);o.text=`Extracting frames: ${m}/${u} (${v}%) [${i.recommendedConcurrency} workers, ${e} th/w]`}}),o.succeed(`Extracted frames successfully (${c.length} paragraphs).`),o.start("Generating HTML...");let l=j.parse(a).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/,"");await R(f,c,l),o.succeed(`Done! View your webpage at ${j.join(process.cwd(),"index.html")}`)}catch(a){E.signal.aborted&&(o.fail("Process aborted."),process.exit(130)),o.fail("An error occurred during processing."),a instanceof Error&&console.error(k.red(a.message)),process.exit(1)}});W.parse(process.argv);
