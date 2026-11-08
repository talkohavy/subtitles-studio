import { useAppSelector } from '../../store';
import { PanelIds } from '../../store/slices/ui.slice';
import { AnimatePanel } from '../panels/AnimatePanel';
import { BackgroundPanel } from '../panels/BackgroundPanel';
import { CanvasPanel } from '../panels/CanvasPanel';
import { EnhancePanel } from '../panels/EnhancePanel';
import { FontPanel } from '../panels/FontPanel';
import { HelpPanel } from '../panels/HelpPanel';
import { LayoutPanel } from '../panels/LayoutPanel';
import { StylesPanel } from '../panels/StylesPanel';
import { SubtitlesPanel } from '../subtitles/SubtitlesPanel';

export function SidePanel() {
  const activePanel = useAppSelector((state) => state.ui.activePanel);

  return (
    <aside className='flex w-[360px] shrink-0 flex-col border-l border-zinc-800 bg-zinc-950'>
      {activePanel === PanelIds.Subtitles && <SubtitlesPanel />}
      {activePanel === PanelIds.Styles && <StylesPanel />}
      {activePanel === PanelIds.Enhance && <EnhancePanel />}
      {activePanel === PanelIds.Animate && <AnimatePanel />}
      {activePanel === PanelIds.Font && <FontPanel />}
      {activePanel === PanelIds.Layout && <LayoutPanel />}
      {activePanel === PanelIds.Background && <BackgroundPanel />}
      {activePanel === PanelIds.Canvas && <CanvasPanel />}
      {activePanel === PanelIds.Help && <HelpPanel />}
    </aside>
  );
}
