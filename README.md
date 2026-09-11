<div align="center">
<pre>
      ▗   ▌     ▗   ▗ 
▌▌▛▌▌▌▜▘▌▌▛▌█▌  ▜▘▚▘▜▘
▙▌▙▌▙▌▐▖▙▌▙▌▙▖▗ ▐▖▞▖▐▖
▄▌                    
</pre>

YouTube you can skim.
</div>

---

Converts YouTube videos into clean, side-by-side reading documents with deduplicated transcripts and scene-detected frames.

<div align="center" style="margin: 1.5rem 0;">
  <p>
    <a href="https://abstraction.github.io/youtube.txt/"><strong>View Live Preview &rarr;</strong></a> • <a href="assets/demo.mp4">Demo Video</a>
  </p>
</div>

- **Deduplicated transcripts.** Cleans and deduplicates YouTube's rolling captions into readable paragraphs.
- **Scene detection.** Captures keyframes at visual scene cuts rather than fixed intervals.
- **Side-by-side layout.** Aligns transcript blocks next to responsive image bento grids.
- **Standalone output.** Self-contained static HTML with dark mode, an image lightbox, and timestamp jump links. 

## Requirements

You need `yt-dlp` and `ffmpeg` installed and available in your system path.

## Usage

### Global Installation (Recommended)

Build the tool and link it globally to run it from anywhere:

```bash
pnpm install
pnpm run build
pnpm add -g .
```

Now you can use it in any directory:

```bash
youtube.txt -u "https://www.youtube.com/watch?v=..." -o "project-folder"
```

### Local Execution

If you don't want to link it globally, you can run it directly from the repository using \`tsx\`:

```bash
pnpm install
pnpm run dev -u "https://www.youtube.com/watch?v=..." -o "project-folder"
```


---

Inspired by [obra's Youtube2Webpage](https://github.com/obra/Youtube2Webpage/).
