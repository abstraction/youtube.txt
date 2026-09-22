import chalk from 'chalk';

function getTimestamp(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return chalk.dim(`${h}:${m}:${s}`);
}

class ServerLogger {
  private lastReportedProgress = new Map<string, number>();

  server(message: string): void {
    console.log(`${getTimestamp()} ${chalk.cyan('[Server]')} ${message}`);
  }

  queue(
    activeCount: number,
    queuedCount: number,
    freeRamMb?: number,
    loadAvg?: number
  ): void {
    const parts = [
      `${chalk.bold(String(activeCount))} active`,
      `${chalk.bold(String(queuedCount))} queued`,
    ];
    if (freeRamMb !== undefined) {
      parts.push(`RAM: ${Math.floor((freeRamMb / 1024) * 10) / 10}GB free`);
    }
    if (loadAvg !== undefined) {
      parts.push(`Load: ${loadAvg.toFixed(2)}`);
    }
    console.log(
      `${getTimestamp()} ${chalk.yellow('[Queue]')} ${parts.join(chalk.dim(' | '))}`
    );
  }

  job(jobId: string, phase: string, message: string): void {
    const tag = chalk.magenta(`[Job ${jobId}]`);
    console.log(`${getTimestamp()} ${tag} ${message}`);
  }

  progress(jobId: string, completed: number, total: number, extra = ''): void {
    const pct = Math.floor((completed / total) * 100);
    const last = this.lastReportedProgress.get(jobId) ?? -1;

    // Log at 0%, every 20%, and at 100%
    if (last === -1 || pct === 100 || pct - last >= 20) {
      this.lastReportedProgress.set(jobId, pct);
      const tag = chalk.magenta(`[Job ${jobId}]`);
      const bar = chalk.blue(
        `⚡ Extracting frames: ${pct}% (${completed}/${total})`
      );
      const note = extra ? chalk.dim(` [${extra}]`) : '';
      console.log(`${getTimestamp()} ${tag} ${bar}${note}`);
    }

    if (pct === 100) {
      this.lastReportedProgress.delete(jobId);
    }
  }

  success(jobId: string, message: string): void {
    const tag = chalk.green(`[Job ${jobId}]`);
    console.log(`${getTimestamp()} ${tag} ${chalk.green('✓')} ${message}`);
  }

  error(jobId: string | null, message: string): void {
    const tag = jobId ? chalk.red(`[Job ${jobId}]`) : chalk.red('[Error]');
    console.error(`${getTimestamp()} ${tag} ${chalk.red('✗')} ${message}`);
  }

  warn(message: string): void {
    console.warn(
      `${getTimestamp()} ${chalk.yellow('[Warn]')} ${chalk.yellow('!')} ${message}`
    );
  }
}

export const logger = new ServerLogger();
