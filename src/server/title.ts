import { execa } from 'execa';

/**
 * Extracts a YouTube video ID from a URL (supports watch, shorts, embed, youtu.be).
 */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isYouTube =
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host.endsWith('.youtube.com');

    if (isYouTube) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'live', 'v'].includes(parts[0] || '')) {
        return parts[1] || null;
      }
    } else if (host === 'youtu.be' || host === 'www.youtu.be') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      return parts[0] || null;
    }
  } catch {
    // Ignore invalid URLs
  }
  return null;
}

/**
 * Fetches the video title from YouTube using yt-dlp metadata-only fetch.
 * This is fast — no download, just a metadata query.
 */
export async function fetchVideoTitle(url: string): Promise<string> {
  const { stdout } = await execa('yt-dlp', ['--print', '%(title)s', url]);
  return stdout.trim();
}

/**
 * Sanitizes a string for safe use as a filesystem directory name.
 * Strips characters invalid on Windows/Linux/macOS, collapses runs of underscores,
 * and truncates to 200 chars to avoid path length issues.
 */
export function sanitizeTitle(title: string): string {
  return (
    title
      .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^[_.]+|[_.]+$/g, '')
      .trim()
      .slice(0, 200) || 'untitled'
  );
}
