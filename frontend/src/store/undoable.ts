import { createAction, type Reducer, type UnknownAction } from '@reduxjs/toolkit';

export type UndoableState<T> = {
  past: Array<T>;
  present: T;
  future: Array<T>;
  lastCoalesceKey: string | null;
  lastChangeAt: number;
};

/**
 * Optional `meta` of actions handled by an undoable reducer.
 */
export type HistoryMeta = {
  /**
   * Consecutive changes with the same key, each within the coalesce window of the previous one, are undone together.
   * Used for typing and dragging.
   */
  coalesceKey?: string;
  timestamp?: number;
};

export const undo = createAction('history/undo');
export const redo = createAction('history/redo');

type UndoableProps<T> = {
  reducer: Reducer<T>;
  /**
   * How many steps can be undone.
   */
  limit: number;
  coalesceWindowMs: number;
  /**
   * Actions that start a new history, e.g. loading a different project.
   */
  resetActionTypes: ReadonlyArray<string>;
};

export function createUndoableState<T>(present: T): UndoableState<T> {
  return { past: [], present, future: [], lastCoalesceKey: null, lastChangeAt: 0 };
}

/**
 * Adds undo/redo to a reducer.
 */
export function undoable<T>(props: UndoableProps<T>): Reducer<UndoableState<T>> {
  const { reducer, limit, coalesceWindowMs, resetActionTypes } = props;

  const initialPresent = reducer(undefined, { type: '@@undoable/init' });
  const initialState = createUndoableState(initialPresent);

  return function undoableReducer(state = initialState, action: UnknownAction): UndoableState<T> {
    if (undo.match(action)) {
      const previous = state.past.at(-1);

      if (previous === undefined) return state;

      return {
        ...createUndoableState(previous),
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future],
      };
    }

    if (redo.match(action)) {
      const [next, ...future] = state.future;

      if (next === undefined) return state;

      return { ...createUndoableState(next), past: [...state.past, state.present], future };
    }

    const present = reducer(state.present, action);

    if (present === state.present) return state;

    if (resetActionTypes.includes(action.type)) return createUndoableState(present);

    const meta = (action.meta ?? {}) as HistoryMeta;
    const timestamp = meta.timestamp ?? 0;
    const isSameGesture = meta.coalesceKey !== undefined && meta.coalesceKey === state.lastCoalesceKey;
    const coalesces = isSameGesture && timestamp - state.lastChangeAt <= coalesceWindowMs;

    if (coalesces) return { ...state, present, future: [], lastChangeAt: timestamp };

    const past = [...state.past, state.present].slice(-limit);

    return { past, present, future: [], lastCoalesceKey: meta.coalesceKey ?? null, lastChangeAt: timestamp };
  };
}

/**
 * A `prepare` callback for slice actions that records history metadata.
 */
export function prepareWithHistory<P>(getCoalesceKey?: (payload: P) => string) {
  return function prepare(payload: P) {
    const meta: HistoryMeta = { coalesceKey: getCoalesceKey?.(payload), timestamp: Date.now() };

    return { payload, meta };
  };
}
