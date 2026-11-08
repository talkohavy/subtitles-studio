import { COLORS } from 'color-my-json';
import express, { type Application } from 'express';
import { buildApp } from './buildApp';
import { registerProcessHandlers } from './common/register-process-handlers';
import { ConfigKeys } from './plugins/config-service';

startServer();

async function startServer() {
  const app = express() as unknown as Application;
  app.disable('x-powered-by');

  await buildApp(app);

  const PORT = app.configService.get<number>(ConfigKeys.Port);

  app.httpServer.listen(PORT, () => {
    app.logger.log(`🚀 server is up and running on port ${PORT}`);

    console.log(`${COLORS.green}Open in browser: ${COLORS.blue}http://localhost:${PORT}${COLORS.stop}`);
  });

  app.httpServer.on('error', (error: Error) => {
    app.logger.error(error.message, { error });

    process.exit(1);
  });

  registerProcessHandlers(app);
}
