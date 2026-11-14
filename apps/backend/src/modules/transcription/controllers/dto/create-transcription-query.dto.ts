import Joi from 'joi';
import { AUTO_DETECT_LANGUAGE, WHISPER_LANGUAGE_CODES, WhisperModelIds } from '../../logic/constants';

export const createTranscriptionQuerySchema = Joi.object({
  language: Joi.string()
    .lowercase()
    .valid(AUTO_DETECT_LANGUAGE, ...WHISPER_LANGUAGE_CODES)
    .default(AUTO_DETECT_LANGUAGE)
    .messages({ 'any.only': '"language" must be "auto" or a language code Whisper supports (e.g. "en", "he", "ja")' }),
  model: Joi.string()
    .valid(...Object.values(WhisperModelIds))
    .optional(),
});
