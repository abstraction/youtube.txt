<div align="center">
<p>
  <img src="./logo.svg" alt="youtube.txt" height="80">
</p>

Convert YouTube videos into static, readable HTML with transcripts and scene-detected frames.
</div>

<div align="center" style="margin: 2rem 0;">
  <video src="https://github.com/user-attachments/assets/012bb00d-2e57-4b40-a8d7-e7bacccf8d88" width="600"></video>
  <p>
    <a href="https://abstraction.github.io/youtube.txt/">View live demo &rarr;</a>
  </p>
</div>

## Features

- Produces a single, self-contained HTML file with zero runtime JavaScript libraries. It loads instantly and works offline.
- Keeps text measure at 65ch on the left with a sticky 1 to 6 frame image grid on the right.
- Shows monospace timestamp tags on each frame for quick cross-referencing with text.
- Pausing over a frame for 750ms highlights its matching paragraph. Scrolling clears the highlight.
- Click any image to enlarge it; scroll to dismiss.
- Perceptual difference hashing (dHash) prunes repetitive talking-head shots while keeping slide changes and product reveals.
- Saves cuts and B-roll that appear while a sentence is being spoken.
- Takes a frame every 5 seconds during continuous uninterrupted speech.
- Removes rolling caption duplicates, decodes HTML entities, and marks speaker changes.
- Switches to a single column with horizontal scroll-snap carousels on viewports under 800px.

## Requirements

Requires `yt-dlp` and `ffmpeg` in your `PATH`.

```bash
# macOS
brew install yt-dlp ffmpeg

# Arch Linux
sudo pacman -S yt-dlp ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

## Usage

### Run directly

Use `pnpm dlx` or `npx` without installing globally:

```bash
# pnpm
pnpm dlx github:abstraction/youtube.txt -u "https://www.youtube.com/watch?v=..." -o "output-folder"

# npm
npx github:abstraction/youtube.txt -u "https://www.youtube.com/watch?v=..." -o "output-folder"
```

### Install globally

```bash
git clone https://github.com/abstraction/youtube.txt.git
cd youtube.txt
pnpm install
pnpm run build
pnpm add -g .
```

Run from any directory:

```bash
youtube.txt -u "https://www.youtube.com/watch?v=..." -o "output-folder"
```

### Local development

```bash
pnpm install
pnpm run dev -u "https://www.youtube.com/watch?v=..." -o "output-folder"
```

## CLI options

```
Usage: youtube.txt [options]

Options:
  -u, --url <url>                YouTube video URL (required)
  -o, --out <projectName>        Output directory name (required)
  -c, --concurrency <number>     Parallel extraction workers (default: dynamic auto-tuning)
  -t, --threads <number>         FFmpeg threads per worker (default: 1)
  -s, --scene-threshold <number> Scene detection sensitivity 0-1 (default: 0.15, lower = more scenes)
  -h, --help                     Show help
```

### Examples

Default run with automatic resource tuning:

```bash
youtube.txt -u "https://www.youtube.com/watch?v=Od6M0AXpcxQ" -o "review"
```

Higher concurrency for long videos:

```bash
youtube.txt -u "https://www.youtube.com/watch?v=..." -o "lecture" -c 16 -t 2
```

More frequent scene captures:

```bash
youtube.txt -u "https://www.youtube.com/watch?v=..." -o "tutorial" -s 0.08
```

## Pipeline

```mermaid
flowchart TD
    A[YouTube URL] --> B[Downloader]
    B --> |yt-dlp single pass| C(Video and VTT)

    C --> D[Parser]
    D --> |NLP sentence boundaries| E(Paragraphs)

    C --> F[Extractor]
    E --> F
    F --> |O1 seek and dynamic pool| G(Raw Frames)
    G --> |Aspect-safe dHash| H(Deduplicated Scenes)

    H --> I[Generator]
    E --> I
    I --> |Semantic chunking| J[index.html]
```

1. `src/downloader.ts` runs `yt-dlp` in a single pass to fetch video and subtitles together.
2. `src/parser.ts` cleans rolling caption duplicates, decodes entities, and groups sentences into paragraphs.
3. `src/extractor.ts` runs parallel frame extraction, 5s fallback sampling, and 64-bit dHash deduplication.
4. `src/generator.ts` chunks content into chapters and renders standalone static HTML.

---

Inspired by [obra's Youtube2Webpage](https://github.com/obra/Youtube2Webpage/).
