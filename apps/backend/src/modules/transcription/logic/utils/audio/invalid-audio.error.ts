import { BaseError } from '@src/core/errors/BaseError';

export class InvalidAudioError extends BaseError {
  constructor(message: string) {
    super({ name: InvalidAudioError.name, message });
  }
}
