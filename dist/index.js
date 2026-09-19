#!/usr/bin/env node
import{Command as J}from"commander";import k from"chalk";import{execa as z}from"execa";import K from"ora";import C from"fs";import q from"path";import{execa as B}from"execa";import I from"fs";async function M(f,p={}){let u=p.signal?{cancelSignal:p.signal}:{},{stdout:d}=await B("yt-dlp",["--write-auto-subs","--write-subs",f,"--no-simulate","--print","after_move:filepath"],u),n=d.split(`
`).map(e=>e.trim()).filter(Boolean),t=n.find(e=>e.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i))||n[n.length-1],s=I.readdirSync(".").find(e=>e.endsWith(".vtt"));if(!t||!I.existsSync(t))throw new Error(`Failed to locate downloaded video file. Output was: ${d}`);if(!s)throw new Error("Failed to locate downloaded VTT subtitles (video might not have captions).");return{videoFile:t,vttFile:s}}import N from"fs";import{execa as A}from"execa";async function $(f,p,u={}){let{concurrency:d=4,threadsPerWorker:n=1,signal:t,onProgress:x,sceneThreshold:s=.15}=u;if(p.length===0)return;let e=[0];try{let r=t?{cancelSignal:t}:{},{stderr:a}=await A("ffmpeg",["-i",f,"-filter:v",`select='gt(scene,${s})',showinfo`,"-f","null","-"],r),v=/pts_time:([0-9.]+)/g,S;for(;(S=v.exec(a))!==null;)e.push(parseFloat(S[1]))}catch{if(t?.aborted)throw new Error("Frame extraction aborted by user")}e.sort((r,a)=>r-a);let b=new Set;for(let r of p){let a=e[0];for(let v of e)if(v<=r.seconds)a=v;else break;r.sceneTimestamp=String(a),b.add(a)}let o=8,i=new Set;for(let r of p){let a=r.sceneTimestamp?parseFloat(r.sceneTimestamp):NaN;(isNaN(a)||Math.abs(r.seconds-a)>o)&&(i.add(r.seconds),r.sceneTimestamp=String(r.seconds))}for(let r of i)b.add(r);let y=Array.from(b),c=y.length,g=0,l=0,m=async()=>{for(;l<y.length;){if(t?.aborted)throw new Error("Frame extraction aborted by user");let r=l++,a=y[r],v=`images/${a}.jpg`;if(!N.existsSync(v)){let S=t?{cancelSignal:t}:{};await A("ffmpeg",["-y","-ss",String(a),"-nostdin","-threads",String(n),"-i",f,"-frames:v","1","-q:v","2","-vf","scale=1024:-1",v],S)}g++,x&&x(g,c)}},h=Math.max(1,Math.min(d,y.length)),w=Array.from({length:h},()=>m());await Promise.all(w)}import H from"fs";import V from"readline";import _ from"compromise";async function F(f){let p=H.createReadStream(f),u=V.createInterface({input:p,crlfDelay:1/0}),d=[],n=null,t=0,x=0,s=!1,e=[],b=5;for await(let c of u){let g=c.trim();if(!g||!s&&!g.match(/^\d{2}:\d{2}/))continue;s=!0;let l=g.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/);if(l){let h=l[1]?`${l[1]}${l[2]}`:`00:${l[2]}`,w=l[3]?`${l[3]}${l[4]}`:`00:${l[4]}`;n=h;let r=a=>{let v=a.split(":"),S=parseInt(v[0]??"0",10),T=parseInt(v[1]??"0",10),E=parseFloat(v[2]??"0");return S*3600+T*60+E};t=r(h),x=r(w);continue}if(g.match(/^\d+$/))continue;let m=g.replace(/<[^>]+>/g,"").trim();m&&n&&(e.includes(m)||(d.push({timestamp:n,seconds:t,endSeconds:x,text:m}),e.push(m),e.length>b&&e.shift()))}let o=[],i=[],y=c=>{if(c.length===0)return;let g=c.map(a=>a.text).join(" "),m=_(g).sentences().out("array"),h=[],w=0,r=null;for(let a=0;a<m.length;a++){let v=m[a];if(h.length===0){let S=0,T=c[0];for(let E of c){if(S+E.text.length>=w){T=E;break}S+=E.text.length+1}r=T}h.push(v),w+=v.length+1,(h.length>=3||a===m.length-1)&&(o.push({timestamp:r.timestamp,seconds:r.seconds,text:h.join(" ")}),h=[])}};for(let c=0;c<d.length;c++){let g=d[c],l=c>0?d[c-1]:null,m=!1;if(i.length>0&&l){let h=g.seconds-l.endSeconds,w=g.seconds-i[0].seconds;(h>1.5||w>30)&&(m=!0)}m&&(y(i),i=[]),i.push(g)}return y(i),o}import U from"fs";import Y from"ejs";var G=`<!DOCTYPE html>
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
  
    /* Active scene highlights */
    .bento-grid img {
      transition: opacity 0.3s ease, transform 0.3s ease, filter 0.3s ease;
    }
    .bento-grid.has-active img:not(.active-scene) {
      opacity: 0.4;
      filter: grayscale(0.5);
    }
    .bento-grid.has-active img.active-scene {
      opacity: 1;
      transform: scale(1.03);
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      border-color: var(--accent);
      z-index: 10;
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
            <p data-scene="<%= p.sceneTimestamp %>" class="transcript-p"><%= p.text %> <a href="<%= timestampUrl %>" target="_blank" class="anchor" title="Jump to <%= p.timestamp %>"><%= timeLabel %></a></p>
          <% }) %>
        </div>
        <div class="visuals-column">
          <div class="bento-container">
            <div class="bento-grid" data-count="<%= sceneImages.length %>">
              <% sceneImages.forEach(sceneTs => { %>
                <div>
                  <button type="button" class="lightbox-trigger" aria-haspopup="dialog" aria-label="Video frame at <%= sceneTs %>s">
                    <img id="img-<%= sceneTs %>" src="images/<%= sceneTs %>.jpg" alt="Video frame at <%= sceneTs %>s" loading="lazy">
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

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const paragraphs = document.querySelectorAll('.transcript-p');
      
      // Hover logic
      paragraphs.forEach(p => {
        p.addEventListener('mouseenter', () => {
          const sceneId = p.getAttribute('data-scene');
          if (!sceneId) return;
          const img = document.getElementById('img-' + sceneId);
          if (img) {
            const grid = img.closest('.bento-grid');
            grid.classList.add('has-active');
            img.classList.add('active-scene');
            p.classList.add('active-p');
          }
        });
        
        p.addEventListener('mouseleave', () => {
          const sceneId = p.getAttribute('data-scene');
          if (!sceneId) return;
          const img = document.getElementById('img-' + sceneId);
          if (img) {
            const grid = img.closest('.bento-grid');
            grid.classList.remove('has-active');
            img.classList.remove('active-scene');
            p.classList.remove('active-p');
          }
        });
      });

      // Scroll observer logic (optional but good for mobile)
      const observer = new IntersectionObserver((entries) => {
        let activeEntry = null;
        // Find the most visible intersecting entry
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (!activeEntry || entry.intersectionRatio > activeEntry.intersectionRatio) {
              activeEntry = entry;
            }
          }
        });
        
        if (activeEntry) {
          // Clear previous scroll-active
          document.querySelectorAll('.bento-grid.scroll-active').forEach(g => {
            if (!g.matches(':hover') && !g.closest('.scene').matches(':hover')) {
               g.classList.remove('has-active', 'scroll-active');
               g.querySelectorAll('.active-scene').forEach(img => img.classList.remove('active-scene'));
            }
          });
          document.querySelectorAll('.active-p-scroll').forEach(p => p.classList.remove('active-p', 'active-p-scroll'));
          
          const p = activeEntry.target;
          const sceneId = p.getAttribute('data-scene');
          if (!sceneId) return;
          const img = document.getElementById('img-' + sceneId);
          if (img) {
            const grid = img.closest('.bento-grid');
            grid.classList.add('has-active', 'scroll-active');
            img.classList.add('active-scene');
            p.classList.add('active-p', 'active-p-scroll');
          }
        }
      }, {
        rootMargin: '-30% 0px -50% 0px', // Trigger when paragraph is near center of screen
        threshold: [0, 0.5, 1]
      });

      // Only enable scroll spy on mobile to avoid fighting with desktop hovers
      if (window.innerWidth <= 800) {
        paragraphs.forEach(p => observer.observe(p));
      }
    });
  </script>
</body>

</html>
`;async function R(f,p,u="YouTube Transcript"){let d=[],n=[],t=new Set;for(let s=0;s<p.length;s++){let e=p[s];n.push(e),e.sceneTimestamp&&t.add(e.sceneTimestamp);let b=p[s+1];if(b){let o=b.sceneTimestamp!==e.sceneTimestamp,i=b.sceneTimestamp,y=o&&t.size>=6&&i&&!t.has(i),c=n.length>=6&&o,g=n.length>=12,l=n[0].seconds,m=e.seconds-l>120;(y||c||g||m)&&(d.push({uniqueScenes:Array.from(t),paragraphs:n}),n=[],t=new Set)}}n.length>0&&d.push({uniqueScenes:Array.from(t),paragraphs:n});let x=Y.render(G,{url:f,chapters:d,title:u});U.writeFileSync("index.html",x,"utf-8")}import P from"os";import{execa as Z}from"execa";async function O(f){let u=P.cpus().length||1,d=Math.floor(P.freemem()/(1024*1024)),n=Math.floor(P.totalmem()/(1024*1024)),t=P.loadavg()[0]??0,x=Math.max(1,Math.min(8,Math.floor(u*.35))),s=Math.max(1,Math.floor(d/250)),e=t>u*.7?.5:1,b=Math.max(1,Math.floor(Math.min(x,s)*e));f&&f>0&&(b=f);let o=null;try{let{stdout:i}=await Z("ffmpeg",["-hwaccels"]);i.includes("cuda")?o="cuda":i.includes("vaapi")?o="vaapi":i.includes("qsv")&&(o="qsv")}catch{o=null}return{cpuCount:u,freeMemoryMb:d,totalMemoryMb:n,loadAverage:t,recommendedConcurrency:b,threadsPerWorker:1,hwaccel:o}}var L=new AbortController,j=!1,D=()=>{j&&process.exit(130),j=!0,process.stderr.write(`
`+k.yellow("Aborting and cleaning up (press Ctrl-C again to force quit)...")+`
`),L.abort()};process.on("SIGINT",D);process.on("SIGTERM",D);var W=new J;W.name("youtube.txt").description("Create a webpage from a Youtube video with a transcript paired with screenshots").requiredOption("-u, --url <url>","URL of the YouTube video").requiredOption("-o, --out <projectName>","Name of the output project folder").option("-c, --concurrency <number>","Number of parallel extraction workers (default: dynamic auto-tuning)").option("-t, --threads <number>","FFmpeg threads per worker instance (default: 1)").option("-s, --scene-threshold <number>","FFmpeg scene detection sensitivity 0-1, lower = more scenes (default: 0.15)").action(async f=>{let{out:p,url:u,concurrency:d,threads:n,sceneThreshold:t}=f;try{await z("yt-dlp",["--version"])}catch{console.error(k.red("Error: yt-dlp is not installed or not in PATH.")),process.exit(1)}try{await z("ffmpeg",["-version"])}catch{console.error(k.red("Error: ffmpeg is not installed or not in PATH.")),process.exit(1)}let x=d?parseInt(d,10):void 0,s=await O(x),e=n?parseInt(n,10):s.threadsPerWorker,b=t?parseFloat(t):.15;console.log(k.blue(`Initializing project: ${p}...`)),console.log(k.dim(`System: ${s.cpuCount} CPU cores | ${s.freeMemoryMb} MB free RAM | Load avg: ${s.loadAverage.toFixed(2)}`)),console.log(k.dim(`Dynamic allocation: ${s.recommendedConcurrency} worker pool (${e} thread/worker)`)),C.existsSync(p)||C.mkdirSync(p,{recursive:!0}),process.chdir(p),C.existsSync("images")||C.mkdirSync("images");let o=K("Downloading video and captions...").start();try{let{videoFile:i,vttFile:y}=await M(u,{signal:L.signal});o.succeed(`Downloaded video and captions: ${i}`),o.start("Parsing captions...");let c=await F(y);o.succeed(`Parsed ${c.length} paragraphs.`),o.start("Extracting frames (0%)..."),await $(i,c,{concurrency:s.recommendedConcurrency,threadsPerWorker:e,signal:L.signal,sceneThreshold:b,onProgress:(m,h)=>{let w=Math.floor(m/h*100);o.text=`Extracting frames: ${m}/${h} (${w}%) [${s.recommendedConcurrency} workers, ${e} th/w]`}}),o.succeed(`Extracted frames successfully (${c.length} paragraphs).`),o.start("Generating HTML...");let l=q.parse(i).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/,"");await R(u,c,l),o.succeed(`Done! View your webpage at ${q.join(process.cwd(),"index.html")}`)}catch(i){L.signal.aborted&&(o.fail("Process aborted."),process.exit(130)),o.fail("An error occurred during processing."),i instanceof Error&&console.error(k.red(i.message)),process.exit(1)}});W.parse(process.argv);
