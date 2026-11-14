import { toast } from 'sonner';
import { getErrorMessage, isAbortError } from '@src/common/utils/getErrorMessage';
import { cancelTranslation, createTranslation, fetchTranslation } from '@src/lib/api/translationApi';
import { player } from '@src/lib/player/playerController';
import { isUnspacedLanguage } from '@src/lib/subtitles/tokenizeText';
import { applyTranslations, buildTranslationUnits } from '@src/lib/subtitles/translateCues';
import { cuesTranslated } from '../../store/slices/project.slice';
import {
  phaseChanged,
  SessionPhases,
  sessionReady,
  translationProgressed,
  translationRequested,
  type TranslationProgress,
} from '../../store/slices/session.slice';
import { undoNotifiedChange } from '../history/historyThunks';
import { getLanguageName } from '../new-video/languages';
import { pollJob } from '../processing/pollJob';
import { finishRun, startRun, type ProcessingRun } from '../processing/processingRun';
import type { AppDispatch, AppThunk, RootState } from '../../store';
import type { TranslationJob } from '@src/lib/api/types';

/**
 * How many of the latest translated sentences are shown while translating.
 */
const PREVIEW_SENTENCES = 3;

type TranslateSubtitlesProps = {
  sourceLanguage: string;
  targetLanguage: string;
};

/**
 * Translates the subtitles into another language, keeping their timing. Can be undone.
 */
export function translateSubtitles(props: TranslateSubtitlesProps): AppThunk<Promise<void>> {
  const { sourceLanguage, targetLanguage } = props;

  return async function translateSubtitlesThunk(dispatch, getState) {
    if (getState().project.present.cues.length === 0) return;

    const run = startRun();
    player.pause();
    dispatch(translationRequested({ targetLanguage }));

    try {
      await runTranslation({ run, dispatch, getState, sourceLanguage, targetLanguage });
      finishRun(run);
      dispatch(sessionReady());
    } catch (error) {
      if (run.controller.signal.aborted || isAbortError(error)) return;

      run.cancelServerJob?.();
      finishRun(run);
      dispatch(sessionReady());
      toast.error(`The subtitles couldn’t be translated. ${getErrorMessage(error)}`);
    }
  };
}

type TranslateNewSubtitlesProps = {
  run: ProcessingRun;
  dispatch: AppDispatch;
  getState: () => RootState;
  /**
   * The subtitles' language; `null` when unknown.
   */
  sourceLanguage: string | null;
  targetLanguage: string;
};

/**
 * Shown instead of translating subtitles that are already in the language asked for.
 */
export function getAlreadyInLanguageMessage(language: string): string {
  const message = `The subtitles are already in ${getLanguageName(language)}, so there’s nothing to translate.`;

  return message;
}

/**
 * Translates subtitles that were just made (transcribed, or read from a file) as part of the same processing. When
 * the translation fails, the subtitles stay in their language.
 *
 * @throws only when the run was stopped.
 */
export async function translateNewSubtitles(props: TranslateNewSubtitlesProps): Promise<void> {
  const { run, dispatch, getState, sourceLanguage, targetLanguage } = props;

  if (!sourceLanguage) return;

  if (sourceLanguage === targetLanguage) {
    toast.info(getAlreadyInLanguageMessage(targetLanguage));
    return;
  }

  try {
    await runTranslation({ run, dispatch, getState, sourceLanguage, targetLanguage });
  } catch (error) {
    if (run.controller.signal.aborted || isAbortError(error)) throw error;

    run.cancelServerJob?.();
    run.cancelServerJob = null;
    toast.error(
      `The subtitles couldn’t be translated, so they’re in ${getLanguageName(sourceLanguage)}. ${getErrorMessage(error)}`,
    );
  }
}

type RunTranslationProps = {
  run: ProcessingRun;
  dispatch: AppDispatch;
  getState: () => RootState;
  sourceLanguage: string;
  targetLanguage: string;
};

/**
 * Sends the subtitles' sentences to the translator and fits the translations back into the subtitles.
 */
async function runTranslation(props: RunTranslationProps): Promise<void> {
  const { run, dispatch, getState, sourceLanguage, targetLanguage } = props;

  const { signal } = run.controller;
  const { cues } = getState().project.present;
  const units = buildTranslationUnits({ cues, language: sourceLanguage });
  const texts = units.map((unit) => unit.text);
  const separator = isUnspacedLanguage(targetLanguage) ? '' : ' ';

  dispatch(phaseChanged(SessionPhases.Translating));

  const createdJob = await createTranslation({ texts, sourceLanguage, targetLanguage, signal });
  run.cancelServerJob = () => void cancelTranslation(createdJob.id);

  const translations: Array<string> = [];

  await pollJob({
    job: createdJob,
    fetchJob: () => fetchTranslation({ id: createdJob.id, translationsFrom: translations.length, signal }),
    onUpdate: (job) => {
      translations.push(...job.translations);
      const transcriptPreview = translations.slice(-PREVIEW_SENTENCES).join(separator);
      dispatch(translationProgressed({ job: toTranslationProgress(job), transcriptPreview }));
    },
    jobLabel: 'translation',
    signal,
  });
  run.cancelServerJob = null;

  const translatedCues = applyTranslations({ cues, units, translations, language: targetLanguage });
  dispatch(cuesTranslated({ cues: translatedCues, language: targetLanguage }));
  const changedProject = getState().project.present;

  toast.success(`Translated the subtitles to ${getLanguageName(targetLanguage)}.`, {
    action: { label: 'Undo', onClick: () => dispatch(undoNotifiedChange({ changedProject })) },
  });
}

function toTranslationProgress(job: TranslationJob): TranslationProgress {
  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    queuePosition: job.queuePosition,
    modelDownload: job.modelDownload,
  };
}
