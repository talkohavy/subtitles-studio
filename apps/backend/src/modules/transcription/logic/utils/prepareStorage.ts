import { mkdir, rm } from 'fs/promises';
import type { TranscriptionConfig } from '@src/plugins/config-service';

/**
 * Creates the storage folders. Uploads left behind by a previous run (e.g. after a crash) are deleted.
 */
export async function prepareStorage(config: TranscriptionConfig): Promise<void> {
  const { modelsDir, uploadsDir } = config;

  await mkdir(modelsDir, { recursive: true });
  await rm(uploadsDir, { recursive: true, force: true });
  await mkdir(uploadsDir, { recursive: true });
}
