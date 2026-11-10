/**
 * "1 subtitle", "1,204 subtitles", or with an irregular plural, "3 matches".
 */
export function formatCount(props: { count: number; noun: string; plural?: string }): string {
  const { count, noun, plural = `${noun}s` } = props;

  const formattedCount = `${count.toLocaleString('en')} ${count === 1 ? noun : plural}`;

  return formattedCount;
}
