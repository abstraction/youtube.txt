#!/usr/bin/env node
import{Command as pe}from"commander";import F from"chalk";import{execa as J}from"execa";import ge from"ora";import D from"fs";import Q from"path";import{execa as re}from"execa";import N from"fs";async function V(m,n={}){let i=n.signal?{cancelSignal:n.signal}:{},{stdout:o}=await re("yt-dlp",["--write-auto-subs","--write-subs",m,"--no-simulate","--print","after_move:filepath"],i),a=o.split(`
`).map(c=>c.trim()).filter(Boolean),r=a.find(c=>c.match(/\.(webm|mp4|mkv|m4a|weba|flv)$/i))||a[a.length-1],d=N.readdirSync(".").find(c=>c.endsWith(".vtt"));if(!r||!N.existsSync(r))throw new Error(`Failed to locate downloaded video file. Output was: ${o}`);if(!d)throw new Error("Failed to locate downloaded VTT subtitles (video might not have captions).");return{videoFile:r,vttFile:d}}import U from"path";import ne from"os";import W from"fs";import{execa as H}from"execa";async function Y(m,n,i={}){let{concurrency:o=4,threadsPerWorker:a=1,signal:r,onProgress:f,sceneThreshold:d=.15}=i;if(n.length===0)return;let c=[0];try{let e=r?{cancelSignal:r}:{},{stderr:t}=await H("ffmpeg",["-i",m,"-filter:v",`select='gt(scene,${d})',showinfo`,"-f","null","-"],e),l=/pts_time:([0-9.]+)/g,g;for(;(g=l.exec(t))!==null;)c.push(parseFloat(g[1]))}catch{if(r?.aborted)throw new Error("Frame extraction aborted by user")}c.sort((e,t)=>e-t);let b=new Set;for(let e of c)b.add(e);let s=5;for(let e=0;e<n.length;e++){let t=n[e],l=n[e+1],g=l?l.seconds:t.seconds+10;for(let E=t.seconds;E<g;E+=s){let k=Math.round(E*100)/100;Array.from(b).some(q=>Math.abs(q-k)<2.5)||b.add(k)}}let u=Array.from(b).sort((e,t)=>e-t);for(let e=0;e<n.length;e++){let t=n[e],l=n[e+1],g=l?l.seconds:t.seconds+10,E=u[0]??0,k=[];for(let P of u)if(P<=t.seconds)E=P;else if(P<g)k.push(P);else break;t.sceneTimestamp=String(E),t.sceneTimestamps=Array.from(new Set([E,...k])).map(String)}let h=Array.from(b),y=h.length,A=0,S=0,T=async()=>{for(;S<h.length;){if(r?.aborted)throw new Error("Frame extraction aborted by user");let e=S++,t=h[e],l=`images/${t}.jpg`;if(!W.existsSync(l)){let g=r?{cancelSignal:r}:{};await H("ffmpeg",["-y","-ss",String(t),"-nostdin","-threads",String(a),"-i",m,"-frames:v","1","-q:v","2","-vf","scale=1024:-1",l],g)}A++,f&&f(A,y)}},I=Math.max(1,Math.min(o,h.length)),$=Array.from({length:I},()=>T());await Promise.all($),h.sort((e,t)=>e-t);let v=await W.promises.mkdtemp(U.join(ne.tmpdir(),"yt-dhash-"));async function w(e){let t=`images/${e}.jpg`,l=U.join(v,`${e}.raw`);await H("ffmpeg",["-i",t,"-vf","scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:-1:-1:color=black,scale=9:8,format=gray","-f","rawvideo","-y",l]);let g=await W.promises.readFile(l),E="";for(let k=0;k<8;k++)for(let P=0;P<8;P++){let q=g[k*9+P],_=g[k*9+P+1];q!==void 0&&_!==void 0&&(E+=q>_?"1":"0")}return E}function x(e,t){let l=0;for(let g=0;g<64;g++)e[g]!==t[g]&&l++;return l}let p=new Map,C=0,B=async()=>{for(;C<h.length;){if(r?.aborted)throw new Error("Frame extraction aborted by user");let e=C++,t=h[e];if(t===void 0)break;try{let l=await w(t);p.set(t,l)}catch{}}},j=Math.max(1,Math.min(o,h.length));await Promise.all(Array.from({length:j},()=>B()));let z=null,M=null,L=new Map;for(let e of h){let t=p.get(e);if(!t){L.set(e,e);continue}if(z!==null&&M!==null&&x(M,t)<=3){L.set(e,z);try{W.unlinkSync(`images/${e}.jpg`)}catch{}continue}z=e,M=t,L.set(e,e)}await W.promises.rm(v,{recursive:!0,force:!0});for(let e of n){if(e.sceneTimestamp){let t=parseFloat(e.sceneTimestamp);L.has(t)&&(e.sceneTimestamp=String(L.get(t)))}if(e.sceneTimestamps){let t=e.sceneTimestamps.map(l=>{let g=parseFloat(l);return L.has(g)?String(L.get(g)):l});e.sceneTimestamps=Array.from(new Set(t))}}}import oe from"fs";import se from"readline";import ie from"compromise";async function G(m){let n=oe.createReadStream(m),i=se.createInterface({input:n,crlfDelay:1/0}),o=[],a=null,r=0,f=0,d=!1,c=[],b=5;for await(let v of i){let w=v.trim();if(!w||!d&&!w.match(/^\d{2}:\d{2}/))continue;d=!0;let x=w.match(/^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/);if(x){let C=x[1]?`${x[1]}${x[2]}`:`00:${x[2]}`,B=x[3]?`${x[3]}${x[4]}`:`00:${x[4]}`;a=C;let j=z=>{let M=z.split(":"),L=parseInt(M[0]??"0",10),e=parseInt(M[1]??"0",10),t=parseFloat(M[2]??"0");return L*3600+e*60+t};r=j(C),f=j(B);continue}let p=w;(p.startsWith(">> ")||p.startsWith("&gt;&gt; "))&&(p="[New Speaker]: "+p.replace(/^(>>|&gt;&gt;)\s*/,"")),p=p.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'"),p=p.replace(/<[^>]+>/g,"").trim(),p&&(p=p.replace(/</g,"&lt;").replace(/>/g,"&gt;"),a&&(c.includes(p)||(o.push({timestamp:a,seconds:r,endSeconds:f,text:p}),c.push(p),c.length>b&&c.shift())))}let s=[];if(o.length===0)return s;let u=o.map(v=>v.text).join(" "),h=[],y=0;for(let v of o){let w=v.text.length;h.push({cue:v,startChar:y,endChar:y+w}),y+=w+1}let S=ie(u).sentences().out("array"),T=[],I=null,$=0;for(let v=0;v<S.length;v++){let w=S[v],x=h.find(C=>C.endChar>$)||h[h.length-1];if(!x)continue;let p=x.cue;T.length===0&&(I=p),T.push(w),$+=w.length+1,(T.length>=3||v===S.length-1)&&(s.push({timestamp:I.timestamp,seconds:I.seconds,text:T.join(" ")}),T=[])}return s}import ae from"fs";import ce from"ejs";var le=`<!DOCTYPE html>
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
  
    /* Active scene highlights with dynamic zoom */
    .bento-grid img {
      transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.25s ease, filter 0.25s ease, outline-color 0.25s ease;
      will-change: transform;
    }
    .bento-grid.has-active img:not(.active-scene) {
      opacity: 0.35;
      filter: grayscale(0.4);
    }
    .bento-grid.has-active img.active-scene {
      opacity: 1;
      transform: scale(1.08);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      border-color: var(--accent);
      outline: 2px solid var(--accent);
      outline-offset: -1px;
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
      
      // Hover logic: Image hover illuminates matching paragraph(s)
      document.querySelectorAll('.bento-grid img').forEach(img => {
        const sceneId = img.id.replace('img-', '');
        
        img.addEventListener('mouseenter', () => {
          document.querySelectorAll('.transcript-p').forEach(p => {
            const scenes = (p.getAttribute('data-scenes') || p.getAttribute('data-scene') || '').split(',');
            if (scenes.includes(sceneId)) {
              p.classList.add('active-p');
            }
          });
          img.classList.add('active-scene');
          const grid = img.closest('.bento-grid');
          if (grid) grid.classList.add('has-active');
        });
        
        img.addEventListener('mouseleave', () => {
          document.querySelectorAll('.transcript-p').forEach(p => {
            p.classList.remove('active-p');
          });
          img.classList.remove('active-scene');
          const grid = img.closest('.bento-grid');
          if (grid) grid.classList.remove('has-active');
        });
      });

      // Hover logic: Paragraph hover illuminates all active scene frames with dynamic zoom
      paragraphs.forEach(p => {
        p.addEventListener('mouseenter', () => {
          const scenes = (p.getAttribute('data-scenes') || p.getAttribute('data-scene') || '').split(',').filter(Boolean);
          if (scenes.length === 0) return;
          
          p.classList.add('active-p');
          scenes.forEach(sceneId => {
            const img = document.getElementById('img-' + sceneId);
            if (img) {
              img.classList.add('active-scene');
              const grid = img.closest('.bento-grid');
              if (grid) grid.classList.add('has-active');
            }
          });
        });
        
        p.addEventListener('mouseleave', () => {
          p.classList.remove('active-p');
          const scenes = (p.getAttribute('data-scenes') || p.getAttribute('data-scene') || '').split(',').filter(Boolean);
          scenes.forEach(sceneId => {
            const img = document.getElementById('img-' + sceneId);
            if (img) {
              img.classList.remove('active-scene');
              const grid = img.closest('.bento-grid');
              if (grid) grid.classList.remove('has-active');
            }
          });
        });
      });

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

      // Only enable scroll spy on mobile to avoid fighting with desktop hovers
      if (window.innerWidth <= 800) {
        paragraphs.forEach(p => observer.observe(p));
      }
    });
  </script>
</body>

</html>
`;function de(m){let n=[];if(m.length===0)return n;let i=[],o=new Set;for(let a=0;a<m.length;a++){let r=m[a];if(i.push(r),r.sceneTimestamps&&r.sceneTimestamps.length>0)for(let d of r.sceneTimestamps)o.add(d);else r.sceneTimestamp&&o.add(r.sceneTimestamp);let f=m[a+1];if(f){let c=(f.sceneTimestamps&&f.sceneTimestamps.length>0?f.sceneTimestamps:f.sceneTimestamp?[f.sceneTimestamp]:[]).some(A=>!o.has(A)),b=r.seconds-i[0].seconds,s=c&&o.size>=6,u=i.length>=14,h=b>180,y=c&&(i.length>=6||b>60);(s||u||h||y)&&(n.push({uniqueScenes:Array.from(o).sort((A,S)=>parseFloat(A)-parseFloat(S)),paragraphs:i}),i=[],o=new Set)}}return i.length>0&&n.push({uniqueScenes:Array.from(o).sort((a,r)=>parseFloat(a)-parseFloat(r)),paragraphs:i}),n}async function K(m,n,i="YouTube Transcript"){let o=de(n),a=ce.render(le,{url:m,chapters:o,title:i});ae.writeFileSync("index.html",a,"utf-8")}import O from"os";import{execa as me}from"execa";async function Z(m){let i=O.cpus().length||1,o=Math.floor(O.freemem()/(1024*1024)),a=Math.floor(O.totalmem()/(1024*1024)),r=O.loadavg()[0]??0,f=Math.max(1,Math.min(8,Math.floor(i*.35))),d=Math.max(1,Math.floor(o/250)),c=r>i*.7?.5:1,b=Math.max(1,Math.floor(Math.min(f,d)*c));m&&m>0&&(b=m);let s=null;try{let{stdout:u}=await me("ffmpeg",["-hwaccels"]);u.includes("cuda")?s="cuda":u.includes("vaapi")?s="vaapi":u.includes("qsv")&&(s="qsv")}catch{s=null}return{cpuCount:i,freeMemoryMb:o,totalMemoryMb:a,loadAverage:r,recommendedConcurrency:b,threadsPerWorker:1,hwaccel:s}}var R=new AbortController,X=!1,ee=()=>{X&&process.exit(130),X=!0,process.stderr.write(`
`+F.yellow("Aborting and cleaning up (press Ctrl-C again to force quit)...")+`
`),R.abort()};process.on("SIGINT",ee);process.on("SIGTERM",ee);var te=new pe;te.name("youtube.txt").description("Create a webpage from a Youtube video with a transcript paired with screenshots").requiredOption("-u, --url <url>","URL of the YouTube video").requiredOption("-o, --out <projectName>","Name of the output project folder").option("-c, --concurrency <number>","Number of parallel extraction workers (default: dynamic auto-tuning)").option("-t, --threads <number>","FFmpeg threads per worker instance (default: 1)").option("-s, --scene-threshold <number>","FFmpeg scene detection sensitivity 0-1, lower = more scenes (default: 0.15)").action(async m=>{let{out:n,url:i,concurrency:o,threads:a,sceneThreshold:r}=m;try{await J("yt-dlp",["--version"])}catch{console.error(F.red("Error: yt-dlp is not installed or not in PATH.")),process.exit(1)}try{await J("ffmpeg",["-version"])}catch{console.error(F.red("Error: ffmpeg is not installed or not in PATH.")),process.exit(1)}let f=o?parseInt(o,10):void 0,d=await Z(f),c=a?parseInt(a,10):d.threadsPerWorker,b=r?parseFloat(r):.15;console.log(F.blue(`Initializing project: ${n}...`)),console.log(F.dim(`System: ${d.cpuCount} CPU cores | ${d.freeMemoryMb} MB free RAM | Load avg: ${d.loadAverage.toFixed(2)}`)),console.log(F.dim(`Dynamic allocation: ${d.recommendedConcurrency} worker pool (${c} thread/worker)`)),D.existsSync(n)||D.mkdirSync(n,{recursive:!0}),process.chdir(n),D.existsSync("images")||D.mkdirSync("images");let s=ge("Downloading video and captions...").start();try{let{videoFile:u,vttFile:h}=await V(i,{signal:R.signal});s.succeed(`Downloaded video and captions: ${u}`),s.start("Parsing captions...");let y=await G(h);s.succeed(`Parsed ${y.length} paragraphs.`),s.start("Extracting frames (0%)..."),await Y(u,y,{concurrency:d.recommendedConcurrency,threadsPerWorker:c,signal:R.signal,sceneThreshold:b,onProgress:(T,I)=>{let $=Math.floor(T/I*100);s.text=`Extracting frames: ${T}/${I} (${$}%) [${d.recommendedConcurrency} workers, ${c} th/w]`}}),s.succeed(`Extracted frames successfully (${y.length} paragraphs).`),s.start("Generating HTML...");let S=Q.parse(u).name.replace(/\s\[[a-zA-Z0-9_-]+\]$/,"");await K(i,y,S),s.succeed(`Done! View your webpage at ${Q.join(process.cwd(),"index.html")}`)}catch(u){R.signal.aborted&&(s.fail("Process aborted."),process.exit(130)),s.fail("An error occurred during processing."),u instanceof Error&&console.error(F.red(u.message)),process.exit(1)}});te.parse(process.argv);
