import {
  BufferTarget,
  canEncodeAudio,
  Conversion,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  type ConversionAudioOptions,
  type InputAudioTrack,
  type InputTrack,
  type Quality,
} from 'mediabunny';
import { loadFont } from '@src/lib/fonts/loadFont';
import { computeOutputSize } from '@src/lib/renderer/geometry';
import { renderFrame } from '@src/lib/renderer/renderFrame';
import { ExportQualities, type ExportQualityValues } from './constants';
import { runCancellable } from './extractAudio';
import { MediaError } from './media-error';
import { openInput } from './openInput';
import type { CanvasSettings, SubtitleStyle } from '@src/lib/renderer/types';
import type { Cue } from '@src/lib/subtitles/types';

type ExportVideoProps = {
  file: File;
  cues: ReadonlyArray<Cue>;
  style: SubtitleStyle;
  canvasSettings: CanvasSettings;
  language: string | null;
  quality: ExportQualityValues;
  /**
   * Called with a number from 0 to 1.
   */
  onProgress: (progress: number) => void;
  signal: AbortSignal;
};

/**
 * Every AAC encoder supports these; audio at other rates is resampled to one of them.
 */
const AAC_SAMPLE_RATES = [48_000, 44_100];

/**
 * Re-encodes the video with the captions drawn into every frame, entirely in the browser. AAC audio is copied as is;
 * other audio becomes AAC when the browser can encode it.
 */
export async function exportVideo(props: ExportVideoProps): Promise<Blob> {
  const { file, cues, style, canvasSettings, language, quality, onProgress, signal } = props;

  const input = openInput(file);

  try {
    const videoTrack = await input.getPrimaryVideoTrack();

    if (!videoTrack) throw new MediaError('This file has no video in it.');

    const canDecode = await videoTrack.canDecode();

    if (!canDecode) throw new MediaError('Your browser can’t decode this video. Try Chrome or Edge.');

    const audioTrack = await input.getPrimaryAudioTrack();
    const tracks: Array<InputTrack> = audioTrack ? [videoTrack, audioTrack] : [videoTrack];
    const firstTimestamp = await input.getFirstTimestamp(tracks);
    // Frame timestamps given to `process` start at 0; captions are timed against the video's own timeline.
    const timelineStart = Math.max(0, firstTimestamp);

    const sourceWidth = await videoTrack.getDisplayWidth();
    const sourceHeight = await videoTrack.getDisplayHeight();
    const { width, height } = computeOutputSize({ sourceWidth, sourceHeight, aspectRatio: canvasSettings.aspectRatio });
    const encodingQuality = quality === ExportQualities.High ? QUALITY_HIGH : QUALITY_MEDIUM;
    const audioOptions = await getAudioOptions({ audioTrack, quality: encodingQuality });
    const videoCodec = await getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], {
      width,
      height,
      quality: encodingQuality,
    });

    if (!videoCodec) {
      throw new MediaError(`Your browser can’t encode a ${width}×${height} video. Try a smaller canvas size.`);
    }

    const captionText = cues.map((cue) => cue.text).join(' ');
    await loadFont({ fontId: style.fontId, weight: style.fontWeight, text: captionText.slice(0, 10_000) });

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new MediaError('Your browser can’t draw the video frames.');

    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: {
        codec: videoCodec,
        quality: encodingQuality,
        forceTranscode: true,
        allowTransformationMetadata: false,
        processedWidth: width,
        processedHeight: height,
        process: (sample) => {
          renderFrame({
            ctx,
            frameWidth: width,
            frameHeight: height,
            drawSource: (rect) => sample.draw(ctx, rect.x, rect.y, rect.width, rect.height),
            sourceWidth,
            sourceHeight,
            time: sample.timestamp + timelineStart,
            cues,
            style,
            canvasSettings,
            language,
          });

          return canvas;
        },
      },
      audio: audioOptions,
      showWarnings: false,
    });

    if (!conversion.isValid) {
      const reasons = conversion.discardedTracks.map((discarded) => `${discarded.track.type}: ${discarded.reason}`);
      throw new MediaError(`This video can’t be exported in your browser (${reasons.join(', ')}).`);
    }

    conversion.onProgress = (progress) => onProgress(progress);

    await runCancellable({ conversion, signal });

    if (!target.buffer) throw new MediaError('The export didn’t produce a video.');

    return new Blob([target.buffer], { type: 'video/mp4' });
  } finally {
    input.dispose();
  }
}

type GetAudioOptionsProps = {
  audioTrack: InputAudioTrack | null;
  quality: Quality;
};

/**
 * MP4 can also hold Opus or MP3, but video editors, phones and social networks reliably accept only AAC. Without an
 * AAC encoder, the audio is copied (or converted) the way Mediabunny sees fit.
 */
async function getAudioOptions(props: GetAudioOptionsProps): Promise<ConversionAudioOptions | undefined> {
  const { audioTrack, quality } = props;

  if (!audioTrack || (await audioTrack.getCodec()) === 'aac') return undefined;

  const numberOfChannels = await audioTrack.getNumberOfChannels();
  const sampleRates = [await audioTrack.getSampleRate(), ...AAC_SAMPLE_RATES];
  const canEncode = await Promise.all(
    sampleRates.map((sampleRate) => canEncodeAudio('aac', { numberOfChannels, sampleRate })),
  );
  const sampleRate = sampleRates.find((_, index) => canEncode[index]);
  const audioOptions: ConversionAudioOptions | undefined = sampleRate
    ? { codec: 'aac', sampleRate, quality }
    : undefined;

  return audioOptions;
}
