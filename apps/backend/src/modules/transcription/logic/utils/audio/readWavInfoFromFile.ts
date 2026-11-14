import { open } from 'fs/promises';
import { readWavInfo, type WavInfo } from './readWavInfo';

type ReadWavInfoFromFileProps = {
  filePath: string;
  fileSize: number;
};

/**
 * Enough to reach the `data` chunk even after large metadata chunks.
 */
const HEADER_PROBE_BYTES = 1024 * 1024;

/**
 * Reads a WAV file's format from its first bytes only.
 *
 * @throws {InvalidAudioError} When the file isn't an uncompressed PCM or float WAV.
 */
export async function readWavInfoFromFile(props: ReadWavInfoFromFileProps): Promise<WavInfo> {
  const { filePath, fileSize } = props;

  const fileHandle = await open(filePath, 'r');

  try {
    const probe = Buffer.alloc(Math.min(HEADER_PROBE_BYTES, fileSize));
    const { bytesRead } = await fileHandle.read({ buffer: probe, position: 0 });
    const wavInfo = readWavInfo({ buffer: probe.subarray(0, bytesRead), fileSize });

    return wavInfo;
  } finally {
    await fileHandle.close();
  }
}
