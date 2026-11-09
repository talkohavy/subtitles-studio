import { ACCEPTED_SUBTITLES_EXTENSIONS } from './constants';

/**
 * By extension: browsers know the type of few subtitles formats.
 */
export function isSubtitlesFile(file: Pick<File, 'name'>): boolean {
  const lowerCaseName = file.name.toLowerCase();

  return ACCEPTED_SUBTITLES_EXTENSIONS.some((extension) => lowerCaseName.endsWith(extension));
}
