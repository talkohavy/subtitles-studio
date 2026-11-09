import {
  Captions,
  CircleQuestionMark,
  Frame,
  Languages,
  LayoutTemplate,
  Palette,
  RectangleHorizontal,
  Sparkles,
  Type,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@src/common/utils/cn';
import { useAppDispatch, useAppSelector } from '../../store';
import { panelOpened, PanelIds, type PanelIdValues } from '../../store/slices/ui.slice';

type Tool = {
  id: PanelIdValues;
  label: string;
  icon: LucideIcon;
};

const TOOLS: ReadonlyArray<Tool> = [
  { id: PanelIds.Subtitles, label: 'Subtitles', icon: Captions },
  { id: PanelIds.Styles, label: 'Styles', icon: Palette },
  { id: PanelIds.Enhance, label: 'Enhance', icon: WandSparkles },
  { id: PanelIds.Translate, label: 'Translate', icon: Languages },
  { id: PanelIds.Animate, label: 'Animate', icon: Sparkles },
  { id: PanelIds.Font, label: 'Font', icon: Type },
  { id: PanelIds.Layout, label: 'Layout', icon: LayoutTemplate },
  { id: PanelIds.Background, label: 'Background', icon: RectangleHorizontal },
  { id: PanelIds.Canvas, label: 'Canvas', icon: Frame },
];

const HELP_TOOL: Tool = { id: PanelIds.Help, label: 'Help', icon: CircleQuestionMark };

export function ToolRail() {
  const activePanel = useAppSelector((state) => state.ui.activePanel);

  return (
    <nav
      aria-label='Editing tools'
      className='flex w-[72px] shrink-0 flex-col gap-1 border-l border-zinc-800 bg-zinc-950 p-1.5'
    >
      {TOOLS.map((tool) => (
        <ToolButton key={tool.id} tool={tool} isActive={tool.id === activePanel} />
      ))}
      <div className='mt-auto'>
        <ToolButton tool={HELP_TOOL} isActive={activePanel === HELP_TOOL.id} />
      </div>
    </nav>
  );
}

function ToolButton(props: { tool: Tool; isActive: boolean }) {
  const { tool, isActive } = props;

  const dispatch = useAppDispatch();
  const Icon = tool.icon;

  return (
    <button
      type='button'
      aria-pressed={isActive}
      onClick={() => dispatch(panelOpened(tool.id))}
      className={cn(
        'flex w-full flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-500/60',
        isActive ? 'bg-violet-500/15 text-violet-300' : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100',
      )}
    >
      <Icon className='size-5' strokeWidth={1.75} />
      {tool.label}
    </button>
  );
}
