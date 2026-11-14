export function Logo() {
  return (
    <div className='flex items-center gap-2.5 select-none'>
      <img src='/favicon.svg' alt='' className='size-7' />
      <span className='text-[15px] font-semibold tracking-tight text-zinc-50'>
        Subtitles <span className='text-violet-400'>Studio</span>
      </span>
    </div>
  );
}
