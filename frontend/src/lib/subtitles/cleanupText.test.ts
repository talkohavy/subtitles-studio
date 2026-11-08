import { describe, expect, it } from 'vite-plus/test';
import { countMatches, findAndReplace, removeFillerWords, removePunctuation } from './cleanupText';
import { tokenizeText } from './tokenizeText';
import type { Cue } from './types';

type MakeCueProps = {
  text: string;
  /**
   * The caption's position, which is also its start time.
   */
  index?: number;
};

function makeCue(props: MakeCueProps): Cue {
  const { text, index = 0 } = props;

  const tokens = tokenizeText({ text, language: 'en' });
  const words = tokens.map((token, tokenIndex) => ({ text: token, start: index + tokenIndex * 0.1, end: index + 1 }));
  const cue = { id: `cue-${index}`, start: index, end: index + 1, text, words };

  return cue;
}

describe('removeFillerWords', () => {
  it('should remove hesitations and count them', () => {
    const cues = [makeCue({ text: 'Um, so I think, uh, yes' })];

    const result = removeFillerWords(cues);
    const actualResult = { texts: result.cues.map((cue) => cue.text), changedCount: result.changedCount };

    const expectedResult = { texts: ['So I think, yes'], changedCount: 2 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should remove captions that only had hesitations', () => {
    const cues = [makeCue({ text: 'Umm...' }), makeCue({ text: 'Hello', index: 1 })];

    const actualResult = removeFillerWords(cues).cues.map((cue) => cue.text);

    expect(actualResult).toEqual(['Hello']);
  });

  it('should leave captions without hesitations as they are', () => {
    const cues = [makeCue({ text: 'Nothing to remove here' })];

    const actualResult = removeFillerWords(cues).cues[0];

    expect(actualResult).toBe(cues[0]);
  });
});

describe('removePunctuation', () => {
  it('should remove punctuation around words but keep apostrophes', () => {
    const cues = [makeCue({ text: 'Hello, world! It’s fine.' })];

    const result = removePunctuation(cues);
    const actualResult = { texts: result.cues.map((cue) => cue.text), changedCount: result.changedCount };

    const expectedResult = { texts: ['Hello world It’s fine'], changedCount: 1 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should remove captions that were only punctuation', () => {
    const cues = [makeCue({ text: '...' }), makeCue({ text: 'Hi', index: 1 })];

    const actualResult = removePunctuation(cues).cues.map((cue) => cue.text);

    expect(actualResult).toEqual(['Hi']);
  });
});

describe('findAndReplace', () => {
  const cues = [makeCue({ text: 'Cats are great' }), makeCue({ text: 'I love cats', index: 1 })];

  it('should ignore case by default and count the replacements', () => {
    const result = findAndReplace({ cues, find: 'cats', replaceWith: 'dogs', matchCase: false, language: 'en' });
    const actualResult = { texts: result.cues.map((cue) => cue.text), changedCount: result.changedCount };

    const expectedResult = { texts: ['dogs are great', 'I love dogs'], changedCount: 2 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should match case when asked to', () => {
    const result = findAndReplace({ cues, find: 'cats', replaceWith: 'dogs', matchCase: true, language: 'en' });
    const actualResult = result.cues.map((cue) => cue.text);

    expect(actualResult).toEqual(['Cats are great', 'I love dogs']);
  });

  it('should search for the text literally', () => {
    const literalCues = [makeCue({ text: 'a.b axb' })];

    const result = findAndReplace({
      cues: literalCues,
      find: 'a.b',
      replaceWith: 'X',
      matchCase: false,
      language: 'en',
    });
    const actualResult = result.cues[0]!.text;

    expect(actualResult).toBe('X axb');
  });

  it('should re-derive the words of the changed captions', () => {
    const result = findAndReplace({ cues, find: 'great', replaceWith: 'very cute', matchCase: false, language: 'en' });
    const actualResult = result.cues[0]!.words.map((word) => word.text);

    expect(actualResult).toEqual(['Cats', ' are', ' very', ' cute']);
  });
});

describe('countMatches', () => {
  const cues = [makeCue({ text: 'Cats and cats' }), makeCue({ text: 'CATS', index: 1 })];

  it('should count matches in all captions', () => {
    const actualResult = [
      countMatches({ cues, find: 'cats', matchCase: false }),
      countMatches({ cues, find: 'cats', matchCase: true }),
      countMatches({ cues, find: '', matchCase: false }),
    ];

    expect(actualResult).toEqual([3, 1, 0]);
  });
});
