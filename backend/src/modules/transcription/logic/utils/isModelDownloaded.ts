import { access } from 'fs/promises';
import path from 'path';
import { DTYPE_TO_FILE_SUFFIX } from '../constants';
import type { WhisperRuntime } from '../../types';

type IsModelDownloadedProps = {
  modelsDir: string;
  repo: string;
  runtime: WhisperRuntime;
};

/**
 * Whether transformers.js' file cache (`<modelsDir>/<repo>/<file>`) holds everything this runtime loads.
 */
export async function isModelDownloaded(props: IsModelDownloadedProps): Promise<boolean> {
  const { modelsDir, repo, runtime } = props;

  const suffix = DTYPE_TO_FILE_SUFFIX[runtime.dtype];
  const requiredFiles = [
    'config.json',
    'tokenizer.json',
    'preprocessor_config.json',
    `onnx/encoder_model${suffix}.onnx`,
    `onnx/decoder_model_merged${suffix}.onnx`,
  ];

  const fileChecks = await Promise.all(requiredFiles.map((file) => doesFileExist(path.join(modelsDir, repo, file))));

  return fileChecks.every(Boolean);
}

async function doesFileExist(filePath: string): Promise<boolean> {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
}
