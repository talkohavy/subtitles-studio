import { useEffect } from 'react';
import { SelectField, type SelectOption } from '../../components/ui/SelectField';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectSettings } from '../../store/selectors';
import { settingsChanged } from '../../store/slices/settings.slice';
import { useTranslationOptions } from '../translation/useTranslationOptions';
import { getLanguageOptions } from './languages';
import { getUnlistedTranslationSettings } from './unlistedSettings';

const NO_TRANSLATION = 'none';
const NO_TRANSLATION_OPTION: SelectOption<string> = { value: NO_TRANSLATION, label: 'Don’t translate' };

/**
 * The language a new video's subtitles are translated into once they're made, if any.
 */
export function TranslateToField(props: { disabled?: boolean }) {
  const { disabled } = props;

  const dispatch = useAppDispatch();
  const { translationLanguage } = useAppSelector(selectSettings);
  const { options } = useTranslationOptions();

  useEffect(() => {
    if (!options) return;

    const resets = getUnlistedTranslationSettings({ translationLanguage, options });

    if (resets) dispatch(settingsChanged(resets));
  }, [options, translationLanguage, dispatch]);

  // Until the languages load, the remembered one is offered on its own, so the field doesn't flicker.
  const languageCodes = options?.languages ?? (translationLanguage ? [translationLanguage] : []);
  const languageOptions = [NO_TRANSLATION_OPTION, ...getLanguageOptions(languageCodes)];
  const isLanguageListed = languageOptions.some((option) => option.value === translationLanguage);
  const model = options?.model;

  return (
    <div className='space-y-3'>
      <SelectField
        label='Translate To'
        value={translationLanguage && isLanguageListed ? translationLanguage : NO_TRANSLATION}
        options={languageOptions}
        onChange={(value) =>
          dispatch(settingsChanged({ translationLanguage: value === NO_TRANSLATION ? null : value }))
        }
        disabled={disabled}
      />
      {translationLanguage && model && !model.isDownloaded && (
        <p className='text-xs text-zinc-500'>
          The translator ({model.name}) is a {model.approximateSizeMb} MB download the first time.
        </p>
      )}
    </div>
  );
}
