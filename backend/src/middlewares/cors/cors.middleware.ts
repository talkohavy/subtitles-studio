import cors from 'cors';
import { ConfigKeys, type CorsConfig } from '@src/plugins/config-service';
import { handleCors } from './logic/utils/handleCors';
import type { Application } from 'express';

/**
 * @express
 *
 * @dependencies
 * - config-service plugin
 */
export function registerCorsMiddleware(app: Application) {
  const { allowedOrigins } = app.configService.get<CorsConfig>(ConfigKeys.Cors);

  const middleware = corsMiddleware(allowedOrigins);

  app.use(middleware);
}

function corsMiddleware(allowedOrigins: Array<string>) {
  return cors({
    origin: handleCors(allowedOrigins),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true, // <--- Important! You'll get CORS Error without it.
  });
}
