import { API_PATHS, Headers, StatusCodes } from '@src/common/constants';
import { BadRequestError } from '@src/core/errors';
import { joiQueryMiddleware } from '../../../middlewares/joi-query.middleware';
import { ACCEPTED_AUDIO_CONTENT_TYPES } from '../logic/constants';
import { createTranscriptionQuerySchema } from './dto/create-transcription-query.dto';
import { getTranscriptionQuerySchema } from './dto/get-transcription-query.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { TranscriptionService } from '../services/transcription.service';

export class TranscriptionController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly transcriptionService: TranscriptionService,
  ) {}

  registerRoutes() {
    this.createTranscription();
    this.getTranscription();
    this.deleteTranscription();
    this.getTranscriptionOptions();
  }

  /**
   * The body is the raw WAV file (not multipart), so it streams straight to disk.
   */
  private createTranscription() {
    const middleware = joiQueryMiddleware(createTranscriptionQuerySchema);

    this.app.post(API_PATHS.transcriptions, middleware, async (req: Request, res: Response) => {
      const contentType = getMediaType(req);

      if (!ACCEPTED_AUDIO_CONTENT_TYPES.includes(contentType)) {
        throw new BadRequestError(
          `Send the audio track as a WAV file with "Content-Type: audio/wav" (received "${contentType || 'none'}")`,
          { statusCode: StatusCodes.UNSUPPORTED_MEDIA_TYPE },
        );
      }

      const { language, model } = req.queryParsed;
      const contentLengthHeader = req.headers[Headers.ContentLength];
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;

      const transcription = await this.transcriptionService.createTranscription({
        audioStream: req,
        contentLength,
        language,
        modelId: model,
      });

      this.app.logger.info(`POST ${API_PATHS.transcriptions} - queued transcription ${transcription.id}`);

      res.status(StatusCodes.ACCEPTED).location(`${API_PATHS.transcriptions}/${transcription.id}`).json(transcription);
    });
  }

  /**
   * Polled while the transcription runs; `wordsFrom` lets the client fetch only the words it doesn't have yet.
   */
  private getTranscription() {
    const middleware = joiQueryMiddleware(getTranscriptionQuerySchema);

    this.app.get(API_PATHS.transcriptionById, middleware, async (req: Request, res: Response) => {
      const { transcriptionId } = req.params as { transcriptionId: string };
      const { wordsFrom } = req.queryParsed;

      const transcription = this.transcriptionService.getTranscription({ transcriptionId, wordsFrom });

      res.json(transcription);
    });
  }

  private deleteTranscription() {
    this.app.delete(API_PATHS.transcriptionById, async (req, res) => {
      const { transcriptionId } = req.params as { transcriptionId: string };

      this.transcriptionService.deleteTranscription(transcriptionId);

      this.app.logger.info(`DELETE ${API_PATHS.transcriptions} - deleted transcription ${transcriptionId}`);

      res.status(StatusCodes.NO_CONTENT).end();
    });
  }

  private getTranscriptionOptions() {
    this.app.get(API_PATHS.transcriptionOptions, async (_req, res) => {
      const options = await this.transcriptionService.getOptions();

      res.json(options);
    });
  }
}

function getMediaType(req: Request): string {
  const contentTypeHeader = req.headers[Headers.ContentType] ?? '';
  const [mediaType = ''] = contentTypeHeader.split(';');

  return mediaType.trim().toLowerCase();
}
