import express, { type Application } from 'express';
import request from 'supertest';
import { StatusCodes } from '@src/common/constants';
import { NotFoundError } from '@src/core/errors';
import { errorHandler } from './errorHandler.middleware';

describe('errorHandler', () => {
  let app: Application;

  beforeEach(() => {
    app = express() as unknown as Application;
    app.logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;
    jest.spyOn(console, 'error').mockImplementation(() => {});

    app.use(express.json());
    app.get('/missing', () => {
      throw new NotFoundError('Transcription abc not found');
    });
    app.get('/broken', () => {
      throw new Error('Cannot read properties of undefined (reading "secret")');
    });
    app.post('/echo', (req, res) => {
      res.json(req.body);
    });
    errorHandler(app);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should answer an expected error with its status and message, and log it as a warning', async () => {
    const response = await request(app).get('/missing');
    const actualResult = {
      status: response.status,
      body: response.body,
      warnings: (app.logger.warn as jest.Mock).mock.calls,
      errorCount: (app.logger.error as jest.Mock).mock.calls.length,
    };

    const expectedResult = {
      status: StatusCodes.NOT_FOUND,
      body: { statusCode: StatusCodes.NOT_FOUND, message: 'Transcription abc not found' },
      warnings: [['GET /missing - 404 Transcription abc not found']],
      errorCount: 0,
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should hide an unexpected error’s message from the client, and log the error itself', async () => {
    const response = await request(app).get('/broken');
    const [loggedMessage, loggedData] = (app.logger.error as jest.Mock).mock.calls[0];
    const actualResult = {
      status: response.status,
      revealsDetails: JSON.stringify(response.body).includes('secret'),
      loggedMessage,
      isErrorLogged: loggedData.error instanceof Error,
    };

    const expectedResult = {
      status: StatusCodes.INTERNAL_ERROR,
      revealsDetails: false,
      loggedMessage: 'GET /broken - Cannot read properties of undefined (reading "secret")',
      isErrorLogged: true,
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should answer a malformed JSON body with a 400', async () => {
    const response = await request(app).post('/echo').set('Content-Type', 'application/json').send('{"broken');

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });
});
