import { TriangleAlert } from 'lucide-react';
import { AUTO_DETECT_LANGUAGE } from '@src/lib/api/types';
import { SelectField, type SelectOption } from '../../components/ui/SelectField';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectSettings } from '../../store/selectors';
import { settingsChanged } from '../../store/slices/settings.slice';
import { useTranslationOptions } from '../translation/useTranslationOptions';
import { getLanguageOptions } from './languages';
import { useTranscriptionOptions } from './useTranscriptionOptions';

const AUTO_DETECT_OPTION: SelectOption<string> = { value: AUTO_DETECT_LANGUAGE, label: 'Auto Detect' };
const LOADING_MODEL_ID = 'loading';
const NO_TRANSLATION = 'none';
const NO_TRANSLATION_OPTION: SelectOption<string> = { value: NO_TRANSLATION, label: 'Don’t translate' };

export function TranscriptionSettingsFields(props: { disabled?: boolean }) {
  const { disabled } = props;

  const dispatch = useAppDispatch();
  const { language, modelId, translationLanguage } = useAppSelector(selectSettings);
  const { options, error } = useTranscriptionOptions();
  const { options: translationOptions } = useTranslationOptions();

  const languageOptions = [AUTO_DETECT_OPTION, ...getLanguageOptions(options?.languages ?? [])];
  const isLanguageListed = languageOptions.some((option) => option.value === language);

  const modelOptions: Array<SelectOption<string>> = options
    ? options.models.map((model) => ({
        value: model.id,
        label: model.name,
        description: model.isDownloaded
          ? model.description
          : `${model.description} ${model.approximateSizeMb} MB download the first time.`,
      }))
    : [{ value: LOADING_MODEL_ID, label: 'Loading…' }];
  const isModelListed = options?.models.some((model) => model.id === modelId) ?? false;
  const selectedModelId = options ? (isModelListed && modelId ? modelId : options.defaultModelId) : LOADING_MODEL_ID;

  // Until the languages load, the remembered one is offered on its own, so the field doesn't flicker.
  const translationLanguageCodes = translationOptions?.languages ?? (translationLanguage ? [translationLanguage] : []);
  const translationLanguageOptions = [NO_TRANSLATION_OPTION, ...getLanguageOptions(translationLanguageCodes)];
  const isTranslationLanguageListed = translationLanguageOptions.some((option) => option.value === translationLanguage);
  const translationModel = translationOptions?.model;

  return (
    <div className='space-y-3'>
      <div className='grid gap-3 sm:grid-cols-2'>
        <SelectField
          label='Transcription Language'
          value={isLanguageListed ? language : AUTO_DETECT_LANGUAGE}
          options={languageOptions}
          onChange={(value) => dispatch(settingsChanged({ language: value }))}
          disabled={disabled}
        />
        <SelectField
          label='Accuracy'
          value={selectedModelId}
          options={modelOptions}
          onChange={(value) => dispatch(settingsChanged({ modelId: value }))}
          disabled={disabled || !options}
        />
        <SelectField
          label='Translate To'
          className='sm:col-span-2'
          value={translationLanguage && isTranslationLanguageListed ? translationLanguage : NO_TRANSLATION}
          options={translationLanguageOptions}
          onChange={(value) =>
            dispatch(settingsChanged({ translationLanguage: value === NO_TRANSLATION ? null : value }))
          }
          disabled={disabled}
        />
      </div>
      {translationLanguage && translationModel && !translationModel.isDownloaded && (
        <p className='text-xs text-zinc-500'>
          The translator ({translationModel.name}) is a {translationModel.approximateSizeMb} MB download the first time.
        </p>
      )}
      {error && !options && (
        <p className='flex items-center gap-2 text-xs text-amber-300'>
          <TriangleAlert className='size-3.5 shrink-0' />
          Can’t reach the transcription server. Is the backend running?
        </p>
      )}
    </div>
  );
}
