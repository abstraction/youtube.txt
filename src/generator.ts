import fs from 'fs';
import ejs from 'ejs';
import { Cue } from './parser.js';

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
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    li {
      display: flex;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1.5rem;
    }
    .thumb {
      flex-shrink: 0;
      width: 288px; /* Classic size for high readability without dominating screen */
    }
    .thumb img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
    }
    .text {
      flex-grow: 1;
      max-width: 65ch; /* Optimal reading width */
    }
    .text p {
      margin: 0;
      display: inline;
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
    @media (max-width: 600px) {
      li {
        flex-direction: column;
        gap: 0.5rem;
      }
      .thumb {
        width: 100%;
        max-width: 320px;
      }
    }
  </style>
</head>
<body>
  <header>
    Source: <a href="<%= url %>" target="_blank"><%= url %></a>
  </header>
  <main>
    <ul>
    <% cues.forEach(cue => { 
        const tsFilename = cue.timestamp.replace(/:/g, '-');
        const linkChar = url.includes('?') ? '&' : '?';
        const timestampUrl = \`\${url}\${linkChar}t=\${Math.floor(cue.seconds)}\`;
    %>
      <li>
        <div class="thumb">
          <a href="<%= timestampUrl %>" target="_blank" title="Jump to <%= cue.timestamp %>">
            <img src="images/<%= tsFilename %>.jpg" alt="Frame at <%= cue.timestamp %>" loading="lazy">
          </a>
        </div>
        <div class="text">
          <p><%= cue.text %></p><a href="<%= timestampUrl %>" target="_blank" class="anchor" title="Jump to <%= cue.timestamp %>">#</a>
        </div>
      </li>
    <% }); %>
    </ul>
  </main>
</body>
</html>
`;

export async function generateHtml(url: string, cues: Cue[]): Promise<void> {
  const html = ejs.render(TEMPLATE, { url, cues });
  fs.writeFileSync('index.html', html, 'utf-8');
}
