/**
 * A problem with the user's file, with a message that can be shown to them as is.
 */
export class MediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaError';
  }
}

/**
 * The video can only be exported without its audio,
 * which needs the user's consent.
 */
export class AudioNotExportableError extends MediaError {
  constructor(message: string) {
    super(message);
    this.name = 'AudioNotExportableError';
  }
}
