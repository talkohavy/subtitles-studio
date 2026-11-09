import { ExportDialog } from './features/export/ExportDialog';
import { GlobalDropOverlay } from './features/new-video/GlobalDropOverlay';
import { NewVideoDialog } from './features/new-video/NewVideoDialog';
import { VideoSetupDialog } from './features/new-video/VideoSetupDialog';
import { PreviewStage } from './features/preview/PreviewStage';
import { useKeyboardShortcuts } from './features/shortcuts/useKeyboardShortcuts';
import { SidePanel } from './features/side-panel/SidePanel';
import { ToolRail } from './features/side-panel/ToolRail';
import { TimelinePanel } from './features/timeline/TimelinePanel';
import { TopBar } from './features/top-bar/TopBar';
import { useWarnBeforeLeaving } from './hooks/useWarnBeforeLeaving';
import { useAppSelector } from './store';
import { selectHasProject } from './store/selectors';

export function App() {
  const hasProject = useAppSelector(selectHasProject);

  useKeyboardShortcuts();
  useWarnBeforeLeaving(hasProject);

  return (
    <div className='flex h-full flex-col'>
      <TopBar />
      <div className='flex min-h-0 flex-1'>
        <main className='flex min-w-0 flex-1 flex-col'>
          <PreviewStage />
          {hasProject && <TimelinePanel />}
        </main>
        {hasProject && (
          <>
            <SidePanel />
            <ToolRail />
          </>
        )}
      </div>
      <NewVideoDialog />
      <VideoSetupDialog />
      <ExportDialog />
      <GlobalDropOverlay />
    </div>
  );
}
