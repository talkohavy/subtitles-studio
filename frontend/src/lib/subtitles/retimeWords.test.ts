import { describe, expect, it } from 'vite-plus/test';
import { retimeWords, spreadTokens } from './retimeWords';

describe('retimeWords', () => {
  it('should keep the word timings when only the spelling changes', () => {
    const previousWords = [
      { text: 'Hello', start: 0, end: 0.5 },
      { text: ' world', start: 0.5, end: 1 },
    ];

    const actualResult = retimeWords({ text: 'Hello World!', previousWords, start: 0, end: 1, language: 'en' });

    const expectedResult = [
      { text: 'Hello', start: 0, end: 0.5 },
      { text: ' World!', start: 0.5, end: 1 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep the timing of untouched words around an inserted one', () => {
    const previousWords = [
      { text: 'I', start: 0, end: 0.2 },
      { text: ' like', start: 0.4, end: 0.6 },
      { text: ' cats', start: 0.7, end: 1 },
    ];

    const actualResult = retimeWords({ text: 'I really like cats', previousWords, start: 0, end: 1, language: 'en' });

    const expectedResult = [
      { text: 'I', start: 0, end: 0.2 },
      { text: ' really', start: 0.2, end: 0.4 },
      { text: ' like', start: 0.4, end: 0.6 },
      { text: ' cats', start: 0.7, end: 1 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should spread all the words over the caption when the inserted ones have no room', () => {
    const previousWords = [
      { text: 'I', start: 0, end: 0.3 },
      { text: ' like', start: 0.3, end: 0.6 },
      { text: ' cats', start: 0.6, end: 1 },
    ];

    const words = retimeWords({ text: 'I really like cats', previousWords, start: 0, end: 1, language: 'en' });
    const actualResult = words.map((word) => Number(word.start.toFixed(3)));

    const expectedResult = [0, 0.067, 0.467, 0.733];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep the words inside the caption', () => {
    const previousWords = [
      { text: 'a', start: 0, end: 0.5 },
      { text: ' b', start: 0.5, end: 1.5 },
    ];

    const actualResult = retimeWords({ text: 'a b', previousWords, start: 0, end: 1, language: 'en' });

    const expectedResult = [
      { text: 'a', start: 0, end: 0.5 },
      { text: ' b', start: 0.5, end: 1 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should return no words for empty text', () => {
    const previousWords = [{ text: 'Gone', start: 0, end: 1 }];

    const actualResult = retimeWords({ text: '', previousWords, start: 0, end: 1, language: 'en' });

    expect(actualResult).toEqual([]);
  });
});

describe('spreadTokens', () => {
  it('should share the time in proportion to word length', () => {
    const actualResult = spreadTokens({ tokens: ['a', ' bbb'], start: 0, end: 4 });

    const expectedResult = [
      { text: 'a', start: 0, end: 1 },
      { text: ' bbb', start: 1, end: 4 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });
});
