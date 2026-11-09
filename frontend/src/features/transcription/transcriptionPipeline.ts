import { toast } from 'sonner';
import { getErrorMessage, isAbortError } from '@src/common/utils/getErrorMessage';
import { cancelTranscription, createTranscription, fetchTranscription } from '@src/lib/api/transcriptionApi';
import { computeWaveformPeaks } from '@src/lib/media/computeWaveformPeaks';
import { MAX_VIDEO_FILE_BYTES } from '@src/lib/media/constants';
import { extractAudio } from '@src/lib/media/extractAudio';
import { MediaError } from '@src/lib/media/media-error';
import { mediaStore } from '@src/lib/media/mediaStore';
import { probeVideo } from '@src/lib/media/probeVideo';
import { player } from '@src/lib/player/playerController';
import { buildCues } from '@src/lib/subtitles/buildCues';
import { isUnspacedLanguage, joinWords } from '@src/lib/subtitles/tokenizeText';
import { cuesReplaced, projectCleared, projectLoaded } from '../../store/slices/project.slice';
import {
  phaseChanged,
  phaseProgressed,
  sessionCleared,
  sessionFailed,
  SessionPhases,
  sessionReady,
  sessionStarted,
  transcriptionProgressed,
  transcriptionRequested,
  videoProbed,
  type TranscriptionProgress,
} from '../../store/slices/session.slice';
import { settingsChanged } from '../../store/slices/settings.slice';
import { cueSelected } from '../../store/slices/ui.slice';
import { pollJob } from '../processing/pollJob';
import { finishRun, startRun, stopActiveRun, type ProcessingRun } from '../processing/processingRun';
import { translateTranscript } from '../translation/translationPipeline';
import type { AppDispatch, AppThunk, RootState } from '../../store';
import type { TranscriptionJob } from '@src/lib/api/types';
import type { CaptionLengthValues } from '@src/lib/subtitles/constants';
import type { Word } from '@src/lib/subtitles/types';

const PROGRESS_DISPATCH_INTERVAL_MS = 100;
const TRANSCRIPT_PREVIEW_WORDS = 30;
const WAVEFORM_PEAKS_PER_SECOND = 100;

/**
 * Opens a video and transcribes it: reads the file, extracts its audio in the browser, uploads only the audio,
 * and turns the transcript into captions.
 */
export function openVideo(file: File): AppThunk<Promise<void>> {
  return async function openVideoThunk(dispatch, getState) {
    if (file.size > MAX_VIDEO_FILE_BYTES) {
      toast.error('This video is too large. Videos can be up to 2 GB.');
      return;
    }

    const run = startRun();
    const { signal } = run.controller;

    player.pause();
    mediaStore.setFile(file);
    dispatch(projectCleared());
    dispatch(cueSelected(null));
    dispatch(sessionStarted({ fileName: file.name, fileSize: file.size }));

    try {
      const videoInfo = await probeVideo(file);
      signal.throwIfAborted();
      dispatch(videoProbed(videoInfo));

      if (!videoInfo.hasAudio) {
        finishRun(run);
        dispatch(sessionReady());
        toast.info('This video has no sound, so there’s nothing to transcribe. You can add subtitles by hand.');
        return;
      }

      dispatch(phaseChanged(SessionPhases.ExtractingAudio));
      const onProgress = createProgressReporter(dispatch);
      const { wav, offsetSec } = await extractAudio({ file, onProgress, signal });
      const waveform = computeWaveformPeaks({ wav, peaksPerSecond: WAVEFORM_PEAKS_PER_SECOND });
      mediaStore.setAudio({ wav, audioOffsetSec: offsetSec, waveform });

      await runTranscription({ run, dispatch, getState });
    } catch (error) {
      handleRunError({ run, error, dispatch });
    }
  };
}

/**
 * Transcribes the open video again, e.g. with a different model or language. Replaces the current subtitles.
 */
export function retranscribe(props: { language: string; modelId: string | null }): AppThunk<Promise<void>> {
  const { language, modelId } = props;

  return async function retranscribeThunk(dispatch, getState) {
    const { file, wav } = mediaStore.getSnapshot();

    dispatch(settingsChanged({ language, modelId }));

    if (!wav) {
      if (file) await dispatch(openVideo(file));
      return;
    }

    const run = startRun();
    player.pause();

    try {
      await runTranscription({ run, dispatch, getState });
    } catch (error) {
      handleRunError({ run, error, dispatch });
    }
  };
}

/**
 * Stops any processing and goes back to the start screen.
 */
export function closeVideo(): AppThunk {
  return function closeVideoThunk(dispatch) {
    stopActiveRun();
    player.pause();
    mediaStore.clear();
    dispatch(projectCleared());
    dispatch(sessionCleared());
    dispatch(cueSelected(null));
  };
}

/**
 * Stops the processing. When there are subtitles to go back to (when transcribing again, or translating), they are
 * kept; otherwise the video is closed.
 */
export function cancelProcessing(): AppThunk {
  return function cancelProcessingThunk(dispatch, getState) {
    const hasCues = getState().project.present.cues.length > 0;

    if (!hasCues) {
      dispatch(closeVideo());
      return;
    }

    stopActiveRun();
    dispatch(sessionReady());
  };
}

/**
 * Regroups the words into captions of a different length. Text edits are kept; timing changes are not.
 */
export function regroupCaptions(captionLength: CaptionLengthValues): AppThunk {
  return function regroupCaptionsThunk(dispatch, getState) {
    dispatch(settingsChanged({ captionLength }));

    const state = getState();
    const { cues, language } = state.project.present;
    const separator = isUnspacedLanguage(language) ? '' : ' ';
    const words = cues.flatMap((cue) =>
      cue.words.map((word, index) => (index === 0 ? { ...word, text: `${separator}${word.text.trimStart()}` } : word)),
    );

    if (words.length === 0) return;

    const regroupedCues = buildCues({ words, captionLength, mediaDurationSec: state.session.video?.durationSec });
    dispatch(cuesReplaced({ cues: regroupedCues }));
  };
}

type RunTranscriptionProps = {
  run: ProcessingRun;
  dispatch: AppDispatch;
  getState: () => RootState;
};

/**
 * Transcribes the extracted audio into subtitles, then translates them when the settings ask for it.
 */
async function runTranscription(props: RunTranscriptionProps): Promise<void> {
  const { run, dispatch, getState } = props;

  const { signal } = run.controller;
  const { wav, audioOffsetSec } = mediaStore.getSnapshot();

  if (!wav) throw new MediaError('The audio is missing. Open the video again.');

  const { language, modelId, translationLanguage } = getState().settings;

  dispatch(transcriptionRequested({ language, modelId, translationLanguage }));
  dispatch(phaseChanged(SessionPhases.Uploading));

  const onUploadProgress = createProgressReporter(dispatch);
  const createdJob = await createTranscription({ wav, language, modelId, onUploadProgress, signal });
  run.cancelServerJob = () => void cancelTranscription(createdJob.id);
  dispatch(phaseChanged(SessionPhases.Transcribing));

  const { words, job } = await pollTranscription({ createdJob, run, dispatch, audioOffsetSec });
  run.cancelServerJob = null;

  const state = getState();
  const cues = buildCues({
    words,
    captionLength: state.settings.captionLength,
    mediaDurationSec: state.session.video?.durationSec,
  });

  dispatch(projectLoaded({ cues, language: job.language }));

  if (cues.length > 0 && translationLanguage) {
    await translateTranscript({
      run,
      dispatch,
      getState,
      sourceLanguage: job.language,
      targetLanguage: translationLanguage,
    });
  }

  finishRun(run);
  dispatch(sessionReady());

  if (cues.length === 0) toast.info('No speech was found in this video. You can add subtitles by hand.');
}

type PollTranscriptionProps = {
  createdJob: TranscriptionJob;
  run: ProcessingRun;
  dispatch: AppDispatch;
  /**
   * Added to the transcript's times, which count from the start of the audio.
   */
  audioOffsetSec: number;
};

/**
 * Polls until the transcription finishes, fetching only the words that are new each time.
 */
async function pollTranscription(
  props: PollTranscriptionProps,
): Promise<{ words: Array<Word>; job: TranscriptionJob }> {
  const { createdJob, run, dispatch, audioOffsetSec } = props;

  const { signal } = run.controller;
  const words: Array<Word> = [];

  const job = await pollJob({
    job: createdJob,
    fetchJob: () => fetchTranscription({ id: createdJob.id, wordsFrom: words.length, signal }),
    onUpdate: (updatedJob) => {
      updatedJob.words.forEach((word) => {
        words.push({ text: word.text, start: word.start + audioOffsetSec, end: word.end + audioOffsetSec });
      });

      const transcriptPreview = joinWords(words.slice(-TRANSCRIPT_PREVIEW_WORDS));
      dispatch(transcriptionProgressed({ job: toTranscriptionProgress(updatedJob), transcriptPreview }));
    },
    jobLabel: 'transcription',
    signal,
  });

  return { words, job };
}

function toTranscriptionProgress(job: TranscriptionJob): TranscriptionProgress {
  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    language: job.language,
    languageProbability: job.languageProbability,
    modelId: job.modelId,
    device: job.device,
    queuePosition: job.queuePosition,
    modelDownload: job.modelDownload,
    wordsTotal: job.wordsTotal,
  };
}

function handleRunError(props: { run: ProcessingRun; error: unknown; dispatch: AppDispatch }) {
  const { run, error, dispatch } = props;

  if (run.controller.signal.aborted || isAbortError(error)) return;

  run.cancelServerJob?.();
  finishRun(run);

  const canRetry = mediaStore.getSnapshot().wav !== null;
  dispatch(sessionFailed({ error: getErrorMessage(error), canRetry }));
}

/**
 * Reports progress to the store at most every 100ms.
 */
function createProgressReporter(dispatch: AppDispatch) {
  let lastReportedAt = 0;

  return function reportProgress(progress: number) {
    const now = performance.now();

    if (progress < 1 && now - lastReportedAt < PROGRESS_DISPATCH_INTERVAL_MS) return;

    lastReportedAt = now;
    dispatch(phaseProgressed(progress));
  };
}
