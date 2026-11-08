import { Languages, ShieldCheck, Sparkles } from 'lucide-react';
import { useAppDispatch } from '../../store';
import { openVideo } from '../transcription/transcriptionPipeline';
import { TranscriptionSettingsFields } from './TranscriptionSettingsFields';
import { useTranscriptionOptions } from './useTranscriptionOptions';
import { VideoDropzone } from './VideoDropzone';

export function EmptyStage() {
  const dispatch = useAppDispatch();
  const { options } = useTranscriptionOptions();

  const languageCount = options?.languages.length ?? 0;

  return (
    // `m-auto` centers it, but unlike `items-center` keeps the top reachable when the window is short.
    <div className='m-auto w-full max-w-xl animate-fade-in py-6'>
      <div className='mb-8 text-center'>
        <h1 className='text-3xl font-semibold tracking-tight text-zinc-50'>Add subtitles to any video</h1>
        <p className='mx-auto mt-3 max-w-md text-zinc-400'>
          Drop a video and get accurate, word-by-word timed captions in minutes. Then style them and export.
        </p>
      </div>
      <div className='space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl'>
        <TranscriptionSettingsFields />
        <VideoDropzone onFile={(file) => void dispatch(openVideo(file))} />
      </div>
      <ul className='mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-zinc-500'>
        <li className='flex items-center gap-1.5'>
          <ShieldCheck className='size-3.5' />
          Your video stays in your browser. Only its audio is transcribed.
        </li>
        {languageCount > 0 && (
          <li className='flex items-center gap-1.5'>
            <Languages className='size-3.5' />
            {languageCount} languages
          </li>
        )}
        <li className='flex items-center gap-1.5'>
          <Sparkles className='size-3.5' />
          Word-level timing
        </li>
      </ul>
    </div>
  );
}
