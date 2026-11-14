import { describe, expect, it } from 'vite-plus/test';
import { splitTextByWeights } from './splitTextByWeights';

describe('splitTextByWeights', () => {
  it('should split the text in proportion to the weights', () => {
    const actualResult = splitTextByWeights({
      text: 'one two three four five six',
      weights: [1, 2],
      language: 'en',
    });

    const expectedResult = ['one two', 'three four five six'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should prefer to break after punctuation', () => {
    const actualResult = splitTextByWeights({ text: 'Hello there, my friend', weights: [1, 1], language: 'en' });

    const expectedResult = ['Hello there,', 'my friend'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should avoid ending a piece on a word that leads into the next one', () => {
    const actualResult = splitTextByWeights({ text: 'שמתי את הספר על השולחן', weights: [15, 7], language: 'he' });

    const expectedResult = ['שמתי את הספר', 'על השולחן'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should give every piece a word when there are enough words', () => {
    const actualResult = splitTextByWeights({
      text: 'Yes, absolutely, my friend',
      weights: [10, 1, 1],
      language: 'en',
    });

    const expectedResult = ['Yes, absolutely,', 'my', 'friend'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should leave pieces empty when there are fewer words than pieces', () => {
    const actualResult = splitTextByWeights({ text: 'Sure', weights: [1, 1, 1], language: 'en' });

    const expectedResult = ['', 'Sure', ''];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should split text written without spaces between its words', () => {
    const actualResult = splitTextByWeights({ text: '今日はいい天気ですね。', weights: [1, 1], language: 'ja' });

    const expectedResult = ['今日はいい', '天気ですね。'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should return the whole text for a single piece', () => {
    const actualResult = splitTextByWeights({ text: 'All of it', weights: [3], language: 'en' });

    const expectedResult = ['All of it'];
    expect(actualResult).toEqual(expectedResult);
  });
});
