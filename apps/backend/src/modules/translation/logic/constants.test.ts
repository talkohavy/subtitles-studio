import { WHISPER_LANGUAGE_CODES } from '@src/modules/transcription/logic/constants';
import { TRANSLATION_LANGUAGE_CODES } from './constants';

describe('TRANSLATION_LANGUAGE_CODES', () => {
  it('should cover every language Whisper transcribes except Latin, Breton and Hawaiian', () => {
    const actualResult = WHISPER_LANGUAGE_CODES.filter((code) => !TRANSLATION_LANGUAGE_CODES.includes(code));

    const expectedResult = ['la', 'br', 'haw'];
    expect(actualResult).toEqual(expectedResult);
  });
});
