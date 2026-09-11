import fs from 'fs';
import ejs from 'ejs';
import type { Paragraph } from './parser.js';

const TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube Transcript</title>
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
      margin: 0 auto;
      padding: 1rem 1rem 3rem 1rem;
      max-width: 960px;
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
    header {
      margin-bottom: 2rem;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    .reading-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 2rem;
      align-items: start;
    }
    .visuals-column {
      position: sticky;
      top: 2rem;
    }
    .text-column {
      max-width: 65ch;
    }
    .bento-grid {
      display: grid;
      gap: 0.5rem;
      grid-template-columns: 1fr;
    }
    .bento-grid[data-count="2"] {
      grid-template-columns: 1fr;
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
    .bento-grid[data-count="4"] > div:first-child {
      grid-column: span 2;
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
      object-fit: cover;
      display: block;
      border-radius: 8px;
      cursor: pointer;
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
      .reading-layout {
        grid-template-columns: 1fr;
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
  <header>
    Source: <a href="<%= url %>" target="_blank"><%= url %></a>
  </header>
  <main>
    <div class="reading-layout">
      <div class="visuals-column">
        <div class="bento-container">
          <div class="bento-grid" id="dynamic-bento">
            <!-- Rendered by JS -->
          </div>
        </div>
      </div>
      <div class="text-column prose">
        <% chapters.forEach(chapter => { 
             const sceneImages = chapter.uniqueScenes.slice(0, 4).map(ts => ({ src: \`images/\${ts}.jpg\`, alt: \`Video frame at \${ts}s\` }));
        %>
          <% chapter.paragraphs.forEach((p, idx) => { 
               const linkChar = url.includes('?') ? '&' : '?';
               const timestampUrl = \`\${url}\${linkChar}t=\${Math.floor(p.seconds)}\`;
               let timeLabel = p.timestamp.replace(/^\\d{2}:/, '');
               timeLabel = timeLabel.split('.')[0];
               const dataAttr = (idx === 0 && sceneImages.length > 0) ? \` data-scene-images='\${JSON.stringify(sceneImages)}'\` : '';
          %>
            <p<%- dataAttr %>><%= p.text %> <a href="<%= timestampUrl %>" target="_blank" class="anchor" title="Jump to <%= p.timestamp %>"><%= timeLabel %></a></p>
          <% }) %>
        <% }) %>
      </div>
    </div>
  </main>

  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Image fullscreen view">
    <img src="" id="lightbox-img">
  </div>
  
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const bentoGrid = document.getElementById('dynamic-bento');
      const lightbox = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightbox-img');
      
      function renderImages(images) {
        bentoGrid.setAttribute('data-count', images.length);
        bentoGrid.innerHTML = '';
        images.forEach(img => {
          const div = document.createElement('div');
          
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'lightbox-trigger';
          btn.setAttribute('aria-haspopup', 'dialog');
          btn.setAttribute('aria-label', img.alt);
          
          const image = document.createElement('img');
          image.src = img.src;
          image.alt = img.alt;
          image.loading = 'lazy';
          
          btn.appendChild(image);
          div.appendChild(btn);
          bentoGrid.appendChild(div);
          
          btn.addEventListener('click', () => {
            if (lightbox && lightboxImg) {
              lightboxImg.src = image.src;
              lightbox.classList.add('active');
            }
          });
        });
      }

      const firstP = document.querySelector('p[data-scene-images]');
      if (firstP) {
        renderImages(JSON.parse(firstP.getAttribute('data-scene-images')));
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const imgs = JSON.parse(entry.target.getAttribute('data-scene-images'));
            renderImages(imgs);
          }
        });
      }, { rootMargin: '-10% 0px -80% 0px' });
      
      document.querySelectorAll('p[data-scene-images]').forEach(p => observer.observe(p));
      
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
\`;

export async function generateHtml(url: string, paragraphs: Paragraph[]): Promise<void> {
  const chapters: { uniqueScenes: string[], paragraphs: Paragraph[] }[] = [];
  
  for (let i = 0; i < paragraphs.length; i += 3) {
    const chunk = paragraphs.slice(i, i + 3);
    const uniqueScenes = Array.from(new Set(chunk.map(p => p.sceneTimestamp).filter(Boolean))) as string[];
    
    chapters.push({
      uniqueScenes,
      paragraphs: chunk
    });
  }

  const html = ejs.render(TEMPLATE, { url, chapters });
  fs.writeFileSync('index.html', html, 'utf-8');
}
