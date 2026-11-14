import { describe, expect, it } from 'vite-plus/test';
import { createAppStore } from '../../store';
import { cueDeleted, projectLoaded } from '../../store/slices/project.slice';
import { phaseChanged, SessionPhases, sessionReady } from '../../store/slices/session.slice';
import { redoChange, undoChange, undoNotifiedChange } from './historyThunks';
import type { Cue } from '@src/lib/subtitles/types';

function makeCue(props: { id: string; start: number }): Cue {
  const { id, start } = props;

  return { id, start, end: start + 1, text: id, words: [{ text: id, start, end: start + 1 }] };
}

const CUES = ['a', 'b', 'c'].map((id, index) => makeCue({ id, start: index * 2 }));

function createReadyStore() {
  const store = createAppStore();
  store.dispatch(projectLoaded({ cues: CUES, language: 'en' }));
  store.dispatch(sessionReady());

  return store;
}

function getCueIds(store: ReturnType<typeof createAppStore>): Array<string> {
  const cueIds = store.getState().project.present.cues.map((cue) => cue.id);

  return cueIds;
}

describe('undoChange', () => {
  it('should undo and redo when the subtitles can be edited', () => {
    const store = createReadyStore();
    store.dispatch(cueDeleted({ cueId: 'a' }));

    store.dispatch(undoChange());
    const afterUndo = getCueIds(store);
    store.dispatch(redoChange());
    const actualResult = { afterUndo, afterRedo: getCueIds(store) };

    const expectedResult = { afterUndo: ['a', 'b', 'c'], afterRedo: ['b', 'c'] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should do nothing while processing', () => {
    const store = createReadyStore();
    store.dispatch(cueDeleted({ cueId: 'a' }));
    store.dispatch(phaseChanged(SessionPhases.Translating));

    store.dispatch(undoChange());
    const actualResult = getCueIds(store);

    const expectedResult = ['b', 'c'];
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('undoNotifiedChange', () => {
  it('should undo the change while it is the latest one', () => {
    const store = createReadyStore();
    store.dispatch(cueDeleted({ cueId: 'a' }));
    const changedProject = store.getState().project.present;

    store.dispatch(undoNotifiedChange({ changedProject }));
    const actualResult = getCueIds(store);

    const expectedResult = ['a', 'b', 'c'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should not undo a later change', () => {
    const store = createReadyStore();
    store.dispatch(cueDeleted({ cueId: 'a' }));
    const changedProject = store.getState().project.present;
    store.dispatch(cueDeleted({ cueId: 'b' }));

    store.dispatch(undoNotifiedChange({ changedProject }));
    const actualResult = getCueIds(store);

    const expectedResult = ['c'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should undo the change again once a later change was undone', () => {
    const store = createReadyStore();
    store.dispatch(cueDeleted({ cueId: 'a' }));
    const changedProject = store.getState().project.present;
    store.dispatch(cueDeleted({ cueId: 'b' }));
    store.dispatch(undoChange());

    store.dispatch(undoNotifiedChange({ changedProject }));
    const actualResult = getCueIds(store);

    const expectedResult = ['a', 'b', 'c'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should not undo while processing', () => {
    const store = createReadyStore();
    store.dispatch(cueDeleted({ cueId: 'a' }));
    const changedProject = store.getState().project.present;
    store.dispatch(phaseChanged(SessionPhases.Translating));

    store.dispatch(undoNotifiedChange({ changedProject }));
    const actualResult = getCueIds(store);

    const expectedResult = ['b', 'c'];
    expect(actualResult).toEqual(expectedResult);
  });
});
