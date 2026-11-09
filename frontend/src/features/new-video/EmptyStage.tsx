import { Languages, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranscriptionOptions } from './useTranscriptionOptions';
import { VideoDropzone } from './VideoDropzone';
import { videoSetupStore } from './videoSetupStore';

export function EmptyStage() {
  const { options } = useTranscriptionOptions();

  const languageCount = options?.languages.length ?? 0;

  return (
    // `m-auto` centers it, but unlike `items-center` keeps the top reachable when the window is short.
    <div className='m-auto w-full max-w-xl animate-fade-in py-6'>
      <div className='mb-8 text-center'>
        <h1 className='text-3xl font-semibold tracking-tight text-zinc-50'>Add subtitles to any video</h1>
        <p className='mx-auto mt-3 max-w-md text-zinc-400'>
          Drop a video and get accurate, word-by-word timed captions in minutes, or bring a subtitles file you already
          have. Then style, translate and export them.
        </p>
      </div>
      <div className='rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl'>
        <VideoDropzone onFiles={(files) => videoSetupStore.open(files)} />
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
