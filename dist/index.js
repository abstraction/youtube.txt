#!/usr/bin/env node
import{Command as ge}from"commander";import C from"chalk";import{execa as J}from"execa";import pe from"ora";import q from"fs";import Q from"path";import{execa as re}from"execa";import B from"fs";async function V(d,a={}){let s=a.signal?{cancelSignal:a.signal}:{},{stdout:n}=await re("yt-dlp",["--write-auto-subs","--write-subs",d,"--no-simulate","--print","after_move:filepath"],s),c=n.split(`
`).map(o=>o.trim()).filter(Boolean),r=c.find(o=>o.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i))||c[c.length-1],l=B.readdirSync(".").find(o=>o.endsWith(".vtt"));if(!r||!B.existsSync(r))throw new Error(`Failed to locate downloaded video file. Output was: ${n}`);if(!l)throw new Error("Failed to locate downloaded VTT subtitles (video might not have captions).");return{videoFile:r,vttFile:l}}import U from"path";import ne from"os";import A from"fs";import{execa as R}from"execa";async function Y(d,a,s={}){let{concurrency:n=4,threadsPerWorker:c=1,signal:r,onProgress:u,sceneThreshold:l=.15}=s;if(a.length===0)return;let o=[0];try{let e=r?{cancelSignal:r}:{},{stderr:t}=await R("ffmpeg",["-i",d,"-filter:v",`select='gt(scene,${l})',showinfo`,"-f","null","-"],e),h=/pts_time:([0-9.]+)/g,w;for(;(w=h.exec(t))!==null;)o.push(parseFloat(w[1]))}catch{if(r?.aborted)throw new Error("Frame extraction aborted by user")}o.sort((e,t)=>e-t);let v=new Set;for(let e of a){let t=o[0];for(let h of o)if(h<=e.seconds)t=h;else break;e.sceneTimestamp=String(t),v.add(t)}let i=8,p=new Set;for(let e of a){let t=e.sceneTimestamp?parseFloat(e.sceneTimestamp):NaN;(isNaN(t)||Math.abs(e.seconds-t)>i)&&(p.add(e.seconds),e.sceneTimestamp=String(e.seconds))}for(let e of p)v.add(e);let g=Array.from(v),x=g.length,F=0,k=0,S=async()=>{for(;k<g.length;){if(r?.aborted)throw new Error("Frame extraction aborted by user");let e=k++,t=g[e],h=`images/${t}.jpg`;if(!A.existsSync(h)){let w=r?{cancelSignal:r}:{};await R("ffmpeg",["-y","-ss",String(t),"-nostdin","-threads",String(c),"-i",d,"-frames:v","1","-q:v","2","-vf","scale=1024:-1",h],w)}F++,u&&u(F,x)}},E=Math.max(1,Math.min(n,g.length)),I=Array.from({length:E},()=>S());await Promise.all(I),g.sort((e,t)=>e-t);let f=await A.promises.mkdtemp(U.join(ne.tmpdir(),"yt-dhash-"));async function y(e){let t=`images/${e}.jpg`,h=U.join(f,`${e}.raw`);await R("ffmpeg",["-i",t,"-vf","scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:-1:-1:color=black,scale=9:8,format=gray","-f","rawvideo","-y",h]);let w=await A.promises.readFile(h),H="";for(let W=0;W<8;W++)for(let O=0;O<8;O++){let N=w[W*9+O],_=w[W*9+O+1];N!==void 0&&_!==void 0&&(H+=N>_?"1":"0")}return H}function b(e,t){let h=0;for(let w=0;w<64;w++)e[w]!==t[w]&&h++;return h}let m=new Map,T=0,D=async()=>{for(;T<g.length;){if(r?.aborted)throw new Error("Frame extraction aborted by user");let e=T++,t=g[e];if(t===void 0)break;try{let h=await y(t);m.set(t,h)}catch{}}},$=Math.max(1,Math.min(n,g.length));await Promise.all(Array.from({length:$},()=>D()));let M=null,P=null,L=new Map;for(let e of g){let t=m.get(e);if(!t){L.set(e,e);continue}if(M!==null&&P!==null&&b(P,t)<=3){L.set(e,M);try{A.unlinkSync(`images/${e}.jpg`)}catch{}continue}M=e,P=t,L.set(e,e)}await A.promises.rm(f,{recursive:!0,force:!0});for(let e of a)if(e.sceneTimestamp){let t=parseFloat(e.sceneTimestamp);L.has(t)&&(e.sceneTimestamp=String(L.get(t)))}}import oe from"fs";import ie from"readline";import se from"compromise";async function G(d){let a=oe.createReadStream(d),s=ie.createInterface({input:a,crlfDelay:1/0}),n=[],c=null,r=0,u=0,l=!1,o=[],v=5;for await(let f of s){let y=f.trim();if(!y||!l&&!y.match(/^\d{2}:\d{2}/))continue;l=!0;let b=y.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/);if(b){let T=b[1]?`${b[1]}${b[2]}`:`00:${b[2]}`,D=b[3]?`${b[3]}${b[4]}`:`00:${b[4]}`;c=T;let $=M=>{let P=M.split(":"),L=parseInt(P[0]??"0",10),e=parseInt(P[1]??"0",10),t=parseFloat(P[2]??"0");return L*3600+e*60+t};r=$(T),u=$(D);continue}let m=y;(m.startsWith(">> ")||m.startsWith("&gt;&gt; "))&&(m="[New Speaker]: "+m.replace(/^(>>|&gt;&gt;)\s*/,"")),m=m.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'"),m=m.replace(/<[^>]+>/g,"").trim(),m&&(m=m.replace(/</g,"&lt;").replace(/>/g,"&gt;"),c&&(o.includes(m)||(n.push({timestamp:c,seconds:r,endSeconds:u,text:m}),o.push(m),o.length>v&&o.shift())))}let i=[];if(n.length===0)return i;let p=n.map(f=>f.text).join(" "),g=[],x=0;for(let f of n){let y=f.text.length;g.push({cue:f,startChar:x,endChar:x+y}),x+=y+1}let k=se(p).sentences().out("array"),S=[],E=null,I=0;for(let f=0;f<k.length;f++){let y=k[f],b=g.find(T=>T.endChar>I)||g[g.length-1];if(!b)continue;let m=b.cue;S.length===0&&(E=m),S.push(y),I+=y.length+1,(S.length>=3||f===k.length-1)&&(i.push({timestamp:E.timestamp,seconds:E.seconds,text:S.join(" ")}),S=[])}return i}import ae from"fs";import ce from"ejs";var le=`<!DOCTYPE html>
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
      overflow-y: auto;
      scrollbar-width: thin;
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
    
    .bento-grid[data-count="6"] { grid-template-columns: repeat(6, 1fr); }
    .bento-grid[data-count="6"] > div:first-child { grid-column: span 4; grid-row: span 2; }
    .bento-grid[data-count="6"] > div:nth-child(2) { grid-column: span 2; }
    .bento-grid[data-count="6"] > div:nth-child(3) { grid-column: span 2; }
    .bento-grid[data-count="6"] > div:nth-child(4) { grid-column: span 2; }
    .bento-grid[data-count="6"] > div:nth-child(5) { grid-column: span 2; }
    .bento-grid[data-count="6"] > div:nth-child(6) { grid-column: span 2; }
    
    button.lightbox-trigger {
      background: none;
      border: none;
      padding: 0;
      width: 100%;
      height: 100%;
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
          // Clear previous scroll-active highlights
          document.querySelectorAll('.bento-grid.scroll-active').forEach(g => {
            g.classList.remove('has-active', 'scroll-active');
            g.querySelectorAll('.active-scene').forEach(img => img.classList.remove('active-scene'));
          });
          document.querySelectorAll('.active-p-scroll').forEach(p => p.classList.remove('active-p', 'active-p-scroll'));
          
          const p = activeEntry.target;
          const sceneId = p.getAttribute('data-scene');
          if (!sceneId) return;
          const img = document.getElementById('img-' + sceneId);
          if (img) {
            const grid = img.closest('.bento-grid');
            if (grid) {
              grid.classList.add('has-active', 'scroll-active');
              img.classList.add('active-scene');
              p.classList.add('active-p', 'active-p-scroll');
              if (window.innerWidth <= 800) {
                const imgLeft = img.offsetLeft;
                const gridWidth = grid.clientWidth;
                const imgWidth = img.clientWidth;
                grid.scrollTo({
                  left: imgLeft - (gridWidth / 2) + (imgWidth / 2),
                  behavior: 'smooth'
                });
              }
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
`;function de(d){let a=[];if(d.length===0)return a;let s=[],n=new Set;for(let c=0;c<d.length;c++){let r=d[c];s.push(r),r.sceneTimestamp&&n.add(r.sceneTimestamp);let u=d[c+1];if(u){let l=u.sceneTimestamp!==r.sceneTimestamp,o=u.sceneTimestamp,v=r.seconds-s[0].seconds,i=l&&n.size>=6&&o!==void 0&&!n.has(o),p=s.length>=14,g=v>180,x=l&&(s.length>=6||v>60);(i||p||g||x)&&(a.push({uniqueScenes:Array.from(n),paragraphs:s}),s=[],n=new Set)}}return s.length>0&&a.push({uniqueScenes:Array.from(n),paragraphs:s}),a}async function K(d,a,s="YouTube Transcript"){let n=de(a),c=ce.render(le,{url:d,chapters:n,title:s});ae.writeFileSync("index.html",c,"utf-8")}import j from"os";import{execa as me}from"execa";async function Z(d){let s=j.cpus().length||1,n=Math.floor(j.freemem()/(1024*1024)),c=Math.floor(j.totalmem()/(1024*1024)),r=j.loadavg()[0]??0,u=Math.max(1,Math.min(8,Math.floor(s*.35))),l=Math.max(1,Math.floor(n/250)),o=r>s*.7?.5:1,v=Math.max(1,Math.floor(Math.min(u,l)*o));d&&d>0&&(v=d);let i=null;try{let{stdout:p}=await me("ffmpeg",["-hwaccels"]);p.includes("cuda")?i="cuda":p.includes("vaapi")?i="vaapi":p.includes("qsv")&&(i="qsv")}catch{i=null}return{cpuCount:s,freeMemoryMb:n,totalMemoryMb:c,loadAverage:r,recommendedConcurrency:v,threadsPerWorker:1,hwaccel:i}}var z=new AbortController,X=!1,ee=()=>{X&&process.exit(130),X=!0,process.stderr.write(`
`+C.yellow("Aborting and cleaning up (press Ctrl-C again to force quit)...")+`
`),z.abort()};process.on("SIGINT",ee);process.on("SIGTERM",ee);var te=new ge;te.name("youtube.txt").description("Create a webpage from a Youtube video with a transcript paired with screenshots").requiredOption("-u, --url <url>","URL of the YouTube video").requiredOption("-o, --out <projectName>","Name of the output project folder").option("-c, --concurrency <number>","Number of parallel extraction workers (default: dynamic auto-tuning)").option("-t, --threads <number>","FFmpeg threads per worker instance (default: 1)").option("-s, --scene-threshold <number>","FFmpeg scene detection sensitivity 0-1, lower = more scenes (default: 0.15)").action(async d=>{let{out:a,url:s,concurrency:n,threads:c,sceneThreshold:r}=d;try{await J("yt-dlp",["--version"])}catch{console.error(C.red("Error: yt-dlp is not installed or not in PATH.")),process.exit(1)}try{await J("ffmpeg",["-version"])}catch{console.error(C.red("Error: ffmpeg is not installed or not in PATH.")),process.exit(1)}let u=n?parseInt(n,10):void 0,l=await Z(u),o=c?parseInt(c,10):l.threadsPerWorker,v=r?parseFloat(r):.15;console.log(C.blue(`Initializing project: ${a}...`)),console.log(C.dim(`System: ${l.cpuCount} CPU cores | ${l.freeMemoryMb} MB free RAM | Load avg: ${l.loadAverage.toFixed(2)}`)),console.log(C.dim(`Dynamic allocation: ${l.recommendedConcurrency} worker pool (${o} thread/worker)`)),q.existsSync(a)||q.mkdirSync(a,{recursive:!0}),process.chdir(a),q.existsSync("images")||q.mkdirSync("images");let i=pe("Downloading video and captions...").start();try{let{videoFile:p,vttFile:g}=await V(s,{signal:z.signal});i.succeed(`Downloaded video and captions: ${p}`),i.start("Parsing captions...");let x=await G(g);i.succeed(`Parsed ${x.length} paragraphs.`),i.start("Extracting frames (0%)..."),await Y(p,x,{concurrency:l.recommendedConcurrency,threadsPerWorker:o,signal:z.signal,sceneThreshold:v,onProgress:(S,E)=>{let I=Math.floor(S/E*100);i.text=`Extracting frames: ${S}/${E} (${I}%) [${l.recommendedConcurrency} workers, ${o} th/w]`}}),i.succeed(`Extracted frames successfully (${x.length} paragraphs).`),i.start("Generating HTML...");let k=Q.parse(p).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/,"");await K(s,x,k),i.succeed(`Done! View your webpage at ${Q.join(process.cwd(),"index.html")}`)}catch(p){z.signal.aborted&&(i.fail("Process aborted."),process.exit(130)),i.fail("An error occurred during processing."),p instanceof Error&&console.error(C.red(p.message)),process.exit(1)}});te.parse(process.argv);
