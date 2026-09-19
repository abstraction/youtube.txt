<div align="center">
<pre>
      ▗   ▌     ▗   ▗ 
▌▌▛▌▌▌▜▘▌▌▛▌█▌  ▜▘▚▘▜▘
▙▌▙▌▙▌▐▖▙▌▙▌▙▖▗ ▐▖▞▖▐▖
▄▌                    
</pre>

Youtube you can skim.
</div>

---

### Overview

Convert Youtube videos into clean reading documents with transcripts and scene-detected frames.

<div align="center" style="margin: 2rem 0;">
  <video src="https://github.com/user-attachments/assets/012bb00d-2e57-4b40-a8d7-e7bacccf8d88" width="600"></video>
  <p>
    <a href="https://abstraction.github.io/youtube.txt/">View Live Example Preview &rarr;</a>
  </p>
</div>

### Requirements

You need `yt-dlp` and `ffmpeg` installed and available in your system path.

### Usage

#### Remote Execution (Zero Install)

You can run `youtube.txt` directly from GitHub without cloning the repository or installing anything globally.

```bash
# Using pnpm (Recommended)
pnpm dlx github:abstraction/youtube.txt -u "https://www.youtube.com/watch?v=..." -o "project-folder"

# Using npm
npx github:abstraction/youtube.txt -u "https://www.youtube.com/watch?v=..." -o "project-folder"
```

#### Global Installation

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

#### Local Execution

If you don't want to link it globally, you can run it directly from the repository using `tsx`:

```bash
pnpm install
pnpm run dev -u "https://www.youtube.com/watch?v=..." -o "project-folder"
```

---

Inspired by [obra's Youtube2Webpage](https://github.com/obra/Youtube2Webpage/).
