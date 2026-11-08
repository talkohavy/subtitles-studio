import { resolveRuntimes } from './resolveRuntimes';
import type { WhisperRuntime } from '../../types';

const GPU_RUNTIME: WhisperRuntime = { device: 'webgpu', dtype: 'q4f16', approximateSizeMb: 574 };
const CPU_RUNTIME: WhisperRuntime = { device: 'cpu', dtype: 'q4', approximateSizeMb: 754 };

describe('resolveRuntimes', () => {
  it('should keep the model order when the device is auto', () => {
    const actualResult = resolveRuntimes({ runtimes: [GPU_RUNTIME, CPU_RUNTIME], device: 'auto' });

    expect(actualResult).toEqual([GPU_RUNTIME, CPU_RUNTIME]);
  });

  it('should put the preferred device first and keep the others as fallbacks', () => {
    const actualResult = resolveRuntimes({ runtimes: [GPU_RUNTIME, CPU_RUNTIME], device: 'cpu' });

    expect(actualResult).toEqual([CPU_RUNTIME, GPU_RUNTIME]);
  });

  it('should fall back to other devices when the model has no runtime for the preferred one', () => {
    const actualResult = resolveRuntimes({ runtimes: [CPU_RUNTIME], device: 'webgpu' });

    expect(actualResult).toEqual([CPU_RUNTIME]);
  });
});
