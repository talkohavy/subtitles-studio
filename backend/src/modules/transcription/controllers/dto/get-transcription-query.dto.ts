import Joi from 'joi';

export const getTranscriptionQuerySchema = Joi.object({
  wordsFrom: Joi.number().integer().min(0).default(0),
});
