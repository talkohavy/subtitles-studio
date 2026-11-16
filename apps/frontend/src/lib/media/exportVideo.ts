import {
  canEncodeAudio,
  Conversion,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  TextSubtitleSource,
  type ConversionAudioOptions,
  type ConversionVideoOptions,
  type Input,
  type InputAudioTrack,
  type InputTrack,
  type InputVideoTrack,
  type Quality,
} from 'mediabunny';
import { getFontSampleText } from '@src/lib/fonts/getFontSampleText';
import { loadFont } from '@src/lib/fonts/loadFont';
import { computeOutputSize } from '@src/lib/renderer/geometry';
import { renderFrame } from '@src/lib/renderer/renderFrame';
import { serializeSubtitles, SubtitleFormats } from '@src/lib/subtitles/subtitleFormats';
import { ExportQualities, SubtitleModes, type ExportQualityValues, type SubtitleModeValues } from './constants';
import { runCancellable } from './extractAudio';
import { getTrackLanguageCode } from './getTrackLanguageCode';
import { AudioNotExportableError, MediaError } from './media-error';
import { openInput } from './openInput';
import type { CanvasSettings, SubtitleStyle } from '@src/lib/renderer/types';
import type { Cue } from '@src/lib/subtitles/types';
import type { ExportDestination, ExportResult } from './exportDestination';

type ExportVideoProps = {
  file: File;
  cues: ReadonlyArray<Cue>;
  style: SubtitleStyle;
  canvasSettings: CanvasSettings;
  language: string | null;
  quality: ExportQualityValues;
  subtitleMode: SubtitleModeValues;
  /**
   * Export without the audio when it can't be exported,
   * instead of throwing `AudioNotExportableError`.
   */
  allowDroppingAudio: boolean;
  destination: ExportDestination;
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
 * Before this much is encoded, the final size can't be told from the size so far.
 */
const MIN_PROGRESS_FOR_SIZE_ESTIMATE = 0.05;
const TOO_LARGE_FOR_MEMORY_MESSAGE =
  'This video would be larger than 4 GB, which is more than your browser can hold. Choose Standard quality or a ' +
  'smaller canvas size, or export in Chrome or Edge, which save straight to a file.';

/**
 * Exports the video with its captions, entirely in the browser. Burned in, the captions are drawn into every frame,
 * which re-encodes the video at the canvas size. As a track, the video is copied as is (so the canvas settings and
 * the style don't apply) and the captions go next to it as a WebVTT subtitle track. AAC audio is copied as is; other
 * audio becomes AAC when the browser can decode it and encode AAC.
 *
 * @throws {AudioNotExportableError} before encoding anything, when the audio would be dropped and
 * `allowDroppingAudio` is off.
 */
export async function exportVideo(props: ExportVideoProps): Promise<ExportResult> {
  const {
    file,
    cues,
    style,
    canvasSettings,
    language,
    quality,
    subtitleMode,
    allowDroppingAudio,
    destination,
    onProgress,
    signal,
  } = props;

  const isBurningIn = subtitleMode === SubtitleModes.BurnedIn;
  const input = openInput(file);
  // Without fast start, the video is written as it's encoded (its index goes at the end), instead of being held in
  // memory until the end.
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target: destination.target });

  try {
    const videoTrack = await input.getPrimaryVideoTrack();

    if (!videoTrack) throw new MediaError('This file has no video in it.');

    const audioTrack = await input.getPrimaryAudioTrack();
    const tracks: Array<InputTrack> = audioTrack ? [videoTrack, audioTrack] : [videoTrack];
    const firstTimestamp = await input.getFirstTimestamp(tracks);
    // The output starts at 0, while captions are timed against the video's own timeline.
    const timelineStart = Math.max(0, firstTimestamp);
    const encodingQuality = quality === ExportQualities.High ? QUALITY_HIGH : QUALITY_MEDIUM;
    const audioOptions = await getAudioOptions({ audioTrack, quality: encodingQuality });
    // Without video options, the video is copied as is.
    const videoOptions = isBurningIn
      ? await getBurnInVideoOptions({
          videoTrack,
          cues,
          style,
          canvasSettings,
          language,
          quality: encodingQuality,
          timelineStart,
        })
      : undefined;
    // A composable conversion leaves the output to us, so that the subtitle track can be added to it.
    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: videoOptions,
      audio: audioOptions,
      showWarnings: false,
      composable: !isBurningIn,
    });

    if (!conversion.isValid) {
      const reasons = conversion.discardedTracks.map((discarded) => `${discarded.track.type}: ${discarded.reason}`);
      throw new MediaError(`This video can’t be exported in your browser (${reasons.join(', ')}).`);
    }

    const isAudioDropped = conversion.discardedTracks.some((discarded) => discarded.track.type === 'audio');

    if (isAudioDropped && !allowDroppingAudio) {
      const codec = await audioTrack?.getCodec();
      const codecLabel = codec ? ` (${codec.toUpperCase()})` : '';

      throw new AudioNotExportableError(
        `Your browser can’t convert this video’s audio${codecLabel}, so the exported video would have no sound.`,
      );
    }

    const { maxBytes } = destination;
    const sizeLimit = new AbortController();
    let writtenBytes = 0;
    const stopCountingBytes = destination.target.on('write', ({ end }) => {
      writtenBytes = Math.max(writtenBytes, end);
    });

    conversion.onProgress = (progress) => {
      onProgress(progress);

      if (maxBytes !== null && isOverSizeLimit({ writtenBytes, progress, maxBytes })) {
        sizeLimit.abort(new MediaError(TOO_LARGE_FOR_MEMORY_MESSAGE));
      }
    };

    try {
      if (!isBurningIn) await startWithSubtitleTrack({ input, output, cues, language, timelineStart });

      await runCancellable({ conversion, signal: AbortSignal.any([signal, sizeLimit.signal]) });

      if (!isBurningIn) await output.finalize();
    } finally {
      stopCountingBytes();
    }

    const result = await destination.finish();

    return result;
  } catch (error) {
    // Does nothing when the conversion already canceled it.
    await output.cancel();
    await destination.discard();
    throw error;
  } finally {
    input.dispose();
  }
}

type GetBurnInVideoOptionsProps = {
  videoTrack: InputVideoTrack;
  cues: ReadonlyArray<Cue>;
  style: SubtitleStyle;
  canvasSettings: CanvasSettings;
  language: string | null;
  quality: Quality;
  timelineStart: number;
};

/**
 * Re-encodes the video at the canvas size, with the captions drawn into every frame.
 */
async function getBurnInVideoOptions(props: GetBurnInVideoOptionsProps): Promise<ConversionVideoOptions> {
  const { videoTrack, cues, style, canvasSettings, language, quality, timelineStart } = props;

  const canDecode = await videoTrack.canDecode();

  if (!canDecode) throw new MediaError('Your browser can’t decode this video. Try Chrome or Edge.');

  const sourceWidth = await videoTrack.getDisplayWidth();
  const sourceHeight = await videoTrack.getDisplayHeight();
  const { width, height } = computeOutputSize({ sourceWidth, sourceHeight, aspectRatio: canvasSettings.aspectRatio });
  const videoCodec = await getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], { width, height, quality });

  if (!videoCodec) {
    throw new MediaError(`Your browser can’t encode a ${width}×${height} video. Try a smaller canvas size.`);
  }

  const fontSampleText = getFontSampleText({ cues, style, language });
  await loadFont({ fontId: style.fontId, weight: style.fontWeight, text: fontSampleText });

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new MediaError('Your browser can’t draw the video frames.');

  return {
    codec: videoCodec,
    quality,
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
        // Frame timestamps given to `process` start at 0.
        time: sample.timestamp + timelineStart,
        cues,
        style,
        canvasSettings,
        language,
      });

      return canvas;
    },
  };
}

type StartWithSubtitleTrackProps = {
  input: Input;
  output: Output;
  cues: ReadonlyArray<Cue>;
  language: string | null;
  timelineStart: number;
};

/**
 * Adds the captions as a subtitle track and starts the output, with the input's metadata (title, artist, ...) since a
 * composable conversion doesn't copy it. The whole track is written up front: the muxer interleaves tracks by
 * timestamp, so a track still open would hold the video back in memory.
 */
async function startWithSubtitleTrack(props: StartWithSubtitleTrackProps): Promise<void> {
  const { input, output, cues, language, timelineStart } = props;

  const subtitleSource = new TextSubtitleSource('webvtt');
  const languageCode = getTrackLanguageCode(language);
  output.addSubtitleTrack(subtitleSource, languageCode ? { languageCode } : {});

  const tags = { ...(await input.getMetadataTags()) };
  delete tags.creationTime;
  // The input format's own tags, which are junk in another format.
  delete tags.raw;
  output.setMetadataTags(tags);

  await output.start();

  const shiftedCues = shiftCues({ cues, offset: -timelineStart });
  const webVtt = serializeSubtitles({ cues: shiftedCues, format: SubtitleFormats.Vtt });
  await subtitleSource.add(webVtt);
  subtitleSource.close();
}

/**
 * Moves the cues by `offset` seconds, in start order (which a track needs), cutting off what moves before 0.
 */
export function shiftCues(props: { cues: ReadonlyArray<Cue>; offset: number }): Array<Cue> {
  const { cues, offset } = props;

  const shiftedCues = cues
    .map((cue) => ({ ...cue, start: Math.max(0, cue.start + offset), end: cue.end + offset }))
    .filter((cue) => cue.end > cue.start);
  const sortedCues = shiftedCues.sort((a, b) => a.start - b.start);

  return sortedCues;
}

type GetAudioOptionsProps = {
  audioTrack: InputAudioTrack | null;
  quality: Quality;
};

/**
 * MP4 can also hold Opus or MP3, but video editors, phones and social networks reliably accept only AAC. When the
 * browser can't decode the audio (e.g. AC-3 or DTS in Chrome) or has no AAC encoder, the audio is copied (or
 * converted) the way Mediabunny sees fit.
 */
async function getAudioOptions(props: GetAudioOptionsProps): Promise<ConversionAudioOptions | undefined> {
  const { audioTrack, quality } = props;

  if (!audioTrack || (await audioTrack.getCodec()) === 'aac') return;

  const canDecode = await audioTrack.canDecode();

  if (!canDecode) return;

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

type IsOverSizeLimitProps = {
  writtenBytes: number;
  /**
   * From 0 to 1.
   */
  progress: number;
  maxBytes: number;
};

/**
 * Whether the video already is, or is on track to end up, larger than `maxBytes`.
 */
export function isOverSizeLimit(props: IsOverSizeLimitProps): boolean {
  const { writtenBytes, progress, maxBytes } = props;

  if (writtenBytes > maxBytes) return true;

  if (progress < MIN_PROGRESS_FOR_SIZE_ESTIMATE) return false;

  const estimatedBytes = writtenBytes / progress;

  return estimatedBytes > maxBytes;
}
