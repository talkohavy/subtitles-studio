import { ACCEPTED_VIDEO_EXTENSIONS } from './constants';

/**
 * Some systems leave the type of e.g. `.mkv` files empty, so the extension is checked too.
 */
export function isVideoFile(file: Pick<File, 'name' | 'type'>): boolean {
  if (file.type.startsWith('video/')) return true;

  const lowerCaseName = file.name.toLowerCase();

  return ACCEPTED_VIDEO_EXTENSIONS.some((extension) => lowerCaseName.endsWith(extension));
}
