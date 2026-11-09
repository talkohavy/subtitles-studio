import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_CANVAS_SETTINGS, DEFAULT_SUBTITLE_STYLE, STYLE_PRESETS } from '@src/lib/renderer/presets';
import {
  clampCueTiming,
  createCueAfter,
  createCueAtTime,
  mergeCues,
  retimeCue,
  splitCue,
  updateCueText,
} from '@src/lib/subtitles/cueOperations';
import { prepareWithHistory, undoable, type HistoryMeta } from '../undoable';
import type { CanvasSettings, SubtitleStyle } from '@src/lib/renderer/types';
import type { Cue } from '@src/lib/subtitles/types';

export type ProjectState = {
  /**
   * Sorted by start time and never overlapping.
   */
  cues: Array<Cue>;
  style: SubtitleStyle;
  canvas: CanvasSettings;
  /**
   * The transcript's language, which decides how text splits into words.
   */
  language: string | null;
};

type HistoryAction<P> = PayloadAction<P, string, HistoryMeta>;

export const initialProjectState: ProjectState = {
  cues: [],
  style: DEFAULT_SUBTITLE_STYLE,
  canvas: DEFAULT_CANVAS_SETTINGS,
  language: null,
};

function findCueIndex(props: { state: ProjectState; cueId: string }): number {
  const { state, cueId } = props;

  return state.cues.findIndex((cue) => cue.id === cueId);
}

const projectSlice = createSlice({
  name: 'project',
  initialState: initialProjectState,
  reducers: {
    projectLoaded(state, action: PayloadAction<{ cues: Array<Cue>; language: string | null }>) {
      state.cues = action.payload.cues;
      state.language = action.payload.language;
    },

    projectCleared(state) {
      state.cues = [];
      state.language = null;
    },

    cueTextChanged: {
      reducer(state, action: HistoryAction<{ cueId: string; text: string }>) {
        const { cueId, text } = action.payload;
        const index = findCueIndex({ state, cueId });
        const cue = state.cues[index];

        if (!cue || cue.text === text) return;

        state.cues[index] = updateCueText({ cue, text, language: state.language });
      },
      prepare: prepareWithHistory((payload: { cueId: string; text: string }) => `text:${payload.cueId}`),
    },

    cueTimingChanged: {
      reducer(state, action: HistoryAction<CueTimingChangedPayload>) {
        const { cueId, start, end, mediaDurationSec } = action.payload;
        const index = findCueIndex({ state, cueId });
        const cue = state.cues[index];

        if (!cue) return;

        const timing = clampCueTiming({ cues: state.cues, index, start, end, mediaDurationSec });

        if (timing.start === cue.start && timing.end === cue.end) return;

        state.cues[index] = retimeCue({ cue, ...timing });
      },
      prepare: prepareWithHistory((payload: CueTimingChangedPayload) => payload.gestureId ?? `timing:${payload.cueId}`),
    },

    cueSplit: {
      reducer(state, action: HistoryAction<{ cueId: string; textOffset: number | null; newCueId: string }>) {
        const { cueId, textOffset, newCueId } = action.payload;
        const index = findCueIndex({ state, cueId });
        const cue = state.cues[index];

        if (!cue) return;

        const splitCues = splitCue({ cue, textOffset, language: state.language, newCueId });

        if (splitCues) state.cues.splice(index, 1, ...splitCues);
      },
      prepare: prepareWithHistory<{ cueId: string; textOffset: number | null; newCueId: string }>(),
    },

    cueMergedWithNext: {
      reducer(state, action: HistoryAction<{ cueId: string }>) {
        const index = findCueIndex({ state, cueId: action.payload.cueId });
        const cue = state.cues[index];
        const nextCue = state.cues[index + 1];

        if (!cue || !nextCue) return;

        const mergedCue = mergeCues({ first: cue, second: nextCue, language: state.language });
        state.cues.splice(index, 2, mergedCue);
      },
      prepare: prepareWithHistory<{ cueId: string }>(),
    },

    cueInsertedAfter: {
      reducer(state, action: HistoryAction<{ cueId: string; mediaDurationSec: number; newCueId: string }>) {
        const { cueId, mediaDurationSec, newCueId } = action.payload;
        const index = findCueIndex({ state, cueId });

        if (index === -1) return;

        state.cues = createCueAfter({ cues: state.cues, index, mediaDurationSec, newCueId }).cues;
      },
      prepare: prepareWithHistory<{ cueId: string; mediaDurationSec: number; newCueId: string }>(),
    },

    cueAddedAtTime: {
      reducer(state, action: HistoryAction<{ time: number; mediaDurationSec: number; newCueId: string }>) {
        const { time, mediaDurationSec, newCueId } = action.payload;
        const result = createCueAtTime({ cues: state.cues, time, mediaDurationSec, newCueId });

        if (result) state.cues = result.cues;
      },
      prepare: prepareWithHistory<{ time: number; mediaDurationSec: number; newCueId: string }>(),
    },

    cueDeleted: {
      reducer(state, action: HistoryAction<{ cueId: string }>) {
        state.cues = state.cues.filter((cue) => cue.id !== action.payload.cueId);
      },
      prepare: prepareWithHistory<{ cueId: string }>(),
    },

    cuesReplaced: {
      reducer(state, action: HistoryAction<{ cues: Array<Cue> }>) {
        state.cues = action.payload.cues;
      },
      prepare: prepareWithHistory<{ cues: Array<Cue> }>(),
    },

    cuesTranslated: {
      reducer(state, action: HistoryAction<{ cues: Array<Cue>; language: string }>) {
        state.cues = action.payload.cues;
        state.language = action.payload.language;
      },
      prepare: prepareWithHistory<{ cues: Array<Cue>; language: string }>(),
    },

    styleChanged: {
      reducer(state, action: HistoryAction<Partial<SubtitleStyle>>) {
        Object.assign(state.style, action.payload);
      },
      prepare: prepareWithHistory((payload: Partial<SubtitleStyle>) => `style:${Object.keys(payload).sort().join()}`),
    },

    presetApplied: {
      reducer(state, action: HistoryAction<{ presetId: string }>) {
        const preset = STYLE_PRESETS.find((stylePreset) => stylePreset.id === action.payload.presetId);

        if (preset) Object.assign(state.style, preset.style);
      },
      prepare: prepareWithHistory<{ presetId: string }>(),
    },

    canvasChanged: {
      reducer(state, action: HistoryAction<Partial<CanvasSettings>>) {
        Object.assign(state.canvas, action.payload);
      },
      prepare: prepareWithHistory((payload: Partial<CanvasSettings>) => `canvas:${Object.keys(payload).sort().join()}`),
    },
  },
});

type CueTimingChangedPayload = {
  cueId: string;
  start: number;
  end: number;
  mediaDurationSec: number;
  /**
   * Changes from one drag share an id, so they are undone together.
   */
  gestureId?: string;
};

export const {
  projectLoaded,
  projectCleared,
  cueTextChanged,
  cueTimingChanged,
  cueSplit,
  cueMergedWithNext,
  cueInsertedAfter,
  cueAddedAtTime,
  cueDeleted,
  cuesReplaced,
  cuesTranslated,
  styleChanged,
  presetApplied,
  canvasChanged,
} = projectSlice.actions;

export const projectReducer = undoable({
  reducer: projectSlice.reducer,
  limit: 200,
  coalesceWindowMs: 1000,
  resetActionTypes: [projectLoaded.type, projectCleared.type],
});
