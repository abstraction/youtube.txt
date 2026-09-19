#!/usr/bin/env node
import{Command as J}from"commander";import k from"chalk";import{execa as z}from"execa";import K from"ora";import C from"fs";import q from"path";import{execa as B}from"execa";import L from"fs";async function M(u,p={}){let f=p.signal?{cancelSignal:p.signal}:{},{stdout:m}=await B("yt-dlp",["--write-auto-subs","--write-subs",u,"--no-simulate","--print","after_move:filepath"],f),i=m.split(`
`).map(e=>e.trim()).filter(Boolean),t=i.find(e=>e.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i))||i[i.length-1],a=L.readdirSync(".").find(e=>e.endsWith(".vtt"));if(!t||!L.existsSync(t))throw new Error(`Failed to locate downloaded video file. Output was: ${m}`);if(!a)throw new Error("Failed to locate downloaded VTT subtitles (video might not have captions).");return{videoFile:t,vttFile:a}}import N from"fs";import{execa as A}from"execa";async function $(u,p,f={}){let{concurrency:m=4,threadsPerWorker:i=1,signal:t,onProgress:x,sceneThreshold:a=.15}=f;if(p.length===0)return;let e=[0];try{let r=t?{cancelSignal:t}:{},{stderr:c}=await A("ffmpeg",["-i",u,"-filter:v",`select='gt(scene,${a})',showinfo`,"-f","null","-"],r),v=/pts_time:([0-9.]+)/g,S;for(;(S=v.exec(c))!==null;)e.push(parseFloat(S[1]))}catch{if(t?.aborted)throw new Error("Frame extraction aborted by user")}e.sort((r,c)=>r-c);let b=new Set;for(let r of p){let c=e[0];for(let v of e)if(v<=r.seconds)c=v;else break;r.sceneTimestamp=String(c),b.add(c)}let o=8,s=new Set;for(let r of p){let c=r.sceneTimestamp?parseFloat(r.sceneTimestamp):NaN;(isNaN(c)||Math.abs(r.seconds-c)>o)&&(s.add(r.seconds),r.sceneTimestamp=String(r.seconds))}for(let r of s)b.add(r);let y=Array.from(b),l=y.length,g=0,d=0,n=async()=>{for(;d<y.length;){if(t?.aborted)throw new Error("Frame extraction aborted by user");let r=d++,c=y[r],v=`images/${c}.jpg`;if(!N.existsSync(v)){let S=t?{cancelSignal:t}:{};await A("ffmpeg",["-y","-ss",String(c),"-nostdin","-threads",String(i),"-i",u,"-frames:v","1","-q:v","2","-vf","scale=1024:-1",v],S)}g++,x&&x(g,l)}},h=Math.max(1,Math.min(m,y.length)),w=Array.from({length:h},()=>n());await Promise.all(w)}import H from"fs";import V from"readline";import _ from"compromise";async function F(u){let p=H.createReadStream(u),f=V.createInterface({input:p,crlfDelay:1/0}),m=[],i=null,t=0,x=0,a=!1,e=[],b=5;for await(let l of f){let g=l.trim();if(!g||!a&&!g.match(/^\d{2}:\d{2}/))continue;a=!0;let d=g.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/);if(d){let h=d[1]?`${d[1]}${d[2]}`:`00:${d[2]}`,w=d[3]?`${d[3]}${d[4]}`:`00:${d[4]}`;i=h;let r=c=>{let v=c.split(":"),S=parseInt(v[0]??"0",10),T=parseInt(v[1]??"0",10),E=parseFloat(v[2]??"0");return S*3600+T*60+E};t=r(h),x=r(w);continue}if(g.match(/^\d+$/))continue;let n=g.replace(/<[^>]+>/g,"").trim();n&&(n=n.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'"),n.startsWith(">> ")&&(n="[New Speaker]: "+n.substring(3)),i&&(e.includes(n)||(m.push({timestamp:i,seconds:t,endSeconds:x,text:n}),e.push(n),e.length>b&&e.shift())))}let o=[],s=[],y=l=>{if(l.length===0)return;let g=l.map(c=>c.text).join(" "),n=_(g).sentences().out("array"),h=[],w=0,r=null;for(let c=0;c<n.length;c++){let v=n[c];if(h.length===0){let S=0,T=l[0];for(let E of l){if(S+E.text.length>=w){T=E;break}S+=E.text.length+1}r=T}h.push(v),w+=v.length+1,(h.length>=3||c===n.length-1)&&(o.push({timestamp:r.timestamp,seconds:r.seconds,text:h.join(" ")}),h=[])}};for(let l=0;l<m.length;l++){let g=m[l],d=l>0?m[l-1]:null,n=!1;if(s.length>0&&d){let h=g.seconds-d.endSeconds,w=g.seconds-s[0].seconds;(h>1.5||w>30)&&(n=!0)}n&&(y(s),s=[]),s.push(g)}return y(s),o}import U from"fs";import Y from"ejs";var G=`<!DOCTYPE html>
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
      max-width: calc(65ch + 600px + 3rem);
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
    
    .bento-grid[data-count="2"] { grid-template-columns: repeat(2, 1fr); }
    
    .bento-grid[data-count="3"] { grid-template-columns: repeat(2, 1fr); }
    .bento-grid[data-count="3"] > div:first-child { grid-column: span 2; }
    
    .bento-grid[data-count="4"] { grid-template-columns: repeat(3, 1fr); }
    .bento-grid[data-count="4"] > div:first-child { grid-column: span 3; }
    
    .bento-grid[data-count="5"] { grid-template-columns: repeat(6, 1fr); }
    .bento-grid[data-count="5"] > div:first-child { grid-column: span 4; grid-row: span 2; }
    .bento-grid[data-count="5"] > div:nth-child(2),
    .bento-grid[data-count="5"] > div:nth-child(3) { grid-column: span 2; }
    .bento-grid[data-count="5"] > div:nth-child(4),
    .bento-grid[data-count="5"] > div:nth-child(5) { grid-column: span 3; }
    
    .bento-grid[data-count="6"] { grid-template-columns: repeat(6, 1fr); }
    .bento-grid[data-count="6"] > div:first-child { grid-column: span 4; grid-row: span 2; }
    .bento-grid[data-count="6"] > div:not(:first-child) { grid-column: span 2; }
    
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
            <p data-scene="<%= p.sceneTimestamp %>" class="transcript-p"><%- p.text %> <a href="<%= timestampUrl %>" target="_blank" class="anchor" title="Jump to <%= p.timestamp %>"><%= timeLabel %></a></p>
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
            if (window.innerWidth <= 800) {
              img.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
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
`;async function R(u,p,f="YouTube Transcript"){let m=[],i=[],t=new Set;for(let a=0;a<p.length;a++){let e=p[a];i.push(e),e.sceneTimestamp&&t.add(e.sceneTimestamp);let b=p[a+1];if(b){let o=b.sceneTimestamp!==e.sceneTimestamp,s=b.sceneTimestamp,y=o&&t.size>=6&&s&&!t.has(s),l=i.length>=6&&o,g=i.length>=12,d=i[0].seconds,n=e.seconds-d>120;(y||l||g||n)&&(m.push({uniqueScenes:Array.from(t),paragraphs:i}),i=[],t=new Set)}}i.length>0&&m.push({uniqueScenes:Array.from(t),paragraphs:i});let x=Y.render(G,{url:u,chapters:m,title:f});U.writeFileSync("index.html",x,"utf-8")}import P from"os";import{execa as Z}from"execa";async function O(u){let f=P.cpus().length||1,m=Math.floor(P.freemem()/(1024*1024)),i=Math.floor(P.totalmem()/(1024*1024)),t=P.loadavg()[0]??0,x=Math.max(1,Math.min(8,Math.floor(f*.35))),a=Math.max(1,Math.floor(m/250)),e=t>f*.7?.5:1,b=Math.max(1,Math.floor(Math.min(x,a)*e));u&&u>0&&(b=u);let o=null;try{let{stdout:s}=await Z("ffmpeg",["-hwaccels"]);s.includes("cuda")?o="cuda":s.includes("vaapi")?o="vaapi":s.includes("qsv")&&(o="qsv")}catch{o=null}return{cpuCount:f,freeMemoryMb:m,totalMemoryMb:i,loadAverage:t,recommendedConcurrency:b,threadsPerWorker:1,hwaccel:o}}var I=new AbortController,j=!1,D=()=>{j&&process.exit(130),j=!0,process.stderr.write(`
`+k.yellow("Aborting and cleaning up (press Ctrl-C again to force quit)...")+`
`),I.abort()};process.on("SIGINT",D);process.on("SIGTERM",D);var W=new J;W.name("youtube.txt").description("Create a webpage from a Youtube video with a transcript paired with screenshots").requiredOption("-u, --url <url>","URL of the YouTube video").requiredOption("-o, --out <projectName>","Name of the output project folder").option("-c, --concurrency <number>","Number of parallel extraction workers (default: dynamic auto-tuning)").option("-t, --threads <number>","FFmpeg threads per worker instance (default: 1)").option("-s, --scene-threshold <number>","FFmpeg scene detection sensitivity 0-1, lower = more scenes (default: 0.15)").action(async u=>{let{out:p,url:f,concurrency:m,threads:i,sceneThreshold:t}=u;try{await z("yt-dlp",["--version"])}catch{console.error(k.red("Error: yt-dlp is not installed or not in PATH.")),process.exit(1)}try{await z("ffmpeg",["-version"])}catch{console.error(k.red("Error: ffmpeg is not installed or not in PATH.")),process.exit(1)}let x=m?parseInt(m,10):void 0,a=await O(x),e=i?parseInt(i,10):a.threadsPerWorker,b=t?parseFloat(t):.15;console.log(k.blue(`Initializing project: ${p}...`)),console.log(k.dim(`System: ${a.cpuCount} CPU cores | ${a.freeMemoryMb} MB free RAM | Load avg: ${a.loadAverage.toFixed(2)}`)),console.log(k.dim(`Dynamic allocation: ${a.recommendedConcurrency} worker pool (${e} thread/worker)`)),C.existsSync(p)||C.mkdirSync(p,{recursive:!0}),process.chdir(p),C.existsSync("images")||C.mkdirSync("images");let o=K("Downloading video and captions...").start();try{let{videoFile:s,vttFile:y}=await M(f,{signal:I.signal});o.succeed(`Downloaded video and captions: ${s}`),o.start("Parsing captions...");let l=await F(y);o.succeed(`Parsed ${l.length} paragraphs.`),o.start("Extracting frames (0%)..."),await $(s,l,{concurrency:a.recommendedConcurrency,threadsPerWorker:e,signal:I.signal,sceneThreshold:b,onProgress:(n,h)=>{let w=Math.floor(n/h*100);o.text=`Extracting frames: ${n}/${h} (${w}%) [${a.recommendedConcurrency} workers, ${e} th/w]`}}),o.succeed(`Extracted frames successfully (${l.length} paragraphs).`),o.start("Generating HTML...");let d=q.parse(s).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/,"");await R(f,l,d),o.succeed(`Done! View your webpage at ${q.join(process.cwd(),"index.html")}`)}catch(s){I.signal.aborted&&(o.fail("Process aborted."),process.exit(130)),o.fail("An error occurred during processing."),s instanceof Error&&console.error(k.red(s.message)),process.exit(1)}});W.parse(process.argv);
