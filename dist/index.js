#!/usr/bin/env node
import{Command as ge}from"commander";import F from"chalk";import{execa as Q}from"execa";import he from"ora";import R from"fs";import X from"path";import{execa as ne}from"execa";import V from"fs";async function U(p,o={}){let i=o.signal?{cancelSignal:o.signal}:{},{stdout:s}=await ne("yt-dlp",["--write-auto-subs","--write-subs",p,"--no-simulate","--print","after_move:filepath"],i),a=s.split(`
`).map(l=>l.trim()).filter(Boolean),r=a.find(l=>l.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i))||a[a.length-1],m=V.readdirSync(".").find(l=>l.endsWith(".vtt"));if(!r||!V.existsSync(r))throw new Error(`Failed to locate downloaded video file. Output was: ${s}`);if(!m)throw new Error("Failed to locate downloaded VTT subtitles (video might not have captions).");return{videoFile:r,vttFile:m}}import Y from"path";import oe from"os";import W from"fs";import{execa as B}from"execa";async function G(p,o,i={}){let{concurrency:s=4,threadsPerWorker:a=1,signal:r,onProgress:f,sceneThreshold:m=.15,dedupThreshold:l=4}=i;if(o.length===0)return;let x=[0];try{let e=r?{cancelSignal:r}:{},{stderr:t}=await B("ffmpeg",["-i",p,"-filter:v",`select='gt(scene,${m})',showinfo`,"-f","null","-"],e),c=/pts_time:([0-9.]+)/g,g;for(;(g=c.exec(t))!==null;)x.push(parseFloat(g[1]))}catch{if(r?.aborted)throw new Error("Frame extraction aborted by user")}x.sort((e,t)=>e-t);let n=new Set;for(let e of x)n.add(e);let u=5;for(let e=0;e<o.length;e++){let t=o[e],c=o[e+1],g=c?c.seconds:t.seconds+10;for(let k=t.seconds;k<g;k+=u){let E=Math.round(k*100)/100;Array.from(n).some(q=>Math.abs(q-E)<2.5)||n.add(E)}}let w=Array.from(n).sort((e,t)=>e-t);for(let e=0;e<o.length;e++){let t=o[e],c=o[e+1],g=c?c.seconds:t.seconds+10,k=w[0]??0,E=[];for(let P of w)if(P<=t.seconds)k=P;else if(P<g)E.push(P);else break;t.sceneTimestamp=String(k),t.sceneTimestamps=Array.from(new Set([k,...E])).map(String)}let d=Array.from(n),A=d.length,T=0,S=0,M=async()=>{for(;S<d.length;){if(r?.aborted)throw new Error("Frame extraction aborted by user");let e=S++,t=d[e],c=`images/${t}.jpg`;if(!W.existsSync(c)){let g=r?{cancelSignal:r}:{};await B("ffmpeg",["-y","-ss",String(t),"-nostdin","-threads",String(a),"-i",p,"-frames:v","1","-q:v","2","-vf","scale=1024:-1",c],g)}T++,f&&f(T,A)}},$=Math.max(1,Math.min(s,d.length)),v=Array.from({length:$},()=>M());await Promise.all(v),d.sort((e,t)=>e-t);let y=await W.promises.mkdtemp(Y.join(oe.tmpdir(),"yt-dhash-"));async function b(e){let t=`images/${e}.jpg`,c=Y.join(y,`${e}.raw`);await B("ffmpeg",["-i",t,"-vf","scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:-1:-1:color=black,scale=9:8,format=gray","-f","rawvideo","-y",c]);let g=await W.promises.readFile(c),k="";for(let E=0;E<8;E++)for(let P=0;P<8;P++){let q=g[E*9+P],N=g[E*9+P+1];q!==void 0&&N!==void 0&&(k+=q>N?"1":"0")}return k}function h(e,t){let c=0;for(let g=0;g<64;g++)e[g]!==t[g]&&c++;return c}let I=new Map,z=0,O=async()=>{for(;z<d.length;){if(r?.aborted)throw new Error("Frame extraction aborted by user");let e=z++,t=d[e];if(t===void 0)break;try{let c=await b(t);I.set(t,c)}catch{}}},_=Math.max(1,Math.min(s,d.length));await Promise.all(Array.from({length:_},()=>O()));let L=null,j=null,C=new Map;for(let e of d){let t=I.get(e);if(!t){C.set(e,e);continue}if(L!==null&&j!==null&&h(j,t)<=l){C.set(e,L);try{W.unlinkSync(`images/${e}.jpg`)}catch{}continue}L=e,j=t,C.set(e,e)}await W.promises.rm(y,{recursive:!0,force:!0});for(let e of o){if(e.sceneTimestamp){let t=parseFloat(e.sceneTimestamp);C.has(t)&&(e.sceneTimestamp=String(C.get(t)))}if(e.sceneTimestamps){let t=e.sceneTimestamps.map(c=>{let g=parseFloat(c);return C.has(g)?String(C.get(g)):c});e.sceneTimestamps=Array.from(new Set(t))}}}import se from"fs";import ie from"readline";import ae from"compromise";async function K(p){let o=se.createReadStream(p),i=ie.createInterface({input:o,crlfDelay:1/0}),s=[],a=null,r=0,f=0,m=!1,l=[],x=5;for await(let v of i){let y=v.trim();if(!y||!m&&!y.match(/^\d{2}:\d{2}/))continue;m=!0;let b=y.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/);if(b){let I=b[1]?`${b[1]}${b[2]}`:`00:${b[2]}`,z=b[3]?`${b[3]}${b[4]}`:`00:${b[4]}`;a=I;let O=_=>{let L=_.split(":"),j=parseInt(L[0]??"0",10),C=parseInt(L[1]??"0",10),e=parseFloat(L[2]??"0");return j*3600+C*60+e};r=O(I),f=O(z);continue}let h=y;(h.startsWith(">> ")||h.startsWith("&gt;&gt; "))&&(h="[New Speaker]: "+h.replace(/^(>>|&gt;&gt;)\s*/,"")),h=h.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'"),h=h.replace(/<[^>]+>/g,"").trim(),h&&(h=h.replace(/</g,"&lt;").replace(/>/g,"&gt;"),a&&(l.includes(h)||(s.push({timestamp:a,seconds:r,endSeconds:f,text:h}),l.push(h),l.length>x&&l.shift())))}let n=[];if(s.length===0)return n;let u=s.map(v=>v.text).join(" "),w=[],d=0;for(let v of s){let y=v.text.length;w.push({cue:v,startChar:d,endChar:d+y}),d+=y+1}let T=ae(u).sentences().out("array"),S=[],M=null,$=0;for(let v=0;v<T.length;v++){let y=T[v],b=w.find(I=>I.endChar>$)||w[w.length-1];if(!b)continue;let h=b.cue;S.length===0&&(M=h),S.push(y),$+=y.length+1,(S.length>=3||v===T.length-1)&&(n.push({timestamp:M.timestamp,seconds:M.seconds,text:S.join(" ")}),S=[])}return n}import ce from"fs";import le from"ejs";var me=`<!DOCTYPE html>
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

      // Scroll observer logic (optimized for mobile)
      const observer = new IntersectionObserver((entries) => {
        let activeEntry = null;
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
          const scenes = (p.getAttribute('data-scenes') || p.getAttribute('data-scene') || '').split(',').filter(Boolean);
          if (scenes.length === 0) return;
          
          p.classList.add('active-p', 'active-p-scroll');
          let firstImg = null;
          scenes.forEach(sceneId => {
            const img = document.getElementById('img-' + sceneId);
            if (img) {
              const grid = img.closest('.bento-grid');
              if (grid) {
                grid.classList.add('has-active', 'scroll-active');
                img.classList.add('active-scene');
                if (!firstImg) firstImg = img;
              }
            }
          });
          
          if (firstImg && window.innerWidth <= 800) {
            const grid = firstImg.closest('.bento-grid');
            if (grid) {
              const imgLeft = firstImg.offsetLeft;
              const gridWidth = grid.clientWidth;
              const imgWidth = firstImg.clientWidth;
              grid.scrollTo({
                left: imgLeft - (gridWidth / 2) + (imgWidth / 2),
                behavior: 'smooth'
              });
            }
          }
        }
      }, {
        rootMargin: '-30% 0px -50% 0px',
        threshold: [0, 0.5, 1]
      });

      // Enable scroll spy on all viewports (drives all image highlights)
      paragraphs.forEach(p => observer.observe(p));
    });
  </script>
</body>

</html>
`;function de(p){let o=[];if(p.length===0)return o;let i=[],s=new Set;for(let a=0;a<p.length;a++){let r=p[a];if(i.push(r),r.sceneTimestamps&&r.sceneTimestamps.length>0)for(let m of r.sceneTimestamps)s.add(m);else r.sceneTimestamp&&s.add(r.sceneTimestamp);let f=p[a+1];if(f){let l=(f.sceneTimestamps&&f.sceneTimestamps.length>0?f.sceneTimestamps:f.sceneTimestamp?[f.sceneTimestamp]:[]).some(A=>!s.has(A)),x=r.seconds-i[0].seconds,n=l&&s.size>=6,u=i.length>=14,w=x>180,d=l&&(i.length>=6||x>60);(n||u||w||d)&&(o.push({uniqueScenes:Array.from(s).sort((A,T)=>parseFloat(A)-parseFloat(T)),paragraphs:i}),i=[],s=new Set)}}return i.length>0&&o.push({uniqueScenes:Array.from(s).sort((a,r)=>parseFloat(a)-parseFloat(r)),paragraphs:i}),o}async function Z(p,o,i="YouTube Transcript"){let s=de(o),a=le.render(me,{url:p,chapters:s,title:i});ce.writeFileSync("index.html",a,"utf-8")}import D from"os";import{execa as pe}from"execa";async function J(p){let i=D.cpus().length||1,s=Math.floor(D.freemem()/(1024*1024)),a=Math.floor(D.totalmem()/(1024*1024)),r=D.loadavg()[0]??0,f=Math.max(1,Math.min(8,Math.floor(i*.35))),m=Math.max(1,Math.floor(s/250)),l=r>i*.7?.5:1,x=Math.max(1,Math.floor(Math.min(f,m)*l));p&&p>0&&(x=p);let n=null;try{let{stdout:u}=await pe("ffmpeg",["-hwaccels"]);u.includes("cuda")?n="cuda":u.includes("vaapi")?n="vaapi":u.includes("qsv")&&(n="qsv")}catch{n=null}return{cpuCount:i,freeMemoryMb:s,totalMemoryMb:a,loadAverage:r,recommendedConcurrency:x,threadsPerWorker:1,hwaccel:n}}var H=new AbortController,ee=!1,te=()=>{ee&&process.exit(130),ee=!0,process.stderr.write(`
`+F.yellow("Aborting and cleaning up (press Ctrl-C again to force quit)...")+`
`),H.abort()};process.on("SIGINT",te);process.on("SIGTERM",te);var re=new ge;re.name("youtube.txt").description("Create a webpage from a Youtube video with a transcript paired with screenshots").requiredOption("-u, --url <url>","URL of the YouTube video").requiredOption("-o, --out <projectName>","Name of the output project folder").option("-c, --concurrency <number>","Number of parallel extraction workers (default: dynamic auto-tuning)").option("-t, --threads <number>","FFmpeg threads per worker instance (default: 1)").option("-s, --scene-threshold <number>","FFmpeg scene detection sensitivity 0-1, lower = more scenes (default: 0.15)").action(async p=>{let{out:o,url:i,concurrency:s,threads:a,sceneThreshold:r}=p;try{await Q("yt-dlp",["--version"])}catch{console.error(F.red("Error: yt-dlp is not installed or not in PATH.")),process.exit(1)}try{await Q("ffmpeg",["-version"])}catch{console.error(F.red("Error: ffmpeg is not installed or not in PATH.")),process.exit(1)}let f=s?parseInt(s,10):void 0,m=await J(f),l=a?parseInt(a,10):m.threadsPerWorker,x=r?parseFloat(r):.15;console.log(F.blue(`Initializing project: ${o}...`)),console.log(F.dim(`System: ${m.cpuCount} CPU cores | ${m.freeMemoryMb} MB free RAM | Load avg: ${m.loadAverage.toFixed(2)}`)),console.log(F.dim(`Dynamic allocation: ${m.recommendedConcurrency} worker pool (${l} thread/worker)`)),R.existsSync(o)||R.mkdirSync(o,{recursive:!0}),process.chdir(o),R.existsSync("images")||R.mkdirSync("images");let n=he("Downloading video and captions...").start();try{let{videoFile:u,vttFile:w}=await U(i,{signal:H.signal});n.succeed(`Downloaded video and captions: ${u}`),n.start("Parsing captions...");let d=await K(w);n.succeed(`Parsed ${d.length} paragraphs.`),n.start("Extracting frames (0%)..."),await G(u,d,{concurrency:m.recommendedConcurrency,threadsPerWorker:l,signal:H.signal,sceneThreshold:x,onProgress:(S,M)=>{let $=Math.floor(S/M*100);n.text=`Extracting frames: ${S}/${M} (${$}%) [${m.recommendedConcurrency} workers, ${l} th/w]`}}),n.succeed(`Extracted frames successfully (${d.length} paragraphs).`),n.start("Generating HTML...");let T=X.parse(u).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/,"");await Z(i,d,T),n.succeed(`Done! View your webpage at ${X.join(process.cwd(),"index.html")}`)}catch(u){H.signal.aborted&&(n.fail("Process aborted."),process.exit(130)),n.fail("An error occurred during processing."),u instanceof Error&&console.error(F.red(u.message)),process.exit(1)}});re.parse(process.argv);
