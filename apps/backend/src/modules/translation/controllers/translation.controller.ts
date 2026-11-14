import { API_PATHS, StatusCodes } from '@src/common/constants';
import { joiBodyMiddleware } from '../../../middlewares/joi-body.middleware';
import { joiQueryMiddleware } from '../../../middlewares/joi-query.middleware';
import { createTranslationBodySchema } from './dto/create-translation-body.dto';
import { getTranslationQuerySchema } from './dto/get-translation-query.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { TranslationService } from '../services/translation.service';

export class TranslationController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly translationService: TranslationService,
  ) {}

  registerRoutes() {
    this.createTranslation();
    this.getTranslation();
    this.deleteTranslation();
    this.getTranslationOptions();
  }

  private createTranslation() {
    const middleware = joiBodyMiddleware(createTranslationBodySchema);

    this.app.post(API_PATHS.translations, middleware, async (req: Request, res: Response) => {
      const { texts, sourceLanguage, targetLanguage } = req.bodyParsed;

      const translation = this.translationService.createTranslation({ texts, sourceLanguage, targetLanguage });

      this.app.logger.info(`POST ${API_PATHS.translations} - queued translation ${translation.id}`);

      res.status(StatusCodes.ACCEPTED).location(`${API_PATHS.translations}/${translation.id}`).json(translation);
    });
  }

  /**
   * Polled while the translation runs; `translationsFrom` lets the client fetch only the translations it doesn't have yet.
   */
  private getTranslation() {
    const middleware = joiQueryMiddleware(getTranslationQuerySchema);

    this.app.get(API_PATHS.translationById, middleware, async (req: Request, res: Response) => {
      const { translationId } = req.params as { translationId: string };
      const { translationsFrom } = req.queryParsed;

      const translation = this.translationService.getTranslation({ translationId, translationsFrom });

      res.json(translation);
    });
  }

  private deleteTranslation() {
    this.app.delete(API_PATHS.translationById, async (req, res) => {
      const { translationId } = req.params as { translationId: string };

      this.translationService.deleteTranslation(translationId);

      this.app.logger.info(`DELETE ${API_PATHS.translations} - deleted translation ${translationId}`);

      res.status(StatusCodes.NO_CONTENT).end();
    });
  }

  private getTranslationOptions() {
    this.app.get(API_PATHS.translationOptions, async (_req, res) => {
      const options = await this.translationService.getOptions();

      res.json(options);
    });
  }
}
