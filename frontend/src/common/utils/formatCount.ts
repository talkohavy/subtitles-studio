/**
 * "1 subtitle", "1,204 subtitles". For nouns whose plural only adds an "s".
 */
export function formatCount(props: { count: number; noun: string }): string {
  const { count, noun } = props;

  const formattedCount = `${count.toLocaleString('en')} ${count === 1 ? noun : `${noun}s`}`;

  return formattedCount;
}
