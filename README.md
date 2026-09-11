<div align="center">
<pre>
      ▗   ▌     ▗   ▗ 
▌▌▛▌▌▌▜▘▌▌▛▌█▌  ▜▘▚▘▜▘
▙▌▙▌▙▌▐▖▙▌▙▌▙▖▗ ▐▖▞▖▐▖
▄▌                    
</pre>

Read the video. See the scenes.
</div>

---

This tool converts a Youtube video into a page you can actually read and skim. 

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
