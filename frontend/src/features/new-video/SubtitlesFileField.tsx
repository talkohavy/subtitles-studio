import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@src/common/utils/cn';
import { formatCount } from '@src/common/utils/formatCount';
import { formatTime } from '@src/common/utils/formatTime';
import { ACCEPTED_SUBTITLES_TYPES, SUBTITLES_ENCODINGS } from '@src/lib/subtitles/import/constants';
import { isSubtitlesFile } from '@src/lib/subtitles/import/isSubtitlesFile';
import { Button } from '../../components/ui/Button';
import { SelectField, type SelectOption } from '../../components/ui/SelectField';
import { useFileDrop } from '../../hooks/useFileDrop';
import { useFilePicker } from '../../hooks/useFilePicker';
import { ReadingStatuses, type SubtitlesFileReading } from './useSubtitlesFileReading';
import type { SubtitlesFile } from '@src/lib/subtitles/import/readSubtitlesFile';

export const UNKNOWN_LANGUAGE = 'unknown';

const PREVIEW_ENTRY_COUNT = 3;

type SubtitlesFileFieldProps = {
  reading: SubtitlesFileReading | null;
  language: string | null;
  languageOptions: ReadonlyArray<SelectOption<string>>;
  onLanguageChange: (language: string | null) => void;
  onEncodingChange: (encoding: string) => void;
  onFile: (file: File) => void;
};

/**
 * Takes a subtitles file (dropped or chosen), and shows what's in it with the language and encoding it's read with.
 */
export function SubtitlesFileField(props: SubtitlesFileFieldProps) {
  const { reading, language, languageOptions, onLanguageChange, onEncodingChange, onFile } = props;

  function handleFiles(files: Array<File>) {
    const subtitlesFile = files.find((file) => isSubtitlesFile(file));

    if (subtitlesFile) onFile(subtitlesFile);
    else toast.error(`“${files[0]?.name}” isn’t a subtitles file. Try an SRT, VTT, ASS or SBV file.`);
  }

  const { isDragOver, dropHandlers } = useFileDrop({ onFiles: handleFiles });
  const { fileInput, openFilePicker } = useFilePicker({ accept: ACCEPTED_SUBTITLES_TYPES, onFiles: handleFiles });

  if (!reading) {
    return (
      <>
        <button
          type='button'
          onClick={openFilePicker}
          {...dropHandlers}
          className={cn(
            'flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors',
            'outline-none focus-visible:border-violet-500',
            isDragOver
              ? 'border-violet-500 bg-violet-500/10'
              : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40',
          )}
        >
          <span className='text-sm text-zinc-200'>
            Drop your subtitles file or <span className='text-violet-400'>click to choose it</span>
          </span>
          <span className='text-xs text-zinc-500'>SRT, VTT, ASS or SBV</span>
        </button>
        {fileInput}
      </>
    );
  }

  const subtitles = reading.status === ReadingStatuses.Ready ? reading.subtitles : null;
  const isEncodingShown = reading.encoding !== null || subtitles?.isEncodingGuessed;

  return (
    <div {...dropHandlers} className={cn('space-y-3 rounded-lg', isDragOver && 'ring-2 ring-violet-500/60')}>
      <div className='flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3'>
        <FileText className='size-4 shrink-0 text-zinc-400' />
        <div className='min-w-0 flex-1 space-y-0.5'>
          <p className='truncate text-sm text-zinc-200'>{reading.file.name}</p>
          <ReadingSummary reading={reading} />
        </div>
        <Button size='sm' variant='ghost' onClick={openFilePicker}>
          Change
        </Button>
      </div>
      {subtitles && <SubtitlesPreview subtitles={subtitles} />}
      {(subtitles || isEncodingShown) && (
        <div className='grid gap-3 sm:grid-cols-2'>
          {subtitles && (
            <SelectField
              label='Subtitles Language'
              value={language ?? UNKNOWN_LANGUAGE}
              options={languageOptions}
              onChange={(value) => onLanguageChange(value === UNKNOWN_LANGUAGE ? null : value)}
            />
          )}
          {isEncodingShown && (
            <SelectField
              label='Text Encoding'
              value={reading.encoding ?? subtitles?.encoding ?? 'utf-8'}
              options={SUBTITLES_ENCODINGS}
              onChange={onEncodingChange}
            />
          )}
        </div>
      )}
      {fileInput}
    </div>
  );
}

function ReadingSummary(props: { reading: SubtitlesFileReading }) {
  const { reading } = props;

  if (reading.status === ReadingStatuses.Reading) return <p className='text-xs text-zinc-500'>Reading…</p>;

  if (reading.status === ReadingStatuses.Failed) return <p className='text-xs text-red-400'>{reading.error}</p>;

  const { entries } = reading.subtitles;
  const firstStart = entries[0]?.start ?? 0;
  const lastEnd = entries.at(-1)?.end ?? 0;

  return (
    <p className='text-xs text-zinc-500'>
      {formatCount({ count: entries.length, noun: 'subtitle' })} · {formatTime(firstStart)} – {formatTime(lastEnd)}
    </p>
  );
}

/**
 * The first few subtitles, to check the file reads right.
 */
function SubtitlesPreview(props: { subtitles: SubtitlesFile }) {
  const { subtitles } = props;

  const previewEntries = subtitles.entries.slice(0, PREVIEW_ENTRY_COUNT);

  return (
    <ol className='space-y-1 rounded-lg bg-zinc-950/70 px-3 py-2.5 text-sm text-zinc-300'>
      {previewEntries.map((entry) => (
        <li key={entry.start} className='flex items-baseline gap-3'>
          <span className='shrink-0 text-xs text-zinc-500 tabular-nums'>{formatTime(entry.start)}</span>
          <span dir='auto' className='min-w-0 flex-1 truncate'>
            {entry.text.replaceAll('\n', ' ')}
          </span>
        </li>
      ))}
    </ol>
  );
}
