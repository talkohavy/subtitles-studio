import { useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { countMatches, findAndReplace, removeFillerWords, removePunctuation } from '@src/lib/subtitles/cleanupText';
import { Button } from '../../components/ui/Button';
import { PanelSection } from '../../components/ui/PanelSection';
import { SwitchField } from '../../components/ui/SwitchField';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCues, selectIsEditable, selectLanguage, selectSettings } from '../../store/selectors';
import { cuesReplaced } from '../../store/slices/project.slice';
import { TranscriptionFields } from '../new-video/TranscriptionFields';
import { TranslateToField } from '../new-video/TranslateToField';
import { PanelBody, PanelLayout } from '../side-panel/PanelLayout';
import { CaptionLengthSetting } from '../subtitles/CaptionSettingsPopover';
import { retranscribe } from '../transcription/transcriptionPipeline';

export function EnhancePanel() {
  const isEditable = useAppSelector(selectIsEditable);
  const hasAudio = useAppSelector((state) => state.session.video?.hasAudio ?? false);

  return (
    <PanelLayout title='Enhance'>
      <PanelBody>
        <CleanUpSection isEditable={isEditable} />
        <FindAndReplaceSection isEditable={isEditable} />
        <PanelSection title='Captions'>
          <CaptionLengthSetting />
        </PanelSection>
        {hasAudio && <TranscribeAgainSection isEditable={isEditable} />}
      </PanelBody>
    </PanelLayout>
  );
}

function pluralize(props: { count: number; singular: string; plural: string }): string {
  const { count, singular, plural } = props;

  return `${count} ${count === 1 ? singular : plural}`;
}

function CleanUpSection(props: { isEditable: boolean }) {
  const { isEditable } = props;

  const dispatch = useAppDispatch();
  const cues = useAppSelector(selectCues);

  const fillerResult = removeFillerWords(cues);
  const punctuationResult = removePunctuation(cues);

  function applyFillerRemoval() {
    dispatch(cuesReplaced({ cues: fillerResult.cues }));
    toast.success(
      `Removed filler words from ${pluralize({ count: fillerResult.changedCount, singular: 'subtitle', plural: 'subtitles' })}.`,
    );
  }

  function applyPunctuationRemoval() {
    dispatch(cuesReplaced({ cues: punctuationResult.cues }));
    toast.success(
      `Removed punctuation from ${pluralize({ count: punctuationResult.changedCount, singular: 'subtitle', plural: 'subtitles' })}.`,
    );
  }

  return (
    <PanelSection title='Clean up'>
      <ActionRow
        title='Remove filler words'
        description='“Um”, “uh”, “er”, “hmm” and the like.'
        action={
          <Button size='sm' onClick={applyFillerRemoval} disabled={!isEditable || fillerResult.changedCount === 0}>
            {fillerResult.changedCount > 0 ? `Fix ${fillerResult.changedCount}` : 'None found'}
          </Button>
        }
      />
      <ActionRow
        title='Remove punctuation'
        description='Commas and periods, for a cleaner look.'
        action={
          <Button
            size='sm'
            onClick={applyPunctuationRemoval}
            disabled={!isEditable || punctuationResult.changedCount === 0}
          >
            {punctuationResult.changedCount > 0 ? `Fix ${punctuationResult.changedCount}` : 'None found'}
          </Button>
        }
      />
    </PanelSection>
  );
}

function ActionRow(props: { title: string; description: string; action: ReactNode }) {
  const { title, description, action } = props;

  return (
    <div className='flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3'>
      <div className='min-w-0 space-y-0.5'>
        <p className='text-sm text-zinc-200'>{title}</p>
        <p className='text-xs text-zinc-500'>{description}</p>
      </div>
      {action}
    </div>
  );
}

const INPUT_CLASS_NAME =
  'h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500 disabled:opacity-50';

function FindAndReplaceSection(props: { isEditable: boolean }) {
  const { isEditable } = props;

  const dispatch = useAppDispatch();
  const cues = useAppSelector(selectCues);
  const language = useAppSelector(selectLanguage);
  const [find, setFind] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [matchCase, setMatchCase] = useState(false);

  const matchCount = find ? countMatches({ cues, find, matchCase }) : 0;

  function handleReplaceAll() {
    const result = findAndReplace({ cues, find, replaceWith, matchCase, language });
    dispatch(cuesReplaced({ cues: result.cues }));
    toast.success(`Replaced ${pluralize({ count: matchCount, singular: 'match', plural: 'matches' })}.`);
  }

  return (
    <PanelSection title='Find and replace'>
      <input
        aria-label='Find'
        placeholder='Find'
        value={find}
        dir='auto'
        onChange={(event) => setFind(event.target.value)}
        disabled={!isEditable}
        className={INPUT_CLASS_NAME}
      />
      <input
        aria-label='Replace with'
        placeholder='Replace with'
        value={replaceWith}
        dir='auto'
        onChange={(event) => setReplaceWith(event.target.value)}
        disabled={!isEditable}
        className={INPUT_CLASS_NAME}
      />
      <SwitchField label='Match case' checked={matchCase} onChange={setMatchCase} disabled={!isEditable} />
      <div className='flex items-center justify-between gap-3'>
        <span className='text-xs text-zinc-500'>
          {find ? pluralize({ count: matchCount, singular: 'match', plural: 'matches' }) : ''}
        </span>
        <Button size='sm' variant='primary' onClick={handleReplaceAll} disabled={!isEditable || matchCount === 0}>
          Replace all
        </Button>
      </div>
    </PanelSection>
  );
}

function TranscribeAgainSection(props: { isEditable: boolean }) {
  const { isEditable } = props;

  const dispatch = useAppDispatch();
  const { language, modelId } = useAppSelector(selectSettings);

  function handleTranscribeAgain() {
    const isConfirmed = window.confirm('Transcribe the video again? This replaces all the current subtitles.');

    if (isConfirmed) void dispatch(retranscribe({ language, modelId }));
  }

  return (
    <PanelSection title='Transcribe again'>
      <p className='text-xs text-zinc-500'>
        Mistakes in the transcript? Try a more accurate model, or set the language instead of detecting it.
      </p>
      <TranscriptionFields disabled={!isEditable} />
      <TranslateToField disabled={!isEditable} />
      <Button className='w-full' onClick={handleTranscribeAgain} disabled={!isEditable}>
        <RotateCcw className='size-4' />
        Transcribe again
      </Button>
    </PanelSection>
  );
}
