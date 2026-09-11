import os from 'node:os';
import { execa } from 'execa';

export interface SystemResourceProfile {
  cpuCount: number;
  freeMemoryMb: number;
  totalMemoryMb: number;
  loadAverage: number;
  recommendedConcurrency: number;
  threadsPerWorker: number;
  hwaccel: string | null;
}

/**
 * Calculates optimal and safe concurrency limits so extracting frames
 * never saturates the CPU or starves desktop compositors / user apps.
 */
export async function resolveResourceProfile(concurrencyOverride?: number): Promise<SystemResourceProfile> {
  const cpus = os.cpus();
  const cpuCount = cpus.length || 1;
  const freeMemoryMb = Math.floor(os.freemem() / (1024 * 1024));
  const totalMemoryMb = Math.floor(os.totalmem() / (1024 * 1024));
  const loadAvg = os.loadavg()[0] ?? 0;

  // Safe CPU limit: use at most 30-40% of logical cores to guarantee desktop UI smoothness
  // e.g. on 20 cores -> 4-6 workers; on 8 cores -> 3 workers; on 4 cores -> 2 workers
  const safeCpuWorkers = Math.max(1, Math.min(8, Math.floor(cpuCount * 0.35)));

  // Safe Memory limit: allocate ~250MB per ffmpeg worker
  const safeMemoryWorkers = Math.max(1, Math.floor(freeMemoryMb / 250));

  // If system load is already high (above 70% of CPU count), scale down concurrency
  const loadFactor = loadAvg > cpuCount * 0.7 ? 0.5 : 1.0;

  let recommended = Math.max(1, Math.floor(Math.min(safeCpuWorkers, safeMemoryWorkers) * loadFactor));

  if (concurrencyOverride && concurrencyOverride > 0) {
    recommended = concurrencyOverride;
  }

  // Detect if any hardware acceleration is supported by ffmpeg
  let hwaccel: string | null = null;
  try {
    const { stdout } = await execa('ffmpeg', ['-hwaccels']);
    if (stdout.includes('cuda')) {
      hwaccel = 'cuda';
    } else if (stdout.includes('vaapi')) {
      hwaccel = 'vaapi';
    } else if (stdout.includes('qsv')) {
      hwaccel = 'qsv';
    }
  } catch {
    hwaccel = null;
  }

  return {
    cpuCount,
    freeMemoryMb,
    totalMemoryMb,
    loadAverage: loadAvg,
    recommendedConcurrency: recommended,
    threadsPerWorker: 1, // Strictly 1 thread per ffmpeg instance to avoid thread multiplication
    hwaccel
  };
}
