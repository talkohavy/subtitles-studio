import { describe, expect, it } from 'vite-plus/test';
import { getLanguageName, getLanguageOptions } from './languages';

describe('getLanguageName', () => {
  it('should name languages in English', () => {
    const actualResult = [getLanguageName('he'), getLanguageName('ja')];

    expect(actualResult).toEqual(['Hebrew', 'Japanese']);
  });

  it('should name Whisper’s non-standard codes', () => {
    const actualResult = getLanguageName('jw');

    expect(actualResult).toBe('Javanese');
  });
});

describe('getLanguageOptions', () => {
  it('should sort the languages by name', () => {
    const actualResult = getLanguageOptions(['ja', 'en', 'he']);

    const expectedResult = [
      { value: 'en', label: 'English' },
      { value: 'he', label: 'Hebrew' },
      { value: 'ja', label: 'Japanese' },
    ];
    expect(actualResult).toEqual(expectedResult);
  });
});
