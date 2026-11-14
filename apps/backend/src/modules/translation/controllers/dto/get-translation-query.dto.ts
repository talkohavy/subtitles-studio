import Joi from 'joi';

export const getTranslationQuerySchema = Joi.object({
  translationsFrom: Joi.number().integer().min(0).default(0),
});
