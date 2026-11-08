import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type SyntheticEvent } from 'react';
import { Merge, Plus, Scissors, Trash } from 'lucide-react';
import { cn } from '@src/common/utils/cn';
import { MOD_KEY_LABEL } from '@src/common/utils/platform';
import { player } from '@src/lib/player/playerController';
import { NEW_CUE_TEXT } from '@src/lib/subtitles/cueOperations';
import { IconButton } from '../../components/ui/Button';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectMediaDuration } from '../../store/selectors';
import { cueTextChanged, cueTimingChanged } from '../../store/slices/project.slice';
import { cueSelected } from '../../store/slices/ui.slice';
import { deleteCue, insertCueAfter, mergeCueWithNext, splitCueAt } from './cueThunks';
import { TimeInput } from './TimeInput';
import type { Cue } from '@src/lib/subtitles/types';

const SUPPORTS_FIELD_SIZING = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content');

type CueCardProps = {
  cue: Cue;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  isLast: boolean;
  isEditable: boolean;
  /**
   * Changes whenever this caption's text should get the focus.
   */
  focusNonce: number | null;
};

export function CueCard(props: CueCardProps) {
  const { cue, index, isActive, isSelected, isLast, isEditable, focusNonce } = props;

  const dispatch = useAppDispatch();
  const mediaDurationSec = useAppSelector(selectMediaDuration);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /**
   * Where the text cursor was, for splitting there (clicking the split button moves the focus away).
   */
  const caretRef = useRef<number | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (focusNonce === null || !textarea) return;

    cardRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    textarea.focus({ preventScroll: true });

    if (textarea.value === NEW_CUE_TEXT) {
      textarea.select();
    } else {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, [focusNonce]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (SUPPORTS_FIELD_SIZING || !textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [cue.text]);

  function handleFocus() {
    dispatch(cueSelected(cue.id));

    const time = player.getCurrentTime();

    if (time < cue.start || time >= cue.end) player.seek(cue.start);
  }

  function rememberCaret(event: SyntheticEvent<HTMLTextAreaElement>) {
    caretRef.current = event.currentTarget.selectionStart;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      dispatch(splitCueAt({ cueId: cue.id, textOffset: event.currentTarget.selectionStart }));
      return;
    }

    if (event.key === 'Escape') event.currentTarget.blur();
  }

  function handleTimingCommit(timing: { start: number; end: number }) {
    dispatch(cueTimingChanged({ cueId: cue.id, ...timing, mediaDurationSec }));
  }

  return (
    <div
      ref={cardRef}
      data-cue-index={index}
      className={cn(
        'group rounded-xl border p-2.5 transition-colors [contain-intrinsic-size:auto_104px] [content-visibility:auto]',
        isActive ? 'border-violet-500/50 bg-violet-500/10' : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700',
        isSelected && 'ring-1 ring-violet-400/50',
      )}
    >
      <div className='mb-1 flex items-center gap-1'>
        <span className='w-7 pl-1 text-[11px] font-medium text-zinc-500 tabular-nums'>{index + 1}</span>
        <TimeInput
          label='Start time'
          value={cue.start}
          disabled={!isEditable}
          onCommit={(start) => handleTimingCommit({ start, end: cue.end })}
        />
        <span className='text-xs text-zinc-600'>–</span>
        <TimeInput
          label='End time'
          value={cue.end}
          disabled={!isEditable}
          onCommit={(end) => handleTimingCommit({ start: cue.start, end })}
        />
        {isEditable && (
          <div
            className={cn(
              'ml-auto flex items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100',
              isSelected && 'opacity-100',
            )}
          >
            <IconButton
              label='Split at the cursor'
              shortcut={`${MOD_KEY_LABEL}↵`}
              icon={<Scissors className='size-3.5' />}
              className='size-7'
              onClick={() => dispatch(splitCueAt({ cueId: cue.id, textOffset: caretRef.current }))}
            />
            <IconButton
              label='Merge with the next subtitle'
              icon={<Merge className='size-3.5' />}
              className='size-7'
              disabled={isLast}
              onClick={() => dispatch(mergeCueWithNext(cue.id))}
            />
            <IconButton
              label='Add a subtitle after this one'
              icon={<Plus className='size-3.5' />}
              className='size-7'
              onClick={() => dispatch(insertCueAfter(cue.id))}
            />
            <IconButton
              label='Delete'
              icon={<Trash className='size-3.5' />}
              className='size-7 hover:text-red-400'
              onClick={() => dispatch(deleteCue(cue.id))}
            />
          </div>
        )}
      </div>
      <textarea
        ref={textareaRef}
        dir='auto'
        aria-label={`Subtitle ${index + 1} text`}
        value={cue.text}
        rows={1}
        readOnly={!isEditable}
        onChange={(event) => dispatch(cueTextChanged({ cueId: cue.id, text: event.target.value }))}
        onFocus={handleFocus}
        onSelect={rememberCaret}
        onKeyDown={handleKeyDown}
        className='block min-h-9 w-full resize-none overflow-hidden rounded-lg bg-transparent px-2 py-1.5 text-sm leading-relaxed text-zinc-100 outline-none [field-sizing:content] hover:bg-zinc-800/40 focus:bg-zinc-800/70'
      />
    </div>
  );
}
