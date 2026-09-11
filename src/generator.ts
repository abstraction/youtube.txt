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
      --bg: #ffffff;
      --text: #222222;
      --link: #065fd4;
      --link-hover: #00368a;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f0f0f;
        --text: #f1f1f1;
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
    .scene {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 2rem;
      margin-bottom: 3rem;
    }
    .bento-grid {
      position: sticky;
      top: 1rem;
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
    
    .bento-grid img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      border-radius: 6px;
      cursor: pointer;
      transition: transform 0.2s;
      border: 1px solid rgba(128,128,128,0.2);
    }
    .bento-grid img:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .prose p {
      margin: 0 0 1rem 0;
      max-width: 65ch;
    }
    .anchor {
      color: var(--link);
      margin-left: 0.5rem;
      font-weight: bold;
      opacity: 0.4;
      transition: opacity 0.2s;
    }
    .anchor:hover {
      opacity: 1;
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
      .scene {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      .bento-grid {
        position: relative;
        top: 0;
      }
    }
  </style>
</head>
<body>
  <header>
    Source: <a href="<%= url %>" target="_blank"><%= url %></a>
  </header>
  <main>
    <% chapters.forEach(chapter => { %>
      <div class="scene">
        <div class="bento-container">
          <div class="bento-grid" data-count="<%= Math.min(chapter.uniqueScenes.length, 4) %>">
            <% chapter.uniqueScenes.slice(0, 4).forEach(sceneTs => { %>
              <div>
                <img src="images/<%= sceneTs %>.jpg" alt="Frame" loading="lazy" class="lightbox-trigger">
              </div>
            <% }) %>
          </div>
        </div>
        <div class="prose">
          <% chapter.paragraphs.forEach(p => { 
               const linkChar = url.includes('?') ? '&' : '?';
               const timestampUrl = \`\${url}\${linkChar}t=\${Math.floor(p.seconds)}\`;
          %>
            <p><%= p.text %> <a href="<%= timestampUrl %>" target="_blank" class="anchor" title="Jump to <%= p.timestamp %>">#</a></p>
          <% }) %>
        </div>
      </div>
    <% }) %>
  </main>

  <div class="lightbox" id="lightbox">
    <img src="" id="lightbox-img">
  </div>
  
  <script>
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    
    document.querySelectorAll('.lightbox-trigger').forEach(img => {
      img.addEventListener('click', (e) => {
        lightboxImg.src = e.target.src;
        lightbox.classList.add('active');
      });
    });
    
    lightbox.addEventListener('click', () => {
      lightbox.classList.remove('active');
    });
  </script>
</body>
</html>
`;

export async function generateHtml(url: string, paragraphs: Paragraph[]): Promise<void> {
  const chapters: { uniqueScenes: string[], paragraphs: Paragraph[] }[] = [];
  
  // Group every 3 paragraphs into a "Chapter" to create consistent text blocks.
  // We collect the unique FFmpeg scene cuts (sceneTimestamp) within that chapter.
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
