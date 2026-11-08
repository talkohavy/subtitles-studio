import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import express, { type Application } from 'express';
import request from 'supertest';
import { StatusCodes } from '@src/common/constants';
import { pathNotFoundHandler } from '../../../middlewares/pathNotFoundHandler.middleware';
import { StaticFrontendController } from './static-frontend.controller';

describe('StaticFrontendController', () => {
  let app: Application;
  let distDir: string;

  beforeEach(async () => {
    distDir = await mkdtemp(path.join(os.tmpdir(), 'frontend-dist-'));
    await mkdir(path.join(distDir, 'static', 'js'), { recursive: true });
    await writeFile(path.join(distDir, 'index.html'), '<html>app</html>');
    await writeFile(path.join(distDir, 'static', 'js', 'main.abc123.js'), 'console.log(1);');

    app = express() as unknown as Application;
    const controller = new StaticFrontendController(app, distDir);
    controller.registerRoutes();
    pathNotFoundHandler(app);
  });

  afterEach(async () => {
    await rm(distDir, { recursive: true, force: true });
  });

  it('should serve fingerprinted files with a long-lived cache', async () => {
    const response = await request(app).get('/static/js/main.abc123.js');
    const actualResult = { status: response.status, cacheControl: response.headers['cache-control'] };

    const expectedResult = { status: StatusCodes.OK, cacheControl: 'public, max-age=31536000, immutable' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should serve the app for any page route', async () => {
    const response = await request(app).get('/editor/some-page');
    const actualResult = {
      status: response.status,
      body: response.text,
      cacheControl: response.headers['cache-control'],
    };

    const expectedResult = { status: StatusCodes.OK, body: '<html>app</html>', cacheControl: 'no-cache' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should leave unknown API paths to the not-found handler', async () => {
    const response = await request(app).get('/api/unknown');
    const actualResult = { status: response.status, body: response.body };

    const expectedResult = {
      status: StatusCodes.NOT_FOUND,
      body: { statusCode: 404, message: 'Cannot GET /api/unknown' },
    };
    expect(actualResult).toEqual(expectedResult);
  });
});
