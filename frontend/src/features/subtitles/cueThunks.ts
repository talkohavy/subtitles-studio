import { toast } from 'sonner';
import { createId } from '@src/common/utils/createId';
import { player } from '@src/lib/player/playerController';
import { getNextCueStart, getPreviousCueStart } from '@src/lib/subtitles/cueNavigation';
import { selectCues, selectMediaDuration } from '../../store/selectors';
import {
  cueAddedAtTime,
  cueDeleted,
  cueInsertedAfter,
  cueMergedWithNext,
  cueSplit,
} from '../../store/slices/project.slice';
import { cueFocusRequested, cueSelected } from '../../store/slices/ui.slice';
import { undoNotifiedChange } from '../history/historyThunks';
import type { AppThunk } from '../../store';

/**
 * Adds a caption at `time` and focuses its text.
 */
export function addCueAtTime(time: number): AppThunk {
  return function addCueAtTimeThunk(dispatch, getState) {
    const newCueId = createId();
    dispatch(cueAddedAtTime({ time, mediaDurationSec: selectMediaDuration(getState()), newCueId }));

    const newCue = selectCues(getState()).find((cue) => cue.id === newCueId);

    if (!newCue) {
      toast.info('There’s no room for a subtitle here. Shorten or move the one next to it first.');
      return;
    }

    player.seek(newCue.start);
    dispatch(cueFocusRequested(newCueId));
  };
}

/**
 * Adds a caption right after another one and focuses its text.
 */
export function insertCueAfter(cueId: string): AppThunk {
  return function insertCueAfterThunk(dispatch, getState) {
    const newCueId = createId();
    dispatch(cueInsertedAfter({ cueId, mediaDurationSec: selectMediaDuration(getState()), newCueId }));

    const newCue = selectCues(getState()).find((cue) => cue.id === newCueId);

    if (!newCue) return;

    player.seek(newCue.start);
    dispatch(cueFocusRequested(newCueId));
  };
}

/**
 * Splits a caption in two at a text position (or near its middle when `null`).
 */
export function splitCueAt(props: { cueId: string; textOffset: number | null }): AppThunk {
  const { cueId, textOffset } = props;

  return function splitCueAtThunk(dispatch, getState) {
    const cueCount = selectCues(getState()).length;
    const newCueId = createId();
    dispatch(cueSplit({ cueId, textOffset, newCueId }));

    const wasSplit = selectCues(getState()).length > cueCount;

    if (!wasSplit) toast.info('This subtitle is too short to split.');
  };
}

export function mergeCueWithNext(cueId: string): AppThunk {
  return function mergeCueWithNextThunk(dispatch) {
    dispatch(cueMergedWithNext({ cueId }));
    dispatch(cueSelected(cueId));
  };
}

export function deleteCue(cueId: string): AppThunk {
  return function deleteCueThunk(dispatch, getState) {
    const cue = selectCues(getState()).find((existingCue) => existingCue.id === cueId);

    if (!cue) return;

    dispatch(cueDeleted({ cueId }));

    if (getState().ui.selectedCueId === cueId) dispatch(cueSelected(null));

    const changedProject = getState().project.present;

    toast('Subtitle deleted', {
      description: cue.text.length > 60 ? `${cue.text.slice(0, 60)}…` : cue.text,
      action: { label: 'Undo', onClick: () => dispatch(undoNotifiedChange({ changedProject })) },
    });
  };
}

export function seekToPreviousCue(): AppThunk {
  return function seekToPreviousCueThunk(_dispatch, getState) {
    const start = getPreviousCueStart({ cues: selectCues(getState()), time: player.getCurrentTime() });

    player.seek(start ?? 0);
  };
}

export function seekToNextCue(): AppThunk {
  return function seekToNextCueThunk(_dispatch, getState) {
    const start = getNextCueStart({ cues: selectCues(getState()), time: player.getCurrentTime() });

    if (start !== null) player.seek(start);
  };
}
