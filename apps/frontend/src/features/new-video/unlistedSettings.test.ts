import { describe, expect, it } from 'vite-plus/test';
import { AUTO_DETECT_LANGUAGE, type TranscriptionOptions, type TranslationOptions } from '@src/lib/api/types';
import { getUnlistedTranscriptionSettings, getUnlistedTranslationSettings } from './unlistedSettings';

const TRANSCRIPTION_OPTIONS: TranscriptionOptions = {
  defaultModelId: 'small',
  maxUploadBytes: 1000,
  models: [
    { id: 'small', name: 'Small', description: '', approximateSizeMb: 500, isDownloaded: true },
    { id: 'large', name: 'Large', description: '', approximateSizeMb: 3000, isDownloaded: false },
  ],
  languages: ['en', 'he'],
};

const TRANSLATION_OPTIONS: TranslationOptions = {
  model: { name: 'NLLB', approximateSizeMb: 600, isDownloaded: true },
  languages: ['en', 'he', 'ja'],
};

describe('getUnlistedTranscriptionSettings', () => {
  it('should keep choices the server offers', () => {
    const actualResult = [
      getUnlistedTranscriptionSettings({ language: 'he', modelId: 'large', options: TRANSCRIPTION_OPTIONS }),
      getUnlistedTranscriptionSettings({
        language: AUTO_DETECT_LANGUAGE,
        modelId: null,
        options: TRANSCRIPTION_OPTIONS,
      }),
    ];

    expect(actualResult).toEqual([null, null]);
  });

  it('should reset the language and model the server no longer offers', () => {
    const actualResult = getUnlistedTranscriptionSettings({
      language: 'xx',
      modelId: 'removed-model',
      options: TRANSCRIPTION_OPTIONS,
    });

    const expectedResult = { language: AUTO_DETECT_LANGUAGE, modelId: null };
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('getUnlistedTranslationSettings', () => {
  it('should keep a language the translator offers, and no translation', () => {
    const actualResult = [
      getUnlistedTranslationSettings({ translationLanguage: 'ja', options: TRANSLATION_OPTIONS }),
      getUnlistedTranslationSettings({ translationLanguage: null, options: TRANSLATION_OPTIONS }),
    ];

    expect(actualResult).toEqual([null, null]);
  });

  it('should stop translating into a language the translator no longer offers', () => {
    const actualResult = getUnlistedTranslationSettings({ translationLanguage: 'xx', options: TRANSLATION_OPTIONS });

    const expectedResult = { translationLanguage: null };
    expect(actualResult).toEqual(expectedResult);
  });
});
