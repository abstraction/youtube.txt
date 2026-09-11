<div align="center">
<pre>
      ▗   ▌     ▗   ▗ 
▌▌▛▌▌▌▜▘▌▌▛▌█▌  ▜▘▚▘▜▘
▙▌▙▌▙▌▐▖▙▌▙▌▙▖▗ ▐▖▞▖▐▖
▄▌                    
</pre>

Read YouTube like you a bookworm.
</div>

---

This tool downloads a YouTube video and its captions and turns them into a static HTML page. 

Watching a 40-minute video to find one specific detail wastes time. A static page lets you read at your own speed. You can use Ctrl+F. You can skim the thumbnails. 

This is a TypeScript port inspired by [obra's Youtube2Webpage](https://github.com/obra/Youtube2Webpage/).

It forces a 65-character line width and strips out all borders and shadows. The thumbnails sit out of the way on the left. The jump links are just a faded `#` symbol. Every choice optimizes for reading speed. 

Future work includes adding userscript support to trigger the script directly from the YouTube page.

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
