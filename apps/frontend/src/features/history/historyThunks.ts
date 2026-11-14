import { toast } from 'sonner';
import { selectCanRedo, selectCanUndo, selectIsEditable } from '../../store/selectors';
import { redo, undo } from '../../store/undoable';
import type { AppThunk } from '../../store';
import type { ProjectState } from '../../store/slices/project.slice';

export function undoChange(): AppThunk {
  return function undoChangeThunk(dispatch, getState) {
    if (selectCanUndo(getState())) dispatch(undo());
  };
}

export function redoChange(): AppThunk {
  return function redoChangeThunk(dispatch, getState) {
    if (selectCanRedo(getState())) dispatch(redo());
  };
}

/**
 * For a notification's "Undo" button: undoes the change it tells about, but only while it's still the latest one.
 */
export function undoNotifiedChange(props: { changedProject: ProjectState }): AppThunk {
  const { changedProject } = props;

  return function undoNotifiedChangeThunk(dispatch, getState) {
    const state = getState();

    if (!selectIsEditable(state)) {
      toast.info('You can undo once the processing finishes.');
      return;
    }

    if (state.project.present !== changedProject) {
      toast.info(
        'This can’t be undone from here anymore, because other changes were made after it. Use Undo in the top bar to step back.',
      );
      return;
    }

    dispatch(undoChange());
  };
}
