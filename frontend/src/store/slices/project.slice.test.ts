import { describe, expect, it } from 'vite-plus/test';
import { STYLE_PRESETS } from '@src/lib/renderer/presets';
import { undo } from '../undoable';
import {
  cueDeleted,
  cueTextChanged,
  presetApplied,
  projectLoaded,
  projectReducer,
  styleChanged,
} from './project.slice';
import type { UnknownAction } from '@reduxjs/toolkit';
import type { Cue } from '@src/lib/subtitles/types';

type MakeCueProps = {
  id: string;
  start: number;
  text: string;
};

function makeCue(props: MakeCueProps): Cue {
  const { id, start, text } = props;

  return { id, start, end: start + 1, text, words: [{ text, start, end: start + 1 }] };
}

const CUES = [makeCue({ id: 'a', start: 0, text: 'Hello' }), makeCue({ id: 'b', start: 2, text: 'World' })];
const PROJECT_LOADED = projectLoaded({ cues: CUES, language: 'en' });

function applyActions(actions: ReadonlyArray<UnknownAction>) {
  const initialState = projectReducer(undefined, { type: '@@init' });
  const finalState = actions.reduce((state, action) => projectReducer(state, action), initialState);

  return finalState;
}

function getCueTexts(state: ReturnType<typeof applyActions>): Array<string> {
  const cueTexts = state.present.cues.map((cue) => cue.text);

  return cueTexts;
}

describe('projectReducer', () => {
  it('should start a new history when a project is loaded', () => {
    const actions = [PROJECT_LOADED, cueDeleted({ cueId: 'a' }), PROJECT_LOADED];

    const state = applyActions(actions);
    const actualResult = { pastLength: state.past.length, cueTexts: getCueTexts(state) };

    const expectedResult = { pastLength: 0, cueTexts: ['Hello', 'World'] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should bring back a deleted caption on undo', () => {
    const actions = [PROJECT_LOADED, cueDeleted({ cueId: 'a' }), undo()];

    const state = applyActions(actions);
    const actualResult = getCueTexts(state);

    expect(actualResult).toEqual(['Hello', 'World']);
  });

  it('should undo typing in a caption in one step', () => {
    const actions = [
      PROJECT_LOADED,
      cueTextChanged({ cueId: 'a', text: 'Hello t' }),
      cueTextChanged({ cueId: 'a', text: 'Hello th' }),
      cueTextChanged({ cueId: 'a', text: 'Hello there' }),
      undo(),
    ];

    const state = applyActions(actions);
    const actualResult = getCueTexts(state);

    expect(actualResult).toEqual(['Hello', 'World']);
  });

  it('should undo typing in different captions separately', () => {
    const actions = [
      PROJECT_LOADED,
      cueTextChanged({ cueId: 'a', text: 'Hi' }),
      cueTextChanged({ cueId: 'b', text: 'Everyone' }),
      undo(),
    ];

    const state = applyActions(actions);
    const actualResult = getCueTexts(state);

    expect(actualResult).toEqual(['Hi', 'World']);
  });

  it('should re-derive the words when a caption’s text changes', () => {
    const actions = [PROJECT_LOADED, cueTextChanged({ cueId: 'a', text: 'Hello there' })];

    const state = applyActions(actions);
    const actualResult = state.present.cues[0]!.words.map((word) => word.text);

    expect(actualResult).toEqual(['Hello', ' there']);
  });

  it('should apply a preset’s look but keep where the caption sits', () => {
    const preset = STYLE_PRESETS.find((stylePreset) => stylePreset.id === 'karaoke')!;
    const actions = [styleChanged({ positionY: 40 }), presetApplied({ presetId: preset.id })];

    const { style } = applyActions(actions).present;
    const actualResult = { positionY: style.positionY, fontId: style.fontId };

    const expectedResult = { positionY: 40, fontId: preset.style.fontId };
    expect(actualResult).toEqual(expectedResult);
  });
});
