import { Settings } from 'lucide-react';
import { Popover } from 'radix-ui';
import { CAPTION_LENGTH_OPTIONS, type CaptionLengthValues } from '@src/lib/subtitles/constants';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectIsEditable, selectSettings } from '../../store/selectors';
import { regroupCaptions } from '../transcription/transcriptionPipeline';

export function CaptionSettingsPopover() {
  const isEditable = useAppSelector(selectIsEditable);

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label='Subtitle settings'
        disabled={!isEditable}
        className='flex size-8 items-center justify-center rounded-md text-zinc-400 outline-none hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:opacity-40 disabled:hover:bg-transparent'
      >
        <Settings className='size-4' />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align='end'
          sideOffset={6}
          className='z-50 w-80 animate-fade-in rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl'
        >
          <CaptionLengthSetting />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * How many words each caption holds. Changing it regroups every caption.
 */
export function CaptionLengthSetting() {
  const dispatch = useAppDispatch();
  const { captionLength } = useAppSelector(selectSettings);
  const isEditable = useAppSelector(selectIsEditable);

  const options = CAPTION_LENGTH_OPTIONS.map((option) => ({ value: option.value, label: option.label }));

  return (
    <div className='space-y-2'>
      <SegmentedControl<CaptionLengthValues>
        label='Caption length'
        value={captionLength}
        options={options}
        onChange={(value) => dispatch(regroupCaptions(value))}
        disabled={!isEditable}
      />
      <p className='text-xs leading-relaxed text-zinc-500'>
        Regroups the words into new captions. Your text edits are kept; manual timing changes are not.
      </p>
    </div>
  );
}
