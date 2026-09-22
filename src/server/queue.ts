import { EventEmitter } from 'node:events';

type JobFn<T> = () => Promise<T>;

interface QueueEntry {
  id: string;
  run: JobFn<void>;
  resolve: (value: void) => void;
  reject: (reason: unknown) => void;
}

export class JobQueue extends EventEmitter {
  private queue: QueueEntry[] = [];
  private activeJobs = new Map<string, QueueEntry>();
  private maxConcurrency: number;

  constructor(maxConcurrency = 2) {
    super();
    this.maxConcurrency = Math.max(1, maxConcurrency);
  }

  get size(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.activeJobs.size;
  }

  get concurrency(): number {
    return this.maxConcurrency;
  }

  setConcurrency(newLimit: number): void {
    this.maxConcurrency = Math.max(1, newLimit);
    this.drain();
  }

  isActive(id: string): boolean {
    return this.activeJobs.has(id);
  }

  enqueue(id: string, fn: JobFn<void>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ id, run: fn, resolve, reject });
      this.emit('queued', {
        id,
        position: this.queue.length,
        activeCount: this.activeJobs.size,
        queuedCount: this.queue.length,
      });
      this.drain();
    });
  }

  /**
   * Returns:
   *  0 if the job is actively running
   *  >0 (1-based index) if it is waiting in the queue
   *  -1 if not in active jobs or queue
   */
  positionOf(id: string): number {
    if (this.activeJobs.has(id)) return 0;
    const idx = this.queue.findIndex((e) => e.id === id);
    return idx === -1 ? -1 : idx + 1;
  }

  private drain(): void {
    while (
      this.activeJobs.size < this.maxConcurrency &&
      this.queue.length > 0
    ) {
      const entry = this.queue.shift();
      if (!entry) break;

      this.activeJobs.set(entry.id, entry);
      this.emit('started', {
        id: entry.id,
        activeCount: this.activeJobs.size,
        queuedCount: this.queue.length,
      });

      // Notify remaining queued jobs of their updated positions
      for (let i = 0; i < this.queue.length; i++) {
        this.emit('position', { id: this.queue[i]!.id, position: i + 1 });
      }

      // Execute runner asynchronously so other queue slots can proceed
      (async () => {
        try {
          await entry.run();
          entry.resolve();
          this.emit('completed', { id: entry.id });
        } catch (err) {
          entry.reject(err);
          this.emit('failed', { id: entry.id, error: err });
        } finally {
          this.activeJobs.delete(entry.id);
          this.drain();
        }
      })();
    }
  }
}
