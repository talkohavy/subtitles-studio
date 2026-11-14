import { MOD_KEY_LABEL } from '@src/common/utils/platform';
import { PanelSection } from '../../components/ui/PanelSection';
import { PanelBody, PanelLayout } from '../side-panel/PanelLayout';

const SHORTCUTS: ReadonlyArray<{ keys: Array<string>; description: string }> = [
  { keys: ['Space'], description: 'Play or pause' },
  { keys: ['←', '→'], description: 'Back or forward 1 second' },
  { keys: ['⇧ ←', '⇧ →'], description: 'Back or forward 5 seconds' },
  { keys: ['↑', '↓'], description: 'Previous or next subtitle' },
  { keys: ['M'], description: 'Mute' },
  { keys: [`${MOD_KEY_LABEL}Z`], description: 'Undo' },
  { keys: [`⇧${MOD_KEY_LABEL}Z`], description: 'Redo' },
  { keys: [`${MOD_KEY_LABEL}↵`], description: 'Split the subtitle at the text cursor' },
  { keys: ['Esc'], description: 'Stop editing a subtitle' },
];

const TIPS: ReadonlyArray<string> = [
  'Click a subtitle on the video to edit its text; drag it to move it up or down.',
  'Drag a subtitle on the timeline to move it, or its edges to change when it starts and ends.',
  'Double-click an empty spot on the timeline to add a subtitle there.',
  'Hold Ctrl (or ⌘) and scroll over the timeline to zoom.',
  'Changing a subtitle’s text keeps its timing, word by word where possible.',
  'Translate the subtitles into another language from the Translate panel; undo brings back the original.',
  'Have subtitles already? Drop the video and its SRT, VTT, ASS or SBV file together, and pick “Use my subtitles file” to skip transcribing, or to just translate them.',
  'Drop a subtitles file on the open video to use its subtitles instead; undo brings back the ones you had.',
];

export function HelpPanel() {
  return (
    <PanelLayout title='Help'>
      <PanelBody>
        <PanelSection title='Keyboard shortcuts'>
          <dl className='space-y-2'>
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.description} className='flex items-center justify-between gap-3 text-sm'>
                <dt className='text-zinc-400'>{shortcut.description}</dt>
                <dd className='flex shrink-0 gap-1'>
                  {shortcut.keys.map((key) => (
                    <kbd
                      key={key}
                      className='rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-sans text-[11px] text-zinc-300'
                    >
                      {key}
                    </kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </PanelSection>
        <PanelSection title='Tips'>
          <ul className='list-disc space-y-2 pl-4 text-sm text-zinc-400 marker:text-zinc-600'>
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </PanelSection>
        <PanelSection title='Privacy'>
          <p className='text-sm leading-relaxed text-zinc-400'>
            Your video never leaves your browser: the audio is extracted on your computer, and only that audio is sent
            to the transcription server, which runs an open-source Whisper model and deletes the audio once it’s done.
            Translations run on the same server with Meta’s open-source NLLB model, and only the subtitles’ text is
            sent. Subtitles files you add are read in your browser, and exports are made there, too.
          </p>
        </PanelSection>
      </PanelBody>
    </PanelLayout>
  );
}
