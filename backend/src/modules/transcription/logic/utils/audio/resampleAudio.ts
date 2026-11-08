type ResampleAudioProps = {
  samples: Float32Array;
  fromSampleRate: number;
  toSampleRate: number;
};

/**
 * Downsampling averages every source sample that falls inside an output sample (a box filter, which keeps most
 * aliasing out of the speech band); upsampling interpolates linearly. Good enough for speech recognition.
 */
export function resampleAudio(props: ResampleAudioProps): Float32Array {
  const { samples, fromSampleRate, toSampleRate } = props;

  if (fromSampleRate === toSampleRate) return samples;

  const ratio = fromSampleRate / toSampleRate;
  const outputLength = Math.floor((samples.length * toSampleRate) / fromSampleRate);
  const output = new Float32Array(outputLength);

  if (ratio > 1) {
    for (let outputIndex = 0; outputIndex < outputLength; outputIndex++) {
      const sourceStart = Math.floor(outputIndex * ratio);
      const sourceEnd = Math.min(samples.length, Math.floor((outputIndex + 1) * ratio));

      let sum = 0;
      for (let sourceIndex = sourceStart; sourceIndex < sourceEnd; sourceIndex++) {
        sum += samples[sourceIndex]!;
      }

      output[outputIndex] = sum / Math.max(1, sourceEnd - sourceStart);
    }

    return output;
  }

  const lastSourceIndex = samples.length - 1;

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex++) {
    const sourcePosition = outputIndex * ratio;
    const sourceIndex = Math.floor(sourcePosition);
    const nextSourceIndex = Math.min(sourceIndex + 1, lastSourceIndex);
    const fraction = sourcePosition - sourceIndex;

    output[outputIndex] = samples[sourceIndex]! * (1 - fraction) + samples[nextSourceIndex]! * fraction;
  }

  return output;
}
