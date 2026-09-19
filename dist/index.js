#!/usr/bin/env node
import{Command as ae}from"commander";import P from"chalk";import{execa as V}from"execa";import ce from"ora";import j from"fs";import U from"path";import{execa as Q}from"execa";import R from"fs";async function D(g,a={}){let u=a.signal?{cancelSignal:a.signal}:{},{stdout:c}=await Q("yt-dlp",["--write-auto-subs","--write-subs",g,"--no-simulate","--print","after_move:filepath"],u),i=c.split(`
`).map(o=>o.trim()).filter(Boolean),r=i.find(o=>o.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i))||i[i.length-1],s=R.readdirSync(".").find(o=>o.endsWith(".vtt"));if(!r||!R.existsSync(r))throw new Error(`Failed to locate downloaded video file. Output was: ${c}`);if(!s)throw new Error("Failed to locate downloaded VTT subtitles (video might not have captions).");return{videoFile:r,vttFile:s}}import W from"path";import X from"os";import M from"fs";import{execa as z}from"execa";async function H(g,a,u={}){let{concurrency:c=4,threadsPerWorker:i=1,signal:r,onProgress:y,sceneThreshold:s=.15}=u;if(a.length===0)return;let o=[0];try{let e=r?{cancelSignal:r}:{},{stderr:t}=await z("ffmpeg",["-i",g,"-filter:v",`select='gt(scene,${s})',showinfo`,"-f","null","-"],e),m=/pts_time:([0-9.]+)/g,b;for(;(b=m.exec(t))!==null;)o.push(parseFloat(b[1]))}catch{if(r?.aborted)throw new Error("Frame extraction aborted by user")}o.sort((e,t)=>e-t);let h=new Set;for(let e of a){let t=o[0];for(let m of o)if(m<=e.seconds)t=m;else break;e.sceneTimestamp=String(t),h.add(t)}let n=8,l=new Set;for(let e of a){let t=e.sceneTimestamp?parseFloat(e.sceneTimestamp):NaN;(isNaN(t)||Math.abs(e.seconds-t)>n)&&(l.add(e.seconds),e.sceneTimestamp=String(e.seconds))}for(let e of l)h.add(e);let d=Array.from(h),w=d.length,A=0,k=0,S=async()=>{for(;k<d.length;){if(r?.aborted)throw new Error("Frame extraction aborted by user");let e=k++,t=d[e],m=`images/${t}.jpg`;if(!M.existsSync(m)){let b=r?{cancelSignal:r}:{};await z("ffmpeg",["-y","-ss",String(t),"-nostdin","-threads",String(i),"-i",g,"-frames:v","1","-q:v","2","-vf","scale=1024:-1",m],b)}A++,y&&y(A,w)}},E=Math.max(1,Math.min(c,d.length)),I=Array.from({length:E},()=>S());await Promise.all(I),d.sort((e,t)=>e-t);let f=await M.promises.mkdtemp(W.join(X.tmpdir(),"yt-dhash-"));async function v(e){let t=`images/${e}.jpg`,m=W.join(f,`${e}.raw`);await z("ffmpeg",["-i",t,"-vf","scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:-1:-1:color=black,scale=9:8,format=gray","-f","rawvideo","-y",m]);let b=await M.promises.readFile(m),$="";for(let C=0;C<8;C++)for(let F=0;F<8;F++){let Z=b[C*9+F],J=b[C*9+F+1];$+=Z>J?"1":"0"}return $}function x(e,t){let m=0;for(let b=0;b<64;b++)e[b]!==t[b]&&m++;return m}let p=null,T=null,L=new Map;for(let e of d){if(r?.aborted)throw new Error("Frame extraction aborted by user");try{let t=await v(e);if(p!==null&&T!==null&&x(T,t)<=3){L.set(e,p),M.unlinkSync(`images/${e}.jpg`);continue}p=e,T=t,L.set(e,e)}catch{L.set(e,e)}}await M.promises.rm(f,{recursive:!0,force:!0});for(let e of a)if(e.sceneTimestamp){let t=parseFloat(e.sceneTimestamp);L.has(t)&&(e.sceneTimestamp=String(L.get(t)))}}import ee from"fs";import te from"readline";import re from"compromise";async function N(g){let a=ee.createReadStream(g),u=te.createInterface({input:a,crlfDelay:1/0}),c=[],i=null,r=0,y=0,s=!1,o=[],h=5;for await(let f of u){let v=f.trim();if(!v||!s&&!v.match(/^\d{2}:\d{2}/))continue;s=!0;let x=v.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/);if(x){let T=x[1]?`${x[1]}${x[2]}`:`00:${x[2]}`,L=x[3]?`${x[3]}${x[4]}`:`00:${x[4]}`;i=T;let e=t=>{let m=t.split(":"),b=parseInt(m[0]??"0",10),$=parseInt(m[1]??"0",10),C=parseFloat(m[2]??"0");return b*3600+$*60+C};r=e(T),y=e(L);continue}if(v.match(/^\d+$/))continue;let p=v.replace(/<[^>]+>/g,"").trim();p&&(p=p.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'"),p.startsWith(">> ")&&(p="[New Speaker]: "+p.substring(3)),i&&(o.includes(p)||(c.push({timestamp:i,seconds:r,endSeconds:y,text:p}),o.push(p),o.length>h&&o.shift())))}let n=[];if(c.length===0)return n;let l=c.map(f=>f.text).join(" "),d=[],w=0;for(let f of c){let v=f.text.length;d.push({cue:f,startChar:w,endChar:w+v}),w+=v+1}let k=re(l).sentences().out("array"),S=[],E=null,I=0;for(let f=0;f<k.length;f++){let v=k[f],p=(d.find(T=>T.endChar>I)||d[d.length-1]).cue;S.length===0&&(E=p),S.push(v),I+=v.length+1,(S.length>=3||f===k.length-1)&&(n.push({timestamp:E.timestamp,seconds:E.seconds,text:S.join(" ")}),S=[])}return n}import oe from"fs";import ne from"ejs";var ie=`<!DOCTYPE html>
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
      document.querySelectorAll('.bento-grid img').forEach(img => {
        img.addEventListener('mouseenter', () => {
          const sceneId = img.id.replace('img-', '');
          document.querySelectorAll('.transcript-p[data-scene="' + sceneId + '"]').forEach(p => {
            p.classList.add('active-p');
          });
          img.classList.add('active-scene');
          const grid = img.closest('.bento-grid');
          if (grid) grid.classList.add('has-active');
        });
        img.addEventListener('mouseleave', () => {
          const sceneId = img.id.replace('img-', '');
          document.querySelectorAll('.transcript-p[data-scene="' + sceneId + '"]').forEach(p => {
            p.classList.remove('active-p');
          });
          img.classList.remove('active-scene');
          const grid = img.closest('.bento-grid');
          if (grid) grid.classList.remove('has-active');
        });
      });

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
`;async function _(g,a,u="YouTube Transcript"){let c=[],i=[],r=new Set;for(let s=0;s<a.length;s++){let o=a[s];i.push(o),o.sceneTimestamp&&r.add(o.sceneTimestamp);let h=a[s+1];if(h){let n=h.sceneTimestamp!==o.sceneTimestamp,l=h.sceneTimestamp,d=!1;n&&(r.size>=6&&l&&!r.has(l)||i.length>=6||o.seconds-i[0].seconds>120)&&(d=!0),d&&(c.push({uniqueScenes:Array.from(r),paragraphs:i}),i=[],r=new Set)}}i.length>0&&c.push({uniqueScenes:Array.from(r),paragraphs:i});let y=ne.render(ie,{url:g,chapters:c,title:u});oe.writeFileSync("index.html",y,"utf-8")}import O from"os";import{execa as se}from"execa";async function B(g){let u=O.cpus().length||1,c=Math.floor(O.freemem()/(1024*1024)),i=Math.floor(O.totalmem()/(1024*1024)),r=O.loadavg()[0]??0,y=Math.max(1,Math.min(8,Math.floor(u*.35))),s=Math.max(1,Math.floor(c/250)),o=r>u*.7?.5:1,h=Math.max(1,Math.floor(Math.min(y,s)*o));g&&g>0&&(h=g);let n=null;try{let{stdout:l}=await se("ffmpeg",["-hwaccels"]);l.includes("cuda")?n="cuda":l.includes("vaapi")?n="vaapi":l.includes("qsv")&&(n="qsv")}catch{n=null}return{cpuCount:u,freeMemoryMb:c,totalMemoryMb:i,loadAverage:r,recommendedConcurrency:h,threadsPerWorker:1,hwaccel:n}}var q=new AbortController,Y=!1,G=()=>{Y&&process.exit(130),Y=!0,process.stderr.write(`
`+P.yellow("Aborting and cleaning up (press Ctrl-C again to force quit)...")+`
`),q.abort()};process.on("SIGINT",G);process.on("SIGTERM",G);var K=new ae;K.name("youtube.txt").description("Create a webpage from a Youtube video with a transcript paired with screenshots").requiredOption("-u, --url <url>","URL of the YouTube video").requiredOption("-o, --out <projectName>","Name of the output project folder").option("-c, --concurrency <number>","Number of parallel extraction workers (default: dynamic auto-tuning)").option("-t, --threads <number>","FFmpeg threads per worker instance (default: 1)").option("-s, --scene-threshold <number>","FFmpeg scene detection sensitivity 0-1, lower = more scenes (default: 0.15)").action(async g=>{let{out:a,url:u,concurrency:c,threads:i,sceneThreshold:r}=g;try{await V("yt-dlp",["--version"])}catch{console.error(P.red("Error: yt-dlp is not installed or not in PATH.")),process.exit(1)}try{await V("ffmpeg",["-version"])}catch{console.error(P.red("Error: ffmpeg is not installed or not in PATH.")),process.exit(1)}let y=c?parseInt(c,10):void 0,s=await B(y),o=i?parseInt(i,10):s.threadsPerWorker,h=r?parseFloat(r):.15;console.log(P.blue(`Initializing project: ${a}...`)),console.log(P.dim(`System: ${s.cpuCount} CPU cores | ${s.freeMemoryMb} MB free RAM | Load avg: ${s.loadAverage.toFixed(2)}`)),console.log(P.dim(`Dynamic allocation: ${s.recommendedConcurrency} worker pool (${o} thread/worker)`)),j.existsSync(a)||j.mkdirSync(a,{recursive:!0}),process.chdir(a),j.existsSync("images")||j.mkdirSync("images");let n=ce("Downloading video and captions...").start();try{let{videoFile:l,vttFile:d}=await D(u,{signal:q.signal});n.succeed(`Downloaded video and captions: ${l}`),n.start("Parsing captions...");let w=await N(d);n.succeed(`Parsed ${w.length} paragraphs.`),n.start("Extracting frames (0%)..."),await H(l,w,{concurrency:s.recommendedConcurrency,threadsPerWorker:o,signal:q.signal,sceneThreshold:h,onProgress:(S,E)=>{let I=Math.floor(S/E*100);n.text=`Extracting frames: ${S}/${E} (${I}%) [${s.recommendedConcurrency} workers, ${o} th/w]`}}),n.succeed(`Extracted frames successfully (${w.length} paragraphs).`),n.start("Generating HTML...");let k=U.parse(l).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/,"");await _(u,w,k),n.succeed(`Done! View your webpage at ${U.join(process.cwd(),"index.html")}`)}catch(l){q.signal.aborted&&(n.fail("Process aborted."),process.exit(130)),n.fail("An error occurred during processing."),l instanceof Error&&console.error(P.red(l.message)),process.exit(1)}});K.parse(process.argv);
