import { execa } from 'execa';

/**
 * Automatically opens the target URL in the user's default web browser
 * using OS-level commands (xdg-open on Linux, open on macOS, start on Windows).
 * Returns true if command launched successfully, false if failed (e.g. headless / no GUI).
 */
export async function openInBrowser(url: string): Promise<boolean> {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      await execa('open', [url]);
      return true;
    }
    if (platform === 'win32') {
      await execa('cmd.exe', ['/c', 'start', '""', url]);
      return true;
    }
    // Linux / BSD / Unix
    await execa('xdg-open', [url]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends an OS-level desktop notification (e.g. notify-send on Linux).
 * Best-effort: silently completes if notification daemon is absent.
 */
export async function sendDesktopNotification(
  title: string,
  message: string
): Promise<void> {
  const platform = process.platform;
  try {
    if (platform === 'linux') {
      await execa('notify-send', ['-a', 'youtube.txt', title, message]);
    } else if (platform === 'darwin') {
      await execa('osascript', [
        '-e',
        `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`,
      ]);
    }
  } catch {
    // Non-fatal if desktop notification daemon is not available
  }
}
