import path from 'path';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { API_PATH_PREFIX, HttpMethod } from '@src/common/constants';
import type { ControllerFactory } from '@src/lib/lucky-server';

/**
 * Where the frontend build (`frontend/vite.config.ts`) puts its fingerprinted files.
 */
const HASHED_ASSETS_DIR = `${path.sep}static${path.sep}`;
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const REVALIDATE_CACHE_CONTROL = 'no-cache';

export class StaticFrontendController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly distDir: string,
  ) {}

  registerRoutes() {
    this.serveStaticFiles();
    this.serveIndexHtmlFallback();
  }

  /**
   * Vite fingerprints everything under `static/`, so those files can be cached forever.
   */
  private serveStaticFiles() {
    const staticMiddleware = express.static(this.distDir, {
      index: false,
      setHeaders: (res, filePath) => {
        const isHashedAsset = filePath.includes(HASHED_ASSETS_DIR);
        res.setHeader('Cache-Control', isHashedAsset ? IMMUTABLE_CACHE_CONTROL : REVALIDATE_CACHE_CONTROL);
      },
    });

    this.app.use(staticMiddleware);
  }

  /**
   * Any other GET outside the API renders the single-page app.
   */
  private serveIndexHtmlFallback() {
    const indexHtmlPath = path.join(this.distDir, 'index.html');

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const isPageRequest = req.method === HttpMethod.GET && !req.path.startsWith(API_PATH_PREFIX);

      if (!isPageRequest) return next();

      res.setHeader('Cache-Control', REVALIDATE_CACHE_CONTROL);
      res.sendFile(indexHtmlPath);
    });
  }
}
