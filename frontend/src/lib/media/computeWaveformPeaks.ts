export type WaveformPeaks = {
  /**
   * The loudest sample of each slice, from 0 to 1 (relative to the loudest moment of the audio).
   */
  peaks: Float32Array;
  peaksPerSecond: number;
};

type ComputeWaveformPeaksProps = {
  /**
   * A 16-bit PCM WAV file.
   */
  wav: ArrayBuffer;
  peaksPerSecond: number;
};

/**
 * Summarizes the audio for drawing a waveform. Returns `null` for anything but 16-bit PCM WAV.
 */
export function computeWaveformPeaks(props: ComputeWaveformPeaksProps): WaveformPeaks | null {
  const { wav, peaksPerSecond } = props;

  const format = findPcmFormat(wav);

  if (!format) return null;

  const { sampleRate, channelCount, dataOffset, dataLength } = format;
  const view = new DataView(wav, dataOffset, dataLength);
  const frameCount = Math.floor(dataLength / (2 * channelCount));
  const framesPerPeak = Math.max(1, Math.round(sampleRate / peaksPerSecond));
  const peaks = new Float32Array(Math.ceil(frameCount / framesPerPeak));

  let loudest = 0;

  for (let peakIndex = 0; peakIndex < peaks.length; peakIndex++) {
    const firstFrame = peakIndex * framesPerPeak;
    const lastFrame = Math.min(frameCount, firstFrame + framesPerPeak);
    let peak = 0;

    for (let frame = firstFrame; frame < lastFrame; frame++) {
      const amplitude = Math.abs(view.getInt16(frame * 2 * channelCount, true));

      if (amplitude > peak) peak = amplitude;
    }

    peaks[peakIndex] = peak;

    if (peak > loudest) loudest = peak;
  }

  if (loudest > 0) {
    for (let peakIndex = 0; peakIndex < peaks.length; peakIndex++) peaks[peakIndex] = peaks[peakIndex]! / loudest;
  }

  return { peaks, peaksPerSecond: sampleRate / framesPerPeak };
}

type PcmFormat = {
  sampleRate: number;
  channelCount: number;
  dataOffset: number;
  dataLength: number;
};

function findPcmFormat(wav: ArrayBuffer): PcmFormat | null {
  if (wav.byteLength < 12) return null;

  const view = new DataView(wav);
  const isWave = readChunkId({ view, offset: 0 }) === 'RIFF' && readChunkId({ view, offset: 8 }) === 'WAVE';

  if (!isWave) return null;

  let offset = 12;
  let sampleRate = 0;
  let channelCount = 0;
  let bitsPerSample = 0;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readChunkId({ view, offset });
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;

    if (chunkId === 'fmt ' && chunkStart + 16 <= view.byteLength) {
      channelCount = view.getUint16(chunkStart + 2, true);
      sampleRate = view.getUint32(chunkStart + 4, true);
      bitsPerSample = view.getUint16(chunkStart + 14, true);
    }

    if (chunkId === 'data') {
      if (bitsPerSample !== 16 || channelCount === 0 || sampleRate === 0) return null;

      const dataLength = Math.min(chunkSize, view.byteLength - chunkStart);

      return { sampleRate, channelCount, dataOffset: chunkStart, dataLength };
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  return null;
}

function readChunkId(props: { view: DataView; offset: number }): string {
  const { view, offset } = props;

  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}
