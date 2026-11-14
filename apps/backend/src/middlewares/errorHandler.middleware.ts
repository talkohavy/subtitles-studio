import { COLORS } from 'color-my-json';
import { StatusCodes } from '@src/common/constants';
import { HttpException } from '@src/core/errors';
import type { Application, NextFunction, Request, Response } from 'express';

const UNEXPECTED_ERROR_MESSAGE =
  'Something went wrong on the server. Try again, and check the server logs if it keeps happening.';

type ErrorResponse = {
  statusCode: number;
  message: string;
};

export function errorHandler(app: Application) {
  app.use(globalErrorMiddleware);
}

function globalErrorMiddleware(error: any, req: Request, res: Response, _next: NextFunction) {
  const logger = (req.app as Application).logger;

  const data = getErrorResponse(error);
  const request = `${req.method} ${req.originalUrl}`;

  if (data.statusCode < StatusCodes.INTERNAL_ERROR) {
    logger.warn(`${request} - ${data.statusCode} ${data.message}`);
  } else {
    console.error(`${COLORS.red}▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼${COLORS.stop}`);
    logger.error(`${request} - ${error?.message ?? String(error)}`, { error });
    console.error(`${COLORS.red}▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲${COLORS.stop}`);
  }

  res.status(data.statusCode).json(data);
}

/**
 * Errors thrown on purpose carry a message meant for the client. Any other error's message may reveal the server's
 * internals, so the client gets a generic one.
 */
function getErrorResponse(error: any): ErrorResponse {
  if (error instanceof HttpException) return { statusCode: error.statusCode, message: error.message };

  // Express's own errors (like a malformed JSON body) say whether their message is safe to show.
  if (error?.expose === true && typeof error.status === 'number') {
    return {
      statusCode: error.status,
      message: error.message,
    };
  }

  return {
    statusCode: StatusCodes.INTERNAL_ERROR,
    message: UNEXPECTED_ERROR_MESSAGE,
  };
}
