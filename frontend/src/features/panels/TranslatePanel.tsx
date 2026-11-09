import { useState } from 'react';
import { Languages, TriangleAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PanelSection } from '../../components/ui/PanelSection';
import { SelectField } from '../../components/ui/SelectField';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCues, selectIsEditable, selectLanguage, selectSettings } from '../../store/selectors';
import { getLanguageName, getLanguageOptions } from '../new-video/languages';
import { PanelBody, PanelLayout } from '../side-panel/PanelLayout';
import { translateSubtitles } from '../translation/translationPipeline';
import { useTranslationOptions } from '../translation/useTranslationOptions';

const FALLBACK_LANGUAGES: ReadonlyArray<string> = ['en', 'es'];

export function TranslatePanel() {
  const dispatch = useAppDispatch();
  const isEditable = useAppSelector(selectIsEditable);
  const hasCues = useAppSelector(selectCues).length > 0;
  const subtitlesLanguage = useAppSelector(selectLanguage);
  const { translationLanguage: newVideoTarget } = useAppSelector(selectSettings);
  const { options, error } = useTranslationOptions();
  // A choice of "From" only holds for the subtitles it was made for; after a translation, they're in another language.
  const [sourceChoice, setSourceChoice] = useState<{ subtitlesLanguage: string | null; language: string } | null>(null);
  const [targetChoice, setTargetChoice] = useState<string | null>(null);

  const languages = options?.languages ?? [];
  const sourceLanguage =
    sourceChoice?.subtitlesLanguage === subtitlesLanguage ? sourceChoice.language : (subtitlesLanguage ?? 'en');
  const preferredTargets = [targetChoice, newVideoTarget, getBrowserLanguage(), ...FALLBACK_LANGUAGES];
  const targetLanguage =
    preferredTargets.find((code) => code && code !== sourceLanguage && languages.includes(code)) ?? null;
  const isSourceSupported = languages.includes(sourceLanguage);
  const canTranslate = isEditable && hasCues && isSourceSupported && targetLanguage !== null;

  const sourceOptions = getLanguageOptions(isSourceSupported ? languages : [...languages, sourceLanguage]);
  const targetOptions = getLanguageOptions(languages).map((option) => ({
    ...option,
    disabled: option.value === sourceLanguage,
  }));

  function handleTranslate() {
    if (targetLanguage) void dispatch(translateSubtitles({ sourceLanguage, targetLanguage }));
  }

  return (
    <PanelLayout title='Translate'>
      <PanelBody>
        <PanelSection title='Translate the subtitles'>
          <p className='text-xs text-zinc-500'>
            Translates every subtitle into another language. The timing stays the same, and you can undo it.
          </p>
          <div className='grid grid-cols-2 gap-3'>
            <SelectField
              label='From'
              value={sourceLanguage}
              options={sourceOptions}
              onChange={(language) => setSourceChoice({ subtitlesLanguage, language })}
              disabled={!isEditable || !options}
            />
            <SelectField
              label='To'
              value={targetLanguage ?? ''}
              options={targetOptions}
              onChange={setTargetChoice}
              disabled={!isEditable || !options}
            />
          </div>
          {options && !isSourceSupported && (
            <p className='text-xs text-amber-300'>{getLanguageName(sourceLanguage)} can’t be translated yet.</p>
          )}
          {options && !options.model.isDownloaded && (
            <p className='text-xs text-zinc-500'>
              The translator ({options.model.name}) is a {options.model.approximateSizeMb} MB download the first time.
            </p>
          )}
          {error && !options && (
            <p className='flex items-center gap-2 text-xs text-amber-300'>
              <TriangleAlert className='size-3.5 shrink-0' />
              Can’t reach the translation server. Is the backend running?
            </p>
          )}
          <Button variant='primary' className='w-full' onClick={handleTranslate} disabled={!canTranslate}>
            <Languages className='size-4' />
            {targetLanguage ? `Translate to ${getLanguageName(targetLanguage)}` : 'Translate'}
          </Button>
          {!hasCues && <p className='text-xs text-zinc-500'>There are no subtitles to translate yet.</p>}
        </PanelSection>
        <PanelSection title='New videos'>
          <p className='text-xs leading-relaxed text-zinc-500'>
            To translate the subtitles of new videos as soon as they’re transcribed, pick a language under “Translate
            To” when you open a video.
          </p>
        </PanelSection>
      </PanelBody>
    </PanelLayout>
  );
}

function getBrowserLanguage(): string | null {
  const [language] = navigator.language.toLowerCase().split('-');

  return language ?? null;
}
