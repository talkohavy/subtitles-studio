/**
 * Averages all channels into one. A mono input is returned as is.
 */
export function downmixToMono(channels: Array<Float32Array>): Float32Array {
  if (channels.length === 1) return channels[0]!;

  const frameCount = Math.min(...channels.map((channel) => channel.length));
  const mono = new Float32Array(frameCount);

  channels.forEach((channel) => {
    for (let index = 0; index < frameCount; index++) {
      mono[index]! += channel[index]!;
    }
  });

  const channelCount = channels.length;

  for (let index = 0; index < frameCount; index++) {
    mono[index]! /= channelCount;
  }

  return mono;
}
