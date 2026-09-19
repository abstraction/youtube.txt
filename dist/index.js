#!/usr/bin/env node
import{Command as ae}from"commander";import C from"chalk";import{execa as _}from"execa";import ce from"ora";import R from"fs";import U from"path";import{execa as Q}from"execa";import z from"fs";async function D(h,l={}){let b=l.signal?{cancelSignal:l.signal}:{},{stdout:d}=await Q("yt-dlp",["--write-auto-subs","--write-subs",h,"--no-simulate","--print","after_move:filepath"],b),s=d.split(`
`).map(r=>r.trim()).filter(Boolean),t=s.find(r=>r.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i))||s[s.length-1],a=z.readdirSync(".").find(r=>r.endsWith(".vtt"));if(!t||!z.existsSync(t))throw new Error(`Failed to locate downloaded video file. Output was: ${d}`);if(!a)throw new Error("Failed to locate downloaded VTT subtitles (video might not have captions).");return{videoFile:t,vttFile:a}}import W from"path";import X from"os";import M from"fs";import{execa as j}from"execa";async function H(h,l,b={}){let{concurrency:d=4,threadsPerWorker:s=1,signal:t,onProgress:x,sceneThreshold:a=.15}=b;if(l.length===0)return;let r=[0];try{let e=t?{cancelSignal:t}:{},{stderr:n}=await j("ffmpeg",["-i",h,"-filter:v",`select='gt(scene,${a})',showinfo`,"-f","null","-"],e),y=/pts_time:([0-9.]+)/g,w;for(;(w=y.exec(n))!==null;)r.push(parseFloat(w[1]))}catch{if(t?.aborted)throw new Error("Frame extraction aborted by user")}r.sort((e,n)=>e-n);let v=new Set;for(let e of l){let n=r[0];for(let y of r)if(y<=e.seconds)n=y;else break;e.sceneTimestamp=String(n),v.add(n)}let o=8,i=new Set;for(let e of l){let n=e.sceneTimestamp?parseFloat(e.sceneTimestamp):NaN;(isNaN(n)||Math.abs(e.seconds-n)>o)&&(i.add(e.seconds),e.sceneTimestamp=String(e.seconds))}for(let e of i)v.add(e);let g=Array.from(v),m=g.length,u=0,p=0,c=async()=>{for(;p<g.length;){if(t?.aborted)throw new Error("Frame extraction aborted by user");let e=p++,n=g[e],y=`images/${n}.jpg`;if(!M.existsSync(y)){let w=t?{cancelSignal:t}:{};await j("ffmpeg",["-y","-ss",String(n),"-nostdin","-threads",String(s),"-i",h,"-frames:v","1","-q:v","2","-vf","scale=1024:-1",y],w)}u++,x&&x(u,m)}},f=Math.max(1,Math.min(d,g.length)),k=Array.from({length:f},()=>c());await Promise.all(k),g.sort((e,n)=>e-n);let T=await M.promises.mkdtemp(W.join(X.tmpdir(),"yt-dhash-"));async function E(e){let n=`images/${e}.jpg`,y=W.join(T,`${e}.raw`);await j("ffmpeg",["-i",n,"-vf","scale=9:8,format=gray","-f","rawvideo","-y",y]);let w=await M.promises.readFile(y),O="";for(let A=0;A<8;A++)for(let $=0;$<8;$++){let Z=w[A*9+$],J=w[A*9+$+1];O+=Z>J?"1":"0"}return O}function L(e,n){let y=0;for(let w=0;w<64;w++)e[w]!==n[w]&&y++;return y}let P=null,I=null,S=new Map;for(let e of g){if(t?.aborted)throw new Error("Frame extraction aborted by user");try{let n=await E(e);if(P!==null&&I!==null&&L(I,n)<=10){S.set(e,P),M.unlinkSync(`images/${e}.jpg`);continue}P=e,I=n,S.set(e,e)}catch{S.set(e,e)}}await M.promises.rm(T,{recursive:!0,force:!0});for(let e of l)if(e.sceneTimestamp){let n=parseFloat(e.sceneTimestamp);S.has(n)&&(e.sceneTimestamp=String(S.get(n)))}}import ee from"fs";import te from"readline";import re from"compromise";async function N(h){let l=ee.createReadStream(h),b=te.createInterface({input:l,crlfDelay:1/0}),d=[],s=null,t=0,x=0,a=!1,r=[],v=5;for await(let m of b){let u=m.trim();if(!u||!a&&!u.match(/^\d{2}:\d{2}/))continue;a=!0;let p=u.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/);if(p){let f=p[1]?`${p[1]}${p[2]}`:`00:${p[2]}`,k=p[3]?`${p[3]}${p[4]}`:`00:${p[4]}`;s=f;let T=E=>{let L=E.split(":"),P=parseInt(L[0]??"0",10),I=parseInt(L[1]??"0",10),S=parseFloat(L[2]??"0");return P*3600+I*60+S};t=T(f),x=T(k);continue}if(u.match(/^\d+$/))continue;let c=u.replace(/<[^>]+>/g,"").trim();c&&(c=c.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'"),c.startsWith(">> ")&&(c="[New Speaker]: "+c.substring(3)),s&&(r.includes(c)||(d.push({timestamp:s,seconds:t,endSeconds:x,text:c}),r.push(c),r.length>v&&r.shift())))}let o=[],i=[],g=m=>{if(m.length===0)return;let u=m.map(E=>E.text).join(" "),c=re(u).sentences().out("array"),f=[],k=0,T=null;for(let E=0;E<c.length;E++){let L=c[E];if(f.length===0){let P=0,I=m[0];for(let S of m){if(P+S.text.length>=k){I=S;break}P+=S.text.length+1}T=I}f.push(L),k+=L.length+1,(f.length>=3||E===c.length-1)&&(o.push({timestamp:T.timestamp,seconds:T.seconds,text:f.join(" ")}),f=[])}};for(let m=0;m<d.length;m++){let u=d[m],p=m>0?d[m-1]:null,c=!1;if(i.length>0&&p){let f=u.seconds-p.endSeconds,k=u.seconds-i[0].seconds;(f>1.5||k>30)&&(c=!0)}c&&(g(i),i=[]),i.push(u)}return g(i),o}import ne from"fs";import oe from"ejs";var ie=`<!DOCTYPE html>
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
`;async function B(h,l,b="YouTube Transcript"){let d=[],s=[],t=new Set;for(let a=0;a<l.length;a++){let r=l[a];s.push(r),r.sceneTimestamp&&t.add(r.sceneTimestamp);let v=l[a+1];if(v){let o=v.sceneTimestamp!==r.sceneTimestamp,i=v.sceneTimestamp,g=!1;o&&(t.size>=6&&i&&!t.has(i)||s.length>=6||r.seconds-s[0].seconds>120)&&(g=!0),g&&(d.push({uniqueScenes:Array.from(t),paragraphs:s}),s=[],t=new Set)}}s.length>0&&d.push({uniqueScenes:Array.from(t),paragraphs:s});let x=oe.render(ie,{url:h,chapters:d,title:b});ne.writeFileSync("index.html",x,"utf-8")}import F from"os";import{execa as se}from"execa";async function V(h){let b=F.cpus().length||1,d=Math.floor(F.freemem()/(1024*1024)),s=Math.floor(F.totalmem()/(1024*1024)),t=F.loadavg()[0]??0,x=Math.max(1,Math.min(8,Math.floor(b*.35))),a=Math.max(1,Math.floor(d/250)),r=t>b*.7?.5:1,v=Math.max(1,Math.floor(Math.min(x,a)*r));h&&h>0&&(v=h);let o=null;try{let{stdout:i}=await se("ffmpeg",["-hwaccels"]);i.includes("cuda")?o="cuda":i.includes("vaapi")?o="vaapi":i.includes("qsv")&&(o="qsv")}catch{o=null}return{cpuCount:b,freeMemoryMb:d,totalMemoryMb:s,loadAverage:t,recommendedConcurrency:v,threadsPerWorker:1,hwaccel:o}}var q=new AbortController,Y=!1,G=()=>{Y&&process.exit(130),Y=!0,process.stderr.write(`
`+C.yellow("Aborting and cleaning up (press Ctrl-C again to force quit)...")+`
`),q.abort()};process.on("SIGINT",G);process.on("SIGTERM",G);var K=new ae;K.name("youtube.txt").description("Create a webpage from a Youtube video with a transcript paired with screenshots").requiredOption("-u, --url <url>","URL of the YouTube video").requiredOption("-o, --out <projectName>","Name of the output project folder").option("-c, --concurrency <number>","Number of parallel extraction workers (default: dynamic auto-tuning)").option("-t, --threads <number>","FFmpeg threads per worker instance (default: 1)").option("-s, --scene-threshold <number>","FFmpeg scene detection sensitivity 0-1, lower = more scenes (default: 0.15)").action(async h=>{let{out:l,url:b,concurrency:d,threads:s,sceneThreshold:t}=h;try{await _("yt-dlp",["--version"])}catch{console.error(C.red("Error: yt-dlp is not installed or not in PATH.")),process.exit(1)}try{await _("ffmpeg",["-version"])}catch{console.error(C.red("Error: ffmpeg is not installed or not in PATH.")),process.exit(1)}let x=d?parseInt(d,10):void 0,a=await V(x),r=s?parseInt(s,10):a.threadsPerWorker,v=t?parseFloat(t):.15;console.log(C.blue(`Initializing project: ${l}...`)),console.log(C.dim(`System: ${a.cpuCount} CPU cores | ${a.freeMemoryMb} MB free RAM | Load avg: ${a.loadAverage.toFixed(2)}`)),console.log(C.dim(`Dynamic allocation: ${a.recommendedConcurrency} worker pool (${r} thread/worker)`)),R.existsSync(l)||R.mkdirSync(l,{recursive:!0}),process.chdir(l),R.existsSync("images")||R.mkdirSync("images");let o=ce("Downloading video and captions...").start();try{let{videoFile:i,vttFile:g}=await D(b,{signal:q.signal});o.succeed(`Downloaded video and captions: ${i}`),o.start("Parsing captions...");let m=await N(g);o.succeed(`Parsed ${m.length} paragraphs.`),o.start("Extracting frames (0%)..."),await H(i,m,{concurrency:a.recommendedConcurrency,threadsPerWorker:r,signal:q.signal,sceneThreshold:v,onProgress:(c,f)=>{let k=Math.floor(c/f*100);o.text=`Extracting frames: ${c}/${f} (${k}%) [${a.recommendedConcurrency} workers, ${r} th/w]`}}),o.succeed(`Extracted frames successfully (${m.length} paragraphs).`),o.start("Generating HTML...");let p=U.parse(i).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/,"");await B(b,m,p),o.succeed(`Done! View your webpage at ${U.join(process.cwd(),"index.html")}`)}catch(i){q.signal.aborted&&(o.fail("Process aborted."),process.exit(130)),o.fail("An error occurred during processing."),i instanceof Error&&console.error(C.red(i.message)),process.exit(1)}});K.parse(process.argv);
