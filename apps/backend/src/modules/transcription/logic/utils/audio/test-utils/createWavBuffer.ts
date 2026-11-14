type CreateWavBufferProps = {
  /**
   * One array per channel, samples in the [-1, 1] range.
   */
  channels: Array<Array<number>>;
  sampleRate: number;
  /**
   * @default 16
   */
  bitsPerSample?: 8 | 16 | 24 | 32;
  /**
   * @default false
   */
  isFloat?: boolean;
  /**
   * Chunks inserted between the `fmt ` and the `data` chunk, like the `LIST` chunk many encoders write.
   */
  extraChunks?: Array<{ id: string; data: Buffer }>;
  /**
   * Overrides the size written in the `data` chunk header, to mimic streaming writers.
   */
  declaredDataSize?: number;
};

/**
 * Test helper: encodes samples as a WAV file.
 */
export function createWavBuffer(props: CreateWavBufferProps): Buffer {
  const { channels, sampleRate, bitsPerSample = 16, isFloat = false, extraChunks = [], declaredDataSize } = props;

  const channelCount = channels.length;
  const frameCount = channels[0]?.length ?? 0;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = bytesPerSample * channelCount;
  const dataSize = frameCount * blockAlign;

  const fmtChunk = Buffer.alloc(8 + 16);
  fmtChunk.write('fmt ', 0, 'ascii');
  fmtChunk.writeUInt32LE(16, 4);
  fmtChunk.writeUInt16LE(isFloat ? 3 : 1, 8);
  fmtChunk.writeUInt16LE(channelCount, 10);
  fmtChunk.writeUInt32LE(sampleRate, 12);
  fmtChunk.writeUInt32LE(sampleRate * blockAlign, 16);
  fmtChunk.writeUInt16LE(blockAlign, 20);
  fmtChunk.writeUInt16LE(bitsPerSample, 22);

  const extraChunkBuffers = extraChunks.map((chunk) => {
    const header = Buffer.alloc(8);
    header.write(chunk.id, 0, 'ascii');
    header.writeUInt32LE(chunk.data.length, 4);
    const padding = Buffer.alloc(chunk.data.length % 2);

    return Buffer.concat([header, chunk.data, padding]);
  });

  const dataChunk = Buffer.alloc(8 + dataSize);
  dataChunk.write('data', 0, 'ascii');
  dataChunk.writeUInt32LE(declaredDataSize ?? dataSize, 4);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    channels.forEach((channel, channelIndex) => {
      const offset = 8 + frameIndex * blockAlign + channelIndex * bytesPerSample;
      writeSample({ buffer: dataChunk, offset, value: channel[frameIndex]!, bitsPerSample, isFloat });
    });
  }

  const body = Buffer.concat([fmtChunk, ...extraChunkBuffers, dataChunk]);
  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 'ascii');
  riffHeader.writeUInt32LE(4 + body.length, 4);
  riffHeader.write('WAVE', 8, 'ascii');

  const wavBuffer = Buffer.concat([riffHeader, body]);

  return wavBuffer;
}

type WriteSampleProps = {
  buffer: Buffer;
  offset: number;
  value: number;
  bitsPerSample: number;
  isFloat: boolean;
};

function writeSample(props: WriteSampleProps) {
  const { buffer, offset, value, bitsPerSample, isFloat } = props;

  if (isFloat) return void buffer.writeFloatLE(value, offset);

  if (bitsPerSample === 8) return void buffer.writeUInt8(Math.round(value * 127) + 128, offset);
  if (bitsPerSample === 16) return void buffer.writeInt16LE(Math.round(value * 32_767), offset);
  if (bitsPerSample === 24) return void buffer.writeIntLE(Math.round(value * 8_388_607), offset, 3);

  buffer.writeInt32LE(Math.round(value * 2_147_483_647), offset);
}
