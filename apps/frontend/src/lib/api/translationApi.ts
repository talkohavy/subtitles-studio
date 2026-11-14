import { deleteInBackground, requestJson } from './requestJson';
import type { TranslationJob, TranslationOptions } from './types';

const API_PATHS = {
  translations: '/api/translations',
  translationOptions: '/api/translation-options',
} as const;

export async function fetchTranslationOptions(signal?: AbortSignal): Promise<TranslationOptions> {
  const options = await requestJson<TranslationOptions>({ url: API_PATHS.translationOptions, signal });

  return options;
}

type CreateTranslationProps = {
  /**
   * Translated one by one, so each should be a single sentence.
   */
  texts: Array<string>;
  sourceLanguage: string;
  targetLanguage: string;
  signal: AbortSignal;
};

export async function createTranslation(props: CreateTranslationProps): Promise<TranslationJob> {
  const { texts, sourceLanguage, targetLanguage, signal } = props;

  const job = await requestJson<TranslationJob>({
    url: API_PATHS.translations,
    method: 'POST',
    body: { texts, sourceLanguage, targetLanguage },
    signal,
  });

  return job;
}

type FetchTranslationProps = {
  id: string;
  /**
   * Only translations from this index onward are returned.
   */
  translationsFrom: number;
  signal: AbortSignal;
};

export async function fetchTranslation(props: FetchTranslationProps): Promise<TranslationJob> {
  const { id, translationsFrom, signal } = props;

  const url = `${API_PATHS.translations}/${encodeURIComponent(id)}?translationsFrom=${translationsFrom}`;
  const job = await requestJson<TranslationJob>({ url, signal });

  return job;
}

export async function cancelTranslation(id: string): Promise<void> {
  await deleteInBackground(`${API_PATHS.translations}/${encodeURIComponent(id)}`);
}
