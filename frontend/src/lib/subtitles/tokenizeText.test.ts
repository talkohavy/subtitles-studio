import { describe, expect, it } from 'vite-plus/test';
import { isUnspacedLanguage, joinWords, tokenizeText } from './tokenizeText';

describe('tokenizeText', () => {
  it('should keep the whitespace before each word', () => {
    const actualResult = tokenizeText({ text: 'Hi there  friend', language: 'en' });

    const expectedResult = ['Hi', ' there', '  friend'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should return no words for blank text', () => {
    const actualResult = tokenizeText({ text: '   ', language: 'en' });

    expect(actualResult).toEqual([]);
  });

  it('should split unspaced Japanese text into several words that restore it', () => {
    const text = '今日はいい天気ですね。';

    const tokens = tokenizeText({ text, language: 'ja' });
    const actualResult = { hasSeveralWords: tokens.length > 1, joined: tokens.join('') };

    const expectedResult = { hasSeveralWords: true, joined: text };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should attach punctuation to the word before it in unspaced languages', () => {
    const actualResult = tokenizeText({ text: 'はい。本当に', language: 'ja' });

    const expectedResult = ['はい。', '本当に'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should attach an opening quote to the word after it in unspaced languages', () => {
    const actualResult = tokenizeText({ text: '彼は「はい」と', language: 'ja' });

    const expectedResult = ['彼', 'は', '「はい」', 'と'];
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('joinWords', () => {
  it('should join the words and drop the leading whitespace', () => {
    const actualResult = joinWords([{ text: ' Hi' }, { text: ' there' }]);

    expect(actualResult).toBe('Hi there');
  });
});

describe('isUnspacedLanguage', () => {
  it('should tell languages written without spaces apart', () => {
    const actualResult = [isUnspacedLanguage('ja'), isUnspacedLanguage('en'), isUnspacedLanguage(null)];

    const expectedResult = [true, false, false];
    expect(actualResult).toEqual(expectedResult);
  });
});
