import { BufferTarget, Conversion, Output, WavOutputFormat } from 'mediabunny';
import { MediaError } from './media-error';
import { openInput } from './openInput';

type ExtractAudioProps = {
  file: File;
  /**
   * Called with a number from 0 to 1.
   */
  onProgress: (progress: number) => void;
  signal: AbortSignal;
};

type ExtractedAudio = {
  /**
   * A 16 kHz mono 16-bit WAV file, the format speech recognition works with.
   */
  wav: ArrayBuffer;
  /**
   * Where the audio starts in the video, in seconds.
   */
  offsetSec: number;
};

/**
 * Decodes the video's audio track in the browser, so only the (much smaller) audio has to be uploaded.
 */
export async function extractAudio(props: ExtractAudioProps): Promise<ExtractedAudio> {
  const { file, onProgress, signal } = props;

  const input = openInput(file);

  try {
    const audioTrack = await input.getPrimaryAudioTrack();

    if (!audioTrack) throw new MediaError('This video has no sound, so there’s nothing to transcribe.');

    const canDecode = await audioTrack.canDecode();

    if (!canDecode) {
      const codec = await audioTrack.getCodec();
      throw new MediaError(`Your browser can’t decode this video’s audio (${codec ?? 'unknown format'}).`);
    }

    const firstTimestamp = await audioTrack.getFirstTimestamp();
    const target = new BufferTarget();
    const output = new Output({ format: new WavOutputFormat(), target });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: { discard: true },
      audio: { numberOfChannels: 1, sampleRate: 16_000, codec: 'pcm-s16' },
      showWarnings: false,
    });

    if (!conversion.isValid) throw new MediaError('The audio of this video can’t be read.');

    conversion.onProgress = (progress) => onProgress(progress);

    await runCancellable({ conversion, signal });

    if (!target.buffer) throw new MediaError('The audio of this video can’t be read.');

    return { wav: target.buffer, offsetSec: Math.max(0, firstTimestamp) };
  } finally {
    input.dispose();
  }
}

/**
 * Runs a conversion, canceling it when the signal aborts (which then rejects with the signal's reason).
 */
export async function runCancellable(props: { conversion: Conversion; signal: AbortSignal }): Promise<void> {
  const { conversion, signal } = props;

  signal.throwIfAborted();

  function cancel() {
    void conversion.cancel();
  }

  signal.addEventListener('abort', cancel, { once: true });

  try {
    await conversion.execute();
  } catch (error) {
    signal.throwIfAborted();
    throw error;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
