import { toast } from 'sonner';
import { formatCount } from '@src/common/utils/formatCount';
import { getErrorMessage } from '@src/common/utils/getErrorMessage';
import { buildImportedCues } from '@src/lib/subtitles/import/buildImportedCues';
import { readSubtitlesFile, type SubtitlesFile } from '@src/lib/subtitles/import/readSubtitlesFile';
import { cuesImported, projectLoaded } from '../../store/slices/project.slice';
import { sessionReady } from '../../store/slices/session.slice';
import { cueSelected } from '../../store/slices/ui.slice';
import { undo } from '../../store/undoable';
import { getLanguageName } from '../new-video/languages';
import { finishRun, type ProcessingRun } from '../processing/processingRun';
import { translateNewSubtitles, translateSubtitles } from '../translation/translationPipeline';
import type { AppDispatch, AppThunk, RootState } from '../../store';

type AddSubtitlesFileProps = {
  run: ProcessingRun;
  dispatch: AppDispatch;
  getState: () => RootState;
  subtitles: SubtitlesFile;
};

/**
 * The end of opening a video with a subtitles file: makes the file's subtitles the video's, then translates them
 * when the session asks for it.
 */
export async function addSubtitlesFile(props: AddSubtitlesFileProps): Promise<void> {
  const { run, dispatch, getState, subtitles } = props;

  const { fileName, entries, language } = subtitles;
  const { video, translationLanguage } = getState().session;
  const cues = buildImportedCues({ entries, language, mediaDurationSec: video?.durationSec });

  dispatch(projectLoaded({ cues, language }));

  if (cues.length > 0 && translationLanguage) {
    await translateNewSubtitles({
      run,
      dispatch,
      getState,
      sourceLanguage: language,
      targetLanguage: translationLanguage,
    });
  }

  finishRun(run);
  dispatch(sessionReady());

  if (cues.length === 0) toast.warning(getAllPastTheEndMessage(fileName));
}

type ReplaceSubtitlesProps = {
  subtitles: SubtitlesFile;
  /**
   * Translates the file's subtitles into this language once they're in.
   */
  translationLanguage: string | null;
};

/**
 * Replaces the open video's subtitles with a subtitles file's. Can be undone.
 */
export function replaceSubtitles(props: ReplaceSubtitlesProps): AppThunk<Promise<void>> {
  const { subtitles, translationLanguage } = props;

  return async function replaceSubtitlesThunk(dispatch, getState) {
    const { fileName, entries, language } = subtitles;
    const cues = buildImportedCues({ entries, language, mediaDurationSec: getState().session.video?.durationSec });

    if (cues.length === 0) {
      toast.error(getAllPastTheEndMessage(fileName));
      return;
    }

    dispatch(cuesImported({ cues, language }));
    dispatch(cueSelected(null));
    toast.success(`Added ${formatCount({ count: cues.length, noun: 'subtitle' })} from “${fileName}”.`, {
      action: { label: 'Undo', onClick: () => dispatch(undo()) },
    });

    if (!translationLanguage || !language) return;

    if (language === translationLanguage) {
      toast.info(`The subtitles are already in ${getLanguageName(language)}, so there’s nothing to translate.`);
      return;
    }

    await dispatch(translateSubtitles({ sourceLanguage: language, targetLanguage: translationLanguage }));
  };
}

/**
 * Reads a subtitles file and uses its subtitles instead of the open video's.
 */
export function importSubtitlesFile(file: File): AppThunk<Promise<void>> {
  return async function importSubtitlesFileThunk(dispatch) {
    const subtitles = await readSubtitlesFile({ file }).catch((error: unknown) => {
      toast.error(getErrorMessage(error));

      return null;
    });

    if (subtitles) await dispatch(replaceSubtitles({ subtitles, translationLanguage: null }));
  };
}

function getAllPastTheEndMessage(fileName: string): string {
  return `The subtitles in “${fileName}” all start after the video ends. Is it the right file?`;
}
