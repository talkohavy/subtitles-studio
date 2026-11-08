import { describe, expect, it } from 'vite-plus/test';
import {
  clampCueTiming,
  createCueAfter,
  createCueAtTime,
  findCueIndexAtTime,
  mergeCues,
  rebuildCueFromWords,
  retimeCue,
  splitCue,
  updateCueText,
} from './cueOperations';
import type { Cue } from './types';

function makeCue(props: { id: string; start: number; end: number; text?: string }): Cue {
  const { id, start, end, text = id } = props;

  const cue = { id, start, end, text, words: [{ text, start, end }] };

  return cue;
}

const SENTENCE_CUE: Cue = {
  id: 'sentence',
  start: 0,
  end: 1.5,
  text: 'Hello big world',
  words: [
    { text: 'Hello', start: 0, end: 0.4 },
    { text: ' big', start: 0.5, end: 0.8 },
    { text: ' world', start: 0.9, end: 1.4 },
  ],
};

describe('findCueIndexAtTime', () => {
  const cues = [makeCue({ id: 'a', start: 0, end: 1 }), makeCue({ id: 'b', start: 2, end: 3 })];

  it('should find the caption shown at a time', () => {
    const actualResult = [0.5, 2, 2.99].map((time) => findCueIndexAtTime({ cues, time }));

    const expectedResult = [0, 1, 1];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should find no caption between captions or at a caption’s end', () => {
    const actualResult = [1.5, 3, -1].map((time) => findCueIndexAtTime({ cues, time }));

    const expectedResult = [-1, -1, -1];
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('splitCue', () => {
  it('should split at the text offset, between the two words around it', () => {
    const [left, right] = splitCue({ cue: SENTENCE_CUE, textOffset: 6, language: 'en', newCueId: 'new' })!;
    const actualResult = { left: [left.id, left.text, left.end], right: [right.id, right.text, right.start] };

    const expectedResult = { left: ['sentence', 'Hello', 0.45], right: ['new', 'big world', 0.45] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should split near the middle when there is no text offset', () => {
    const [left, right] = splitCue({ cue: SENTENCE_CUE, textOffset: null, language: 'en', newCueId: 'new' })!;
    const actualResult = [left.text, right.text];

    const expectedResult = ['Hello', 'big world'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should not split a single word', () => {
    const cue = makeCue({ id: 'single', start: 0, end: 1, text: 'Hello' });

    const actualResult = splitCue({ cue, textOffset: null, language: 'en', newCueId: 'new' });

    expect(actualResult).toBeNull();
  });
});

describe('mergeCues', () => {
  it('should join the text and span both captions', () => {
    const first = makeCue({ id: 'first', start: 0, end: 1, text: 'Hello' });
    const second = makeCue({ id: 'second', start: 1.2, end: 2, text: 'world' });

    const merged = mergeCues({ first, second, language: 'en' });
    const actualResult = { id: merged.id, text: merged.text, start: merged.start, end: merged.end };

    const expectedResult = { id: 'first', text: 'Hello world', start: 0, end: 2 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should join without a space in languages written without spaces', () => {
    const first = makeCue({ id: 'first', start: 0, end: 1, text: '今日は' });
    const second = makeCue({ id: 'second', start: 1, end: 2, text: 'いい天気' });

    const actualResult = mergeCues({ first, second, language: 'ja' }).text;

    expect(actualResult).toBe('今日はいい天気');
  });
});

describe('createCueAfter', () => {
  it('should fill the gap after the caption', () => {
    const cues = [makeCue({ id: 'a', start: 0, end: 1 }), makeCue({ id: 'b', start: 5, end: 6 })];

    const { cues: updatedCues } = createCueAfter({ cues, index: 0, mediaDurationSec: 10, newCueId: 'new' });
    const actualResult = updatedCues.map((cue) => [cue.id, cue.start, cue.end]);

    const expectedResult = [
      ['a', 0, 1],
      ['new', 1, 3],
      ['b', 5, 6],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should take the second half of the caption when the gap after it is too small', () => {
    const cues = [makeCue({ id: 'a', start: 0, end: 2 }), makeCue({ id: 'b', start: 2.1, end: 3 })];

    const { cues: updatedCues } = createCueAfter({ cues, index: 0, mediaDurationSec: 10, newCueId: 'new' });
    const actualResult = updatedCues.map((cue) => [cue.id, cue.start, cue.end]);

    const expectedResult = [
      ['a', 0, 1],
      ['new', 1, 2],
      ['b', 2.1, 3],
    ];
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('createCueAtTime', () => {
  it('should insert a caption at the time, in order', () => {
    const cues = [makeCue({ id: 'a', start: 0, end: 1 }), makeCue({ id: 'b', start: 5, end: 6 })];

    const result = createCueAtTime({ cues, time: 2, mediaDurationSec: 10, newCueId: 'new' })!;
    const actualResult = result.cues.map((cue) => [cue.id, cue.start, cue.end]);

    const expectedResult = [
      ['a', 0, 1],
      ['new', 2, 4],
      ['b', 5, 6],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should not insert a caption where there is no room', () => {
    const cues = [makeCue({ id: 'a', start: 0, end: 1 }), makeCue({ id: 'b', start: 1.1, end: 2 })];

    const actualResult = createCueAtTime({ cues, time: 1, mediaDurationSec: 10, newCueId: 'new' });

    expect(actualResult).toBeNull();
  });
});

describe('retimeCue', () => {
  it('should move and stretch the words along with the caption', () => {
    const cue: Cue = {
      id: 'a',
      start: 0,
      end: 2,
      text: 'one two',
      words: [
        { text: 'one', start: 0, end: 1 },
        { text: ' two', start: 1, end: 2 },
      ],
    };

    const actualResult = retimeCue({ cue, start: 1, end: 5 }).words;

    const expectedResult = [
      { text: 'one', start: 1, end: 3 },
      { text: ' two', start: 3, end: 5 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('clampCueTiming', () => {
  const cues = [
    makeCue({ id: 'a', start: 0, end: 1 }),
    makeCue({ id: 'b', start: 2, end: 3 }),
    makeCue({ id: 'c', start: 4, end: 5 }),
  ];

  it('should keep a caption off its neighbors', () => {
    const actualResult = clampCueTiming({ cues, index: 1, start: 0.5, end: 4.5, mediaDurationSec: 10 });

    const expectedResult = { start: 1, end: 4 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep a caption longer than the minimum duration', () => {
    const actualResult = clampCueTiming({ cues, index: 1, start: 3.9, end: 3.95, mediaDurationSec: 10 });

    const expectedResult = { start: 3.8, end: 4 };
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('updateCueText', () => {
  it('should replace the text and re-derive the words from it', () => {
    const updatedCue = updateCueText({ cue: SENTENCE_CUE, text: 'Hello small world', language: 'en' });
    const actualResult = { text: updatedCue.text, words: updatedCue.words.map((word) => word.text) };

    const expectedResult = { text: 'Hello small world', words: ['Hello', ' small', ' world'] };
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('rebuildCueFromWords', () => {
  it('should rebuild the text from the remaining words', () => {
    const words = SENTENCE_CUE.words.slice(1);

    const rebuiltCue = rebuildCueFromWords({ cue: SENTENCE_CUE, words });
    const actualResult = { text: rebuiltCue.text, firstWord: rebuiltCue.words[0]!.text };

    const expectedResult = { text: 'big world', firstWord: 'big' };
    expect(actualResult).toEqual(expectedResult);
  });
});
