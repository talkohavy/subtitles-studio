import { describe, expect, it } from 'vite-plus/test';
import { getTrackLanguageCode } from './getTrackLanguageCode';

describe('getTrackLanguageCode', () => {
  it('should turn two-letter codes into the three-letter ones containers use', () => {
    const actualResult = [getTrackLanguageCode('en'), getTrackLanguageCode('he'), getTrackLanguageCode('de')];

    const expectedResult = ['eng', 'heb', 'deu'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should map the codes Whisper doesn’t share with ISO 639', () => {
    const actualResult = [getTrackLanguageCode('jw'), getTrackLanguageCode('yue')];

    const expectedResult = ['jav', 'zho'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should leave the language out when it is unknown', () => {
    const actualResult = [getTrackLanguageCode(null), getTrackLanguageCode('xx')];

    const expectedResult = [undefined, undefined];
    expect(actualResult).toEqual(expectedResult);
  });
});
