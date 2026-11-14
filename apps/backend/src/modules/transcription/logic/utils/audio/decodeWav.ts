import { readWavInfo, WavSampleFormats, type WavInfo } from './readWavInfo';

export type DecodedAudio = {
  sampleRate: number;
  /**
   * One array per channel, samples in the [-1, 1] range.
   */
  channels: Array<Float32Array>;
};

type SampleReader = (byteOffset: number) => number;

const INT8_SCALE = 128;
const INT16_SCALE = 32_768;
const INT24_SCALE = 8_388_608;
const INT32_SCALE = 2_147_483_648;

/**
 * Decodes an uncompressed PCM/float WAV file into per-channel float samples.
 *
 * @throws {InvalidAudioError} When the file isn't an uncompressed PCM or float WAV.
 */
export function decodeWav(buffer: Buffer): DecodedAudio {
  const wavInfo = readWavInfo({ buffer });
  const { channelCount, blockAlign, dataOffset, dataLength, sampleRate, bitsPerSample } = wavInfo;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const readSample = getSampleReader({ view, wavInfo });
  const bytesPerSample = bitsPerSample / 8;
  const frameCount = dataLength / blockAlign;

  const channels = Array.from({ length: channelCount }, () => new Float32Array(frameCount));

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const frameOffset = dataOffset + frameIndex * blockAlign;

    for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) {
      channels[channelIndex]![frameIndex] = readSample(frameOffset + channelIndex * bytesPerSample);
    }
  }

  return { sampleRate, channels };
}

type GetSampleReaderProps = {
  view: DataView;
  wavInfo: WavInfo;
};

function getSampleReader(props: GetSampleReaderProps): SampleReader {
  const { view, wavInfo } = props;
  const { sampleFormat, bitsPerSample } = wavInfo;

  function readFloat32(byteOffset: number): number {
    return view.getFloat32(byteOffset, true);
  }

  function readFloat64(byteOffset: number): number {
    return view.getFloat64(byteOffset, true);
  }

  function readUint8(byteOffset: number): number {
    return (view.getUint8(byteOffset) - INT8_SCALE) / INT8_SCALE;
  }

  function readInt16(byteOffset: number): number {
    return view.getInt16(byteOffset, true) / INT16_SCALE;
  }

  function readInt24(byteOffset: number): number {
    const unsigned =
      view.getUint8(byteOffset) | (view.getUint8(byteOffset + 1) << 8) | (view.getUint8(byteOffset + 2) << 16);
    const signed = (unsigned << 8) >> 8;

    return signed / INT24_SCALE;
  }

  function readInt32(byteOffset: number): number {
    return view.getInt32(byteOffset, true) / INT32_SCALE;
  }

  if (sampleFormat === WavSampleFormats.Float) return bitsPerSample === 64 ? readFloat64 : readFloat32;

  if (bitsPerSample === 8) return readUint8;
  if (bitsPerSample === 16) return readInt16;
  if (bitsPerSample === 24) return readInt24;

  return readInt32;
}
