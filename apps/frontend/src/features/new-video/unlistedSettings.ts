import { AUTO_DETECT_LANGUAGE, type TranscriptionOptions, type TranslationOptions } from '@src/lib/api/types';
import type { SettingsState } from '../../store/slices/settings.slice';

type GetUnlistedTranscriptionSettingsProps = {
  language: string;
  modelId: string | null;
  options: TranscriptionOptions;
};

/**
 * The remembered transcription choices the server no longer offers, reset to what their fields show instead, or `null`
 * when all of them are offered. The server rejects choices it doesn't offer.
 */
export function getUnlistedTranscriptionSettings(
  props: GetUnlistedTranscriptionSettingsProps,
): Partial<SettingsState> | null {
  const { language, modelId, options } = props;

  const resets: Partial<SettingsState> = {};

  if (language !== AUTO_DETECT_LANGUAGE && !options.languages.includes(language))
    resets.language = AUTO_DETECT_LANGUAGE;

  if (modelId !== null && !options.models.some((model) => model.id === modelId)) resets.modelId = null;

  return Object.keys(resets).length > 0 ? resets : null;
}

type GetUnlistedTranslationSettingsProps = {
  translationLanguage: string | null;
  options: TranslationOptions;
};

/**
 * The remembered translation language, reset to "Don’t translate" when the translator no longer offers it.
 */
export function getUnlistedTranslationSettings(
  props: GetUnlistedTranslationSettingsProps,
): Partial<SettingsState> | null {
  const { translationLanguage, options } = props;

  if (translationLanguage === null || options.languages.includes(translationLanguage)) return null;

  return { translationLanguage: null };
}
