import type { ReactNode } from 'react';
import { Captions, ChevronDown, Download, FileText, Film } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { Button } from '../../components/ui/Button';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCues, selectIsEditable, selectSession } from '../../store/selectors';
import { exportDialogToggled } from '../../store/slices/ui.slice';
import { downloadSubtitles } from '../export/downloadSubtitles';
import type { SubtitleFormatValues } from '@src/lib/subtitles/subtitleFormats';

export function ExportMenu() {
  const dispatch = useAppDispatch();
  const isEditable = useAppSelector(selectIsEditable);
  const cues = useAppSelector(selectCues);
  const { fileName } = useAppSelector(selectSession);

  const hasCues = cues.length > 0;

  function handleDownload(format: SubtitleFormatValues) {
    downloadSubtitles({ cues, format, videoFileName: fileName ?? 'subtitles' });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant='primary' size='sm' disabled={!isEditable} className='pr-2'>
          <Download className='size-4' />
          Export
          <ChevronDown className='size-4 opacity-70' />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align='end'
          sideOffset={6}
          className='z-50 w-72 animate-fade-in rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl'
        >
          <ExportMenuItem
            icon={<Film className='size-4' />}
            title='Video with subtitles'
            description='MP4 with the captions burned in'
            onSelect={() => dispatch(exportDialogToggled(true))}
          />
          <DropdownMenu.Separator className='my-1.5 h-px bg-zinc-800' />
          <DropdownMenu.Label className='px-2.5 py-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase'>
            Subtitle files
          </DropdownMenu.Label>
          <ExportMenuItem
            icon={<Captions className='size-4' />}
            title='SRT'
            description='Works with YouTube, Premiere, VLC…'
            disabled={!hasCues}
            onSelect={() => handleDownload('srt')}
          />
          <ExportMenuItem
            icon={<Captions className='size-4' />}
            title='WebVTT'
            description='For HTML5 video players'
            disabled={!hasCues}
            onSelect={() => handleDownload('vtt')}
          />
          <ExportMenuItem
            icon={<FileText className='size-4' />}
            title='Plain text'
            description='The transcript, one caption per line'
            disabled={!hasCues}
            onSelect={() => handleDownload('txt')}
          />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type ExportMenuItemProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onSelect: () => void;
  disabled?: boolean;
};

function ExportMenuItem(props: ExportMenuItemProps) {
  const { icon, title, description, onSelect, disabled } = props;

  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      disabled={disabled}
      className='flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-zinc-800'
    >
      <span className='mt-0.5 text-violet-400'>{icon}</span>
      <span className='space-y-0.5'>
        <span className='block text-sm font-medium text-zinc-100'>{title}</span>
        <span className='block text-xs text-zinc-500'>{description}</span>
      </span>
    </DropdownMenu.Item>
  );
}
