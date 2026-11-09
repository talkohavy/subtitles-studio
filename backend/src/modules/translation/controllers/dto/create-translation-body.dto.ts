import Joi from 'joi';
import { MAX_TEXT_LENGTH, MAX_TEXTS_PER_TRANSLATION, TRANSLATION_LANGUAGE_CODES } from '../../logic/constants';

const languageSchema = Joi.string()
  .lowercase()
  .valid(...TRANSLATION_LANGUAGE_CODES)
  .required()
  .messages({ 'any.only': '{{#label}} must be a language code the translator supports (e.g. "en", "he", "ja")' });

type CreateTranslationBody = {
  sourceLanguage: string;
  targetLanguage: string;
  texts: Array<string>;
};

export const createTranslationBodySchema = Joi.object<CreateTranslationBody>({
  sourceLanguage: languageSchema,
  targetLanguage: languageSchema,
  texts: Joi.array()
    .items(Joi.string().allow('').max(MAX_TEXT_LENGTH))
    .min(1)
    .max(MAX_TEXTS_PER_TRANSLATION)
    .required(),
}).custom((body: CreateTranslationBody, helpers) => {
  if (body.sourceLanguage !== body.targetLanguage) return body;

  return helpers.message({ custom: '"targetLanguage" must differ from "sourceLanguage"' });
});
