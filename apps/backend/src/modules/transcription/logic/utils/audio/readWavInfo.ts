import { InvalidAudioError } from './invalid-audio.error';

export const WavSampleFormats = {
  Pcm: 'pcm',
  Float: 'float',
} as const;

export type WavSampleFormatValues = (typeof WavSampleFormats)[keyof typeof WavSampleFormats];

export type WavInfo = {
  sampleFormat: WavSampleFormatValues;
  channelCount: number;
  sampleRate: number;
  bitsPerSample: number;
  /**
   * Bytes per frame (one sample of every channel), including any container padding.
   */
  blockAlign: number;
  /**
   * Byte offset of the first sample.
   */
  dataOffset: number;
  /**
   * In bytes. Never exceeds what the file actually holds, and always a whole number of frames.
   */
  dataLength: number;
  durationSec: number;
};

type ReadWavInfoProps = {
  /**
   * The whole file, or at least its beginning (the header chunks).
   */
  buffer: Buffer;
  /**
   * Size of the whole file, when `buffer` only holds its beginning.
   * @default buffer.length
   */
  fileSize?: number;
};

type WavFormat = Omit<WavInfo, 'dataOffset' | 'dataLength' | 'durationSec'>;

const WAVE_FORMAT_PCM = 0x0001;
const WAVE_FORMAT_IEEE_FLOAT = 0x0003;
const WAVE_FORMAT_EXTENSIBLE = 0xfffe;
const RIFF_HEADER_SIZE = 12;
const CHUNK_HEADER_SIZE = 8;
const MIN_FMT_CHUNK_SIZE = 16;
const EXTENSIBLE_SUB_FORMAT_OFFSET = 24;
/**
 * Streaming writers that don't know the final size put one of these in the `data` chunk size field.
 */
const UNKNOWN_CHUNK_SIZES = [0, 0xffffffff];
const VALID_PCM_BITS = [8, 16, 24, 32];
const VALID_FLOAT_BITS = [32, 64];
const MIN_SAMPLE_RATE = 1000;
const MAX_SAMPLE_RATE = 768_000;

/**
 * Reads the format of a RIFF/WAVE file without decoding its samples.
 *
 * @throws {InvalidAudioError} When the file isn't an uncompressed PCM or float WAV.
 */
export function readWavInfo(props: ReadWavInfoProps): WavInfo {
  const { buffer, fileSize = buffer.length } = props;

  const isRiffWave =
    buffer.length >= RIFF_HEADER_SIZE &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE';

  if (!isRiffWave) throw new InvalidAudioError('Not a WAV file (missing the RIFF/WAVE header)');

  let format: WavFormat | null = null;
  let chunkOffset = RIFF_HEADER_SIZE;

  while (chunkOffset + CHUNK_HEADER_SIZE <= buffer.length) {
    const chunkId = buffer.toString('ascii', chunkOffset, chunkOffset + 4);
    const chunkSize = buffer.readUInt32LE(chunkOffset + 4);
    const chunkDataOffset = chunkOffset + CHUNK_HEADER_SIZE;

    if (chunkId === 'fmt ') {
      format = parseFormatChunk({ buffer, chunkDataOffset, chunkSize });
    } else if (chunkId === 'data') {
      if (!format) throw new InvalidAudioError('Invalid WAV file: the "data" chunk comes before the "fmt " chunk');

      const wavInfo = buildWavInfo({ format, chunkDataOffset, chunkSize, fileSize });

      return wavInfo;
    }

    chunkOffset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  throw new InvalidAudioError('Invalid WAV file: no "data" chunk found');
}

type ParseFormatChunkProps = {
  buffer: Buffer;
  chunkDataOffset: number;
  chunkSize: number;
};

function parseFormatChunk(props: ParseFormatChunkProps): WavFormat {
  const { buffer, chunkDataOffset, chunkSize } = props;

  if (chunkSize < MIN_FMT_CHUNK_SIZE || chunkDataOffset + MIN_FMT_CHUNK_SIZE > buffer.length) {
    throw new InvalidAudioError('Invalid WAV file: the "fmt " chunk is truncated');
  }

  const formatTag = buffer.readUInt16LE(chunkDataOffset);
  const channelCount = buffer.readUInt16LE(chunkDataOffset + 2);
  const sampleRate = buffer.readUInt32LE(chunkDataOffset + 4);
  const blockAlign = buffer.readUInt16LE(chunkDataOffset + 12);
  const bitsPerSample = buffer.readUInt16LE(chunkDataOffset + 14);

  const hasSubFormat =
    formatTag === WAVE_FORMAT_EXTENSIBLE && chunkDataOffset + EXTENSIBLE_SUB_FORMAT_OFFSET + 2 <= buffer.length;
  const effectiveFormatTag = hasSubFormat
    ? buffer.readUInt16LE(chunkDataOffset + EXTENSIBLE_SUB_FORMAT_OFFSET)
    : formatTag;

  const sampleFormat = getSampleFormat(effectiveFormatTag);
  const validBits = sampleFormat === WavSampleFormats.Pcm ? VALID_PCM_BITS : VALID_FLOAT_BITS;

  if (!validBits.includes(bitsPerSample)) {
    throw new InvalidAudioError(`Unsupported WAV file: ${bitsPerSample}-bit ${sampleFormat} samples`);
  }

  if (channelCount < 1) throw new InvalidAudioError('Invalid WAV file: it has no audio channels');

  if (sampleRate < MIN_SAMPLE_RATE || sampleRate > MAX_SAMPLE_RATE) {
    throw new InvalidAudioError(`Unsupported WAV file: sample rate of ${sampleRate}Hz`);
  }

  const minBlockAlign = (bitsPerSample / 8) * channelCount;

  return {
    sampleFormat,
    channelCount,
    sampleRate,
    bitsPerSample,
    blockAlign: Math.max(blockAlign, minBlockAlign),
  };
}

function getSampleFormat(formatTag: number): WavSampleFormatValues {
  if (formatTag === WAVE_FORMAT_PCM) return WavSampleFormats.Pcm;
  if (formatTag === WAVE_FORMAT_IEEE_FLOAT) return WavSampleFormats.Float;

  throw new InvalidAudioError(
    `Unsupported WAV encoding (format tag 0x${formatTag.toString(16)}). Only uncompressed PCM and float are supported`,
  );
}

type BuildWavInfoProps = {
  format: WavFormat;
  chunkDataOffset: number;
  chunkSize: number;
  fileSize: number;
};

function buildWavInfo(props: BuildWavInfoProps): WavInfo {
  const { format, chunkDataOffset, chunkSize, fileSize } = props;

  const availableBytes = Math.max(0, fileSize - chunkDataOffset);
  const declaredBytes = UNKNOWN_CHUNK_SIZES.includes(chunkSize) ? availableBytes : chunkSize;
  const usableBytes = Math.min(declaredBytes, availableBytes);
  const frameCount = Math.floor(usableBytes / format.blockAlign);

  return {
    ...format,
    dataOffset: chunkDataOffset,
    dataLength: frameCount * format.blockAlign,
    durationSec: frameCount / format.sampleRate,
  };
}
