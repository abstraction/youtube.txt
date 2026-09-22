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
export async function resolveResourceProfile(
  concurrencyOverride?: number,
  activeJobsCount = 1
): Promise<SystemResourceProfile> {
  const cpus = os.cpus();
  const cpuCount = cpus.length || 1;
  const freeMemoryMb = Math.floor(os.freemem() / (1024 * 1024));
  const totalMemoryMb = Math.floor(os.totalmem() / (1024 * 1024));
  const loadAvg = os.loadavg()[0] ?? 0;

  // Safe CPU limit: use at most 35-40% of logical cores to guarantee desktop UI smoothness
  // e.g. on 20 cores -> 7-8 workers; on 8 cores -> 3 workers; on 4 cores -> 1-2 workers
  const safeCpuWorkers = Math.max(1, Math.min(8, Math.floor(cpuCount * 0.35)));

  // Safe Memory limit: allocate ~250MB per ffmpeg worker
  const safeMemoryWorkers = Math.max(1, Math.floor(freeMemoryMb / 250));

  // If system load is already high (above 70% of CPU count), scale down concurrency
  const loadFactor = loadAvg > cpuCount * 0.7 ? 0.5 : 1.0;

  const totalSafePool = Math.max(
    1,
    Math.floor(Math.min(safeCpuWorkers, safeMemoryWorkers) * loadFactor)
  );

  // Divide the global safe worker budget among the currently active jobs
  const count = Math.max(1, activeJobsCount);
  let recommended = Math.max(1, Math.floor(totalSafePool / count));

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
    hwaccel,
  };
}

/**
 * Determines how many concurrent video download/extraction jobs the machine can comfortably handle.
 */
export function calculateMaxConcurrentJobs(): number {
  const cpuCount = os.cpus().length || 1;
  const freeMemoryMb = Math.floor(os.freemem() / (1024 * 1024));

  if (cpuCount >= 16 && freeMemoryMb >= 8000) {
    return 3;
  }
  if (cpuCount >= 8 && freeMemoryMb >= 4000) {
    return 2;
  }
  return 1;
}

export interface SystemHealth {
  healthy: boolean;
  freeMemoryMb: number;
  loadAverage: number;
  cpuCount: number;
  throttleReason?: string;
}

export function checkSystemHealth(): SystemHealth {
  const cpuCount = os.cpus().length || 1;
  const freeMemoryMb = Math.floor(os.freemem() / (1024 * 1024));
  const loadAverage = os.loadavg()[0] ?? 0;

  if (freeMemoryMb < 500) {
    return {
      healthy: false,
      freeMemoryMb,
      loadAverage,
      cpuCount,
      throttleReason: `Low RAM (${freeMemoryMb} MB free)`,
    };
  }

  if (loadAverage > cpuCount * 0.85) {
    return {
      healthy: false,
      freeMemoryMb,
      loadAverage,
      cpuCount,
      throttleReason: `High CPU load (${loadAverage.toFixed(1)} / ${cpuCount} cores)`,
    };
  }

  return {
    healthy: true,
    freeMemoryMb,
    loadAverage,
    cpuCount,
  };
}
