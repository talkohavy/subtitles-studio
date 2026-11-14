export const ExportQualities = {
  Standard: 'standard',
  High: 'high',
} as const;

export type ExportQualityValues = (typeof ExportQualities)[keyof typeof ExportQualities];

/**
 * Larger files are rejected up front: the export keeps the whole output video in memory.
 */
export const MAX_VIDEO_FILE_BYTES = 2 * 1024 ** 3;

export const ACCEPTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv'];

export const ACCEPTED_VIDEO_TYPES = 'video/*,.mkv,.mov,.m4v';
