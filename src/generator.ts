import fs from 'fs';
import ejs from 'ejs';
import type { Paragraph } from './parser.js';

const TEMPLATE = `<!DOCTYPE html>
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
               let timeLabel = p.timestamp.replace(/^\d{2}:/, '');
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
`;

export interface Chapter {
  uniqueScenes: string[];
  paragraphs: Paragraph[];
}

export function chunkParagraphs(paragraphs: Paragraph[]): Chapter[] {
  const chapters: Chapter[] = [];
  if (paragraphs.length === 0) return chapters;

  let currentChunk: Paragraph[] = [];
  let currentScenes = new Set<string>();

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]!;
    currentChunk.push(p);
    if (p.sceneTimestamps && p.sceneTimestamps.length > 0) {
      for (const st of p.sceneTimestamps) {
        currentScenes.add(st);
      }
    } else if (p.sceneTimestamp) {
      currentScenes.add(p.sceneTimestamp);
    }

    const nextP = paragraphs[i + 1];
    if (nextP) {
      const nextScenes =
        nextP.sceneTimestamps && nextP.sceneTimestamps.length > 0
          ? nextP.sceneTimestamps
          : nextP.sceneTimestamp
            ? [nextP.sceneTimestamp]
            : [];
      const isNewScene = nextScenes.some((st) => !currentScenes.has(st));

      const chunkDuration = p.seconds - currentChunk[0]!.seconds;
      const reachedMaxScenes = isNewScene && currentScenes.size >= 6;

      // Hard limits: prevent never-ending chapters even if the scene never changes
      const exceededMaxParagraphs = currentChunk.length >= 14;
      const exceededMaxDuration = chunkDuration > 180;

      // Natural limits: split at scene boundaries if we have sufficient content
      const naturalSceneBreak =
        isNewScene && (currentChunk.length >= 6 || chunkDuration > 60);

      if (
        reachedMaxScenes ||
        exceededMaxParagraphs ||
        exceededMaxDuration ||
        naturalSceneBreak
      ) {
        chapters.push({
          uniqueScenes: Array.from(currentScenes).sort(
            (a, b) => parseFloat(a) - parseFloat(b)
          ),
          paragraphs: currentChunk,
        });
        currentChunk = [];
        currentScenes = new Set<string>();
      }
    }
  }

  if (currentChunk.length > 0) {
    chapters.push({
      uniqueScenes: Array.from(currentScenes).sort(
        (a, b) => parseFloat(a) - parseFloat(b)
      ),
      paragraphs: currentChunk,
    });
  }

  return chapters;
}

export async function generateHtml(
  url: string,
  paragraphs: Paragraph[],
  title: string = 'YouTube Transcript'
): Promise<void> {
  const chapters = chunkParagraphs(paragraphs);
  const html = ejs.render(TEMPLATE, { url, chapters, title });
  fs.writeFileSync('index.html', html, 'utf-8');
}
