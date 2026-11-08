import { UnsupportedInputFormatError } from 'mediabunny';
import { MediaError } from './media-error';
import { openInput } from './openInput';

export type VideoInfo = {
  /**
   * The size as displayed, i.e. after rotation.
   */
  width: number;
  height: number;
  durationSec: number;
  hasAudio: boolean;
};

export async function probeVideo(file: File): Promise<VideoInfo> {
  const input = openInput(file);

  try {
    const videoTrack = await input.getPrimaryVideoTrack();

    if (!videoTrack) throw new MediaError('This file has no video in it. Choose a video file.');

    const audioTrack = await input.getPrimaryAudioTrack();
    const durationSec = await input.computeDuration();

    return {
      width: await videoTrack.getDisplayWidth(),
      height: await videoTrack.getDisplayHeight(),
      durationSec,
      hasAudio: audioTrack !== null,
    };
  } catch (error) {
    if (error instanceof UnsupportedInputFormatError) {
      throw new MediaError('This file type isn’t supported. Use an MP4, MOV, WebM or MKV video.');
    }

    throw error;
  } finally {
    input.dispose();
  }
}
