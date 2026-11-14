import { useEffect, useState, type ReactNode } from 'react';
import { AudioLines, FileText, TriangleAlert } from 'lucide-react';
import { RadioGroup } from 'radix-ui';
import { cn } from '@src/common/utils/cn';
import { probeVideo } from '@src/lib/media/probeVideo';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCues, selectSession, selectSettings } from '../../store/selectors';
import { replaceSubtitles } from '../subtitles/subtitlesFileThunks';
import { openVideo, retranscribe } from '../transcription/transcriptionPipeline';
import { useTranslationOptions } from '../translation/useTranslationOptions';
import { getLanguageName, getLanguageOptions } from './languages';
import { SubtitlesFileField, UNKNOWN_LANGUAGE } from './SubtitlesFileField';
import { TranscriptionFields } from './TranscriptionFields';
import { TranslateToField } from './TranslateToField';
import { ReadingStatuses, useSubtitlesFileReading } from './useSubtitlesFileReading';
import { useTranscriptionOptions } from './useTranscriptionOptions';
import { useVideoSetup, videoSetupStore, type VideoSetup } from './videoSetupStore';

const SubtitlesSources = {
  Transcribe: 'transcribe',
  File: 'file',
} as const;

type SubtitlesSourceValues = (typeof SubtitlesSources)[keyof typeof SubtitlesSources];

/**
 * Asks where a video's subtitles come from: a transcription of its audio, or a subtitles file the user has.
 */
export function VideoSetupDialog() {
  const setup = useVideoSetup();

  if (!setup) return null;

  return <VideoSetupForm key={setup.id} setup={setup} />;
}

function VideoSetupForm(props: { setup: VideoSetup }) {
  const { setup } = props;

  const { videoFile, subtitlesFile } = setup;
  const dispatch = useAppDispatch();
  const session = useAppSelector(selectSession);
  const settings = useAppSelector(selectSettings);
  const hasCues = useAppSelector(selectCues).length > 0;
  const { options: transcriptionOptions } = useTranscriptionOptions();
  const { options: translationOptions } = useTranslationOptions();
  const probedHasAudio = useVideoHasAudio(videoFile);
  // Choices hold for the subtitles file they were made with; a new file starts over with what it says.
  const [sourceChoice, setSourceChoice] = useState<{ file: File | null; source: SubtitlesSourceValues } | null>(null);
  const [encodingChoice, setEncodingChoice] = useState<{ file: File; encoding: string } | null>(null);
  const [languageChoice, setLanguageChoice] = useState<{ file: File; language: string | null } | null>(null);

  const isForOpenVideo = videoFile === null;
  const videoName = videoFile?.name ?? session.fileName ?? 'the video';
  const hasAudio = isForOpenVideo ? (session.video?.hasAudio ?? null) : probedHasAudio;
  const encoding = subtitlesFile && encodingChoice?.file === subtitlesFile ? encodingChoice.encoding : null;
  const reading = useSubtitlesFileReading({ file: subtitlesFile, encoding });
  const subtitles = reading?.status === ReadingStatuses.Ready ? reading.subtitles : null;
  const language =
    subtitlesFile && languageChoice?.file === subtitlesFile ? languageChoice.language : (subtitles?.language ?? null);

  const chosenSource = sourceChoice?.file === subtitlesFile ? sourceChoice.source : null;
  const defaultSource = subtitlesFile ? SubtitlesSources.File : SubtitlesSources.Transcribe;
  const source = hasAudio === false ? SubtitlesSources.File : (chosenSource ?? defaultSource);
  const isTranscribing = source === SubtitlesSources.Transcribe;

  const knownLanguages = transcriptionOptions?.languages ?? translationOptions?.languages ?? [];
  const isLanguageKnown = language === null || knownLanguages.includes(language);
  const languageOptions = [
    { value: UNKNOWN_LANGUAGE, label: 'Unknown' },
    ...getLanguageOptions(isLanguageKnown ? knownLanguages : [...knownLanguages, language]),
  ];
  const translationIssue =
    isTranscribing || !subtitles
      ? null
      : getTranslationIssue({
          subtitlesLanguage: language,
          translationLanguage: settings.translationLanguage,
          translatableLanguages: translationOptions?.languages ?? null,
        });
  const canConfirm = isTranscribing ? hasAudio !== false : subtitles !== null && !translationIssue?.isBlocking;

  function handleConfirm() {
    videoSetupStore.close();

    if (isTranscribing) {
      const { language: spokenLanguage, modelId } = settings;
      const thunk = videoFile
        ? openVideo({ file: videoFile, subtitles: null })
        : retranscribe({ language: spokenLanguage, modelId });
      void dispatch(thunk);
      return;
    }

    if (!subtitles) return;

    const chosenSubtitles = { ...subtitles, language };
    const thunk = videoFile
      ? openVideo({ file: videoFile, subtitles: chosenSubtitles })
      : replaceSubtitles({ subtitles: chosenSubtitles, translationLanguage: settings.translationLanguage });
    void dispatch(thunk);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && videoSetupStore.close()}
      title={isForOpenVideo ? 'Redo the subtitles' : 'Choose your subtitles'}
      description={
        isForOpenVideo
          ? `New subtitles for “${videoName}” replace its current ones.`
          : `Transcribe “${videoName}”, or use a subtitles file you already have.`
      }
    >
      <div className='space-y-5'>
        <RadioGroup.Root
          value={source}
          onValueChange={(value) => setSourceChoice({ file: subtitlesFile, source: value as SubtitlesSourceValues })}
          aria-label='Where the subtitles come from'
          className='space-y-2.5'
        >
          <SourceOption
            value={SubtitlesSources.Transcribe}
            icon={<AudioLines className='size-4' />}
            title='Transcribe the audio'
            description={
              hasAudio === false ? 'This video has no sound.' : 'Word-by-word subtitles of what’s said in the video.'
            }
            isSelected={isTranscribing}
            disabled={hasAudio === false}
          >
            <TranscriptionFields />
          </SourceOption>
          <SourceOption
            value={SubtitlesSources.File}
            icon={<FileText className='size-4' />}
            title='Use my subtitles file'
            description='An SRT, VTT, ASS or SBV file. Its text and timing are kept as they are.'
            isSelected={!isTranscribing}
          >
            <SubtitlesFileField
              reading={reading}
              language={language}
              languageOptions={languageOptions}
              onLanguageChange={(nextLanguage) => {
                if (subtitlesFile) setLanguageChoice({ file: subtitlesFile, language: nextLanguage });
              }}
              onEncodingChange={(nextEncoding) => {
                if (subtitlesFile) setEncodingChoice({ file: subtitlesFile, encoding: nextEncoding });
              }}
              onFile={(file) => videoSetupStore.setSubtitlesFile(file)}
            />
          </SourceOption>
        </RadioGroup.Root>
        <div className='space-y-2'>
          <TranslateToField />
          {translationIssue && (
            <p className={cn('text-xs', translationIssue.isBlocking ? 'text-amber-300' : 'text-zinc-500')}>
              {translationIssue.message}
            </p>
          )}
        </div>
        {!isForOpenVideo && hasCues && (
          <p className='flex items-center gap-2 text-xs text-amber-300'>
            <TriangleAlert className='size-3.5 shrink-0' />
            This closes the video you’re working on, along with its subtitles.
          </p>
        )}
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => videoSetupStore.close()}>
            Cancel
          </Button>
          <Button variant='primary' onClick={handleConfirm} disabled={!canConfirm}>
            {isTranscribing ? 'Create subtitles' : 'Use these subtitles'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

type SourceOptionProps = {
  value: SubtitlesSourceValues;
  icon: ReactNode;
  title: string;
  description: string;
  isSelected: boolean;
  disabled?: boolean;
  /**
   * The option's settings, shown while it's selected.
   */
  children: ReactNode;
};

function SourceOption(props: SourceOptionProps) {
  const { value, icon, title, description, isSelected, disabled, children } = props;

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors',
        isSelected ? 'border-violet-500/60 bg-violet-500/5' : 'border-zinc-800 hover:border-zinc-700',
        disabled && 'opacity-50',
      )}
    >
      <RadioGroup.Item
        value={value}
        disabled={disabled}
        className='flex w-full items-start gap-3 rounded-xl p-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:cursor-not-allowed'
      >
        <span
          className={cn(
            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
            isSelected ? 'border-violet-400' : 'border-zinc-600',
          )}
        >
          <RadioGroup.Indicator className='size-2 rounded-full bg-violet-400' />
        </span>
        <span className='min-w-0 flex-1 space-y-0.5'>
          <span className='flex items-center gap-2 text-sm font-medium text-zinc-100'>
            {icon}
            {title}
          </span>
          <span className='block text-xs text-zinc-500'>{description}</span>
        </span>
      </RadioGroup.Item>
      {isSelected && <div className='px-3.5 pb-3.5'>{children}</div>}
    </div>
  );
}

/**
 * Whether the open video file has sound, once it's been read; `null` until then (or when it can't be read).
 */
function useVideoHasAudio(videoFile: File | null): boolean | null {
  const [probe, setProbe] = useState<{ file: File; hasAudio: boolean } | null>(null);

  useEffect(() => {
    if (!videoFile) return;

    let isCurrent = true;

    probeVideo(videoFile).then(
      (videoInfo) => {
        if (isCurrent) setProbe({ file: videoFile, hasAudio: videoInfo.hasAudio });
      },
      // Opening the video reports what's wrong with it.
      () => {},
    );

    return () => {
      isCurrent = false;
    };
  }, [videoFile]);

  return probe?.file === videoFile ? probe.hasAudio : null;
}

type GetTranslationIssueProps = {
  subtitlesLanguage: string | null;
  translationLanguage: string | null;
  /**
   * `null` while they load.
   */
  translatableLanguages: ReadonlyArray<string> | null;
};

/**
 * What stands in the way of translating a subtitles file, if anything. A blocking issue keeps the file from being
 * used until it's fixed (or the translation turned off).
 */
function getTranslationIssue(props: GetTranslationIssueProps): { message: string; isBlocking: boolean } | null {
  const { subtitlesLanguage, translationLanguage, translatableLanguages } = props;

  if (!translationLanguage) return null;

  if (!subtitlesLanguage) {
    return { message: 'Pick the language of the subtitles above, so they can be translated.', isBlocking: true };
  }

  if (subtitlesLanguage === translationLanguage) {
    const message = `The subtitles are already in ${getLanguageName(subtitlesLanguage)}, so they won’t be translated.`;

    return { message, isBlocking: false };
  }

  if (translatableLanguages && !translatableLanguages.includes(subtitlesLanguage)) {
    return { message: `${getLanguageName(subtitlesLanguage)} can’t be translated yet.`, isBlocking: true };
  }

  return null;
}
