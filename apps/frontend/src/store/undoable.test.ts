import { describe, expect, it } from 'vite-plus/test';
import { prepareWithHistory, redo, undo, undoable, type UndoableState } from './undoable';
import type { UnknownAction } from '@reduxjs/toolkit';

const COALESCE_WINDOW_MS = 500;
const LOADED_ACTION_TYPE = 'counter/loaded';

function counterReducer(state = 0, action: UnknownAction): number {
  if (action.type === 'counter/added') return state + (action.payload as number);

  if (action.type === LOADED_ACTION_TYPE) return action.payload as number;

  return state;
}

const reducer = undoable({
  reducer: counterReducer,
  limit: 3,
  coalesceWindowMs: COALESCE_WINDOW_MS,
  resetActionTypes: [LOADED_ACTION_TYPE],
});

type AddedProps = {
  amount: number;
  coalesceKey?: string;
  timestamp?: number;
};

function added(props: AddedProps): UnknownAction {
  const { amount, coalesceKey, timestamp = 0 } = props;

  return { type: 'counter/added', payload: amount, meta: { coalesceKey, timestamp } };
}

function applyActions(actions: ReadonlyArray<UnknownAction>): UndoableState<number> {
  const initialState = reducer(undefined, { type: '@@init' });
  const finalState = actions.reduce((state, action) => reducer(state, action), initialState);

  return finalState;
}

function getHistory(state: UndoableState<number>) {
  const { past, present, future } = state;

  return { past, present, future };
}

describe('undoable', () => {
  it('should undo the last change', () => {
    const actions = [added({ amount: 1 }), added({ amount: 2 }), undo()];

    const state = applyActions(actions);
    const actualResult = getHistory(state);

    const expectedResult = { past: [0], present: 1, future: [3] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should redo an undone change', () => {
    const actions = [added({ amount: 1 }), undo(), redo()];

    const state = applyActions(actions);
    const actualResult = getHistory(state);

    const expectedResult = { past: [0], present: 1, future: [] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should drop the undone changes after a new change', () => {
    const actions = [added({ amount: 1 }), undo(), added({ amount: 5 })];

    const state = applyActions(actions);
    const actualResult = getHistory(state);

    const expectedResult = { past: [0], present: 5, future: [] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should undo the changes of one gesture together', () => {
    const actions = [
      added({ amount: 1, coalesceKey: 'typing', timestamp: 1000 }),
      added({ amount: 1, coalesceKey: 'typing', timestamp: 1200 }),
      added({ amount: 1, coalesceKey: 'typing', timestamp: 1400 }),
      undo(),
    ];

    const actualResult = applyActions(actions).present;

    expect(actualResult).toBe(0);
  });

  it('should keep changes of one gesture apart when more time than the window passed between them', () => {
    const actions = [
      added({ amount: 1, coalesceKey: 'typing', timestamp: 1000 }),
      added({ amount: 1, coalesceKey: 'typing', timestamp: 1000 + COALESCE_WINDOW_MS + 1 }),
      undo(),
    ];

    const actualResult = applyActions(actions).present;

    expect(actualResult).toBe(1);
  });

  it('should keep changes of different gestures apart', () => {
    const actions = [
      added({ amount: 1, coalesceKey: 'typing', timestamp: 1000 }),
      added({ amount: 1, coalesceKey: 'dragging', timestamp: 1100 }),
      undo(),
    ];

    const actualResult = applyActions(actions).present;

    expect(actualResult).toBe(1);
  });

  it('should remember only as many steps as the limit', () => {
    const actions = Array.from({ length: 5 }, () => added({ amount: 1 }));

    const actualResult = applyActions(actions).past;

    expect(actualResult).toEqual([2, 3, 4]);
  });

  it('should start a new history on a reset action', () => {
    const actions = [added({ amount: 1 }), { type: LOADED_ACTION_TYPE, payload: 10 }];

    const state = applyActions(actions);
    const actualResult = getHistory(state);

    const expectedResult = { past: [], present: 10, future: [] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep the same state when an action changes nothing', () => {
    const actions = [added({ amount: 1 })];
    const state = applyActions(actions);

    const actualResult = reducer(state, { type: 'unrelated' });

    expect(actualResult).toBe(state);
  });

  it('should keep the same state when there is nothing to undo', () => {
    const state = applyActions([]);
    const undoAction = undo();

    const actualResult = reducer(state, undoAction);

    expect(actualResult).toBe(state);
  });
});

describe('prepareWithHistory', () => {
  it('should add the gesture key and the time to the action', () => {
    const prepare = prepareWithHistory((payload: { cueId: string }) => `text:${payload.cueId}`);

    const actualResult = prepare({ cueId: 'a' });

    const expectedResult = { payload: { cueId: 'a' }, meta: { coalesceKey: 'text:a', timestamp: expect.any(Number) } };
    expect(actualResult).toEqual(expectedResult);
  });
});
