import { Plus, Redo2, Undo2 } from 'lucide-react';
import { MOD_KEY_LABEL } from '@src/common/utils/platform';
import { Button, IconButton } from '../../components/ui/Button';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCanRedo, selectCanUndo, selectSession } from '../../store/selectors';
import { newVideoDialogToggled } from '../../store/slices/ui.slice';
import { redo, undo } from '../../store/undoable';
import { ExportMenu } from './ExportMenu';
import { Logo } from './Logo';

export function TopBar() {
  const dispatch = useAppDispatch();
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const { fileName } = useAppSelector(selectSession);

  return (
    <header className='flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4'>
      <Logo />
      <div className='mx-1 h-6 w-px bg-zinc-800' />
      <Button size='sm' onClick={() => dispatch(newVideoDialogToggled(true))}>
        <Plus className='size-4' />
        New Video
      </Button>
      {fileName && (
        <span className='hidden min-w-0 truncate text-sm text-zinc-500 md:block' title={fileName}>
          {fileName}
        </span>
      )}
      <div className='ml-auto flex items-center gap-1'>
        <IconButton
          label='Undo'
          shortcut={`${MOD_KEY_LABEL}Z`}
          tooltipSide='bottom'
          icon={<Undo2 className='size-4' />}
          disabled={!canUndo}
          onClick={() => dispatch(undo())}
        />
        <IconButton
          label='Redo'
          shortcut={`⇧${MOD_KEY_LABEL}Z`}
          tooltipSide='bottom'
          icon={<Redo2 className='size-4' />}
          disabled={!canRedo}
          onClick={() => dispatch(redo())}
        />
        <div className='mx-2 h-6 w-px bg-zinc-800' />
        <ExportMenu />
      </div>
    </header>
  );
}
