# Backend Architecture

How the Subtitles Studio server is put together. For the product side, see [README.md](../README.md).

## 1. Startup

`src/start-server.ts` creates the Express app, calls `buildApp(app)`, then listens on `app.httpServer` (created by the HTTP-server plugin) and registers the process handlers.

`src/buildApp.ts` composes the app with `AppFactory` from `src/lib/lucky-server`, always in this order:

1. **Plugins** (`registerPlugins`): `configServicePlugin` → `callContextPlugin` → `loggerPlugin` → `httpServerPlugin`. Each one attaches a service to `app` (`app.configService`, `app.callContextService`, `app.logger`, `app.httpServer`). A plugin may use what earlier plugins attached.
2. **Middleware** (`registerMiddleware`): request id, CORS, helmet, JSON body (10 MB, skipped for the health check), URL-encoded body.
3. **Modules** (`registerModules`): `HealthCheckModule`, `TranscriptionModule`, `TranslationModule`, then `StaticFrontendModule`, which must stay last because its catch-all route serves the single-page app.
4. **Error handler**, then the **path-not-found handler**.

`app` is frozen once the plugins are registered, so every property it will ever have must already exist in `src/common/constants/optimizedApp.ts` (typed in `src/common/types/optimizedApp.ts`). A new module or plugin needs an entry in both.

## 2. Modules

A module is a class implementing `ModuleFactory` (`init()`). `init` reads its config, builds its services, and has its controller register routes. `AppFactory` stores each instance on `app.modules[ClassName]`, which is how other code reaches a module's `services` or `cleanup()`.

The transcription and translation modules follow this layout (the smaller modules use only part of it):

```
modules/<name>/
├── <name>.module.ts
├── index.ts
├── types.ts
├── controllers/   # routes (ControllerFactory.registerRoutes) and Joi DTOs in controllers/dto
├── services/      # request-level service + jobs service
└── logic/         # constants, utils, and the worker process code in logic/worker
```

| Module                 | Routes                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `HealthCheckModule`    | `GET /api/health-check`                                                                              |
| `TranscriptionModule`  | `POST /api/transcriptions`, `GET`/`DELETE /api/transcriptions/:id`, `GET /api/transcription-options` |
| `TranslationModule`    | `POST /api/translations`, `GET`/`DELETE /api/translations/:id`, `GET /api/translation-options`       |
| `StaticFrontendModule` | Serves `FRONTEND_DIST_DIR` with an SPA fallback, only when a build exists                            |

Paths live in `src/common/constants/api-paths.ts`. Request validation uses `joiQueryMiddleware` / `joiBodyMiddleware`, which put the validated values on `req.queryParsed` / `req.bodyParsed`.

## 3. Transcription and translation jobs

Both features are asynchronous jobs that the client creates, polls, and may delete:

1. **Create.** `POST /api/transcriptions` takes the raw WAV file as the body (`Content-Type: audio/wav`, not multipart) with `language` and `model` in the query. `TranscriptionService` streams it to `storage/uploads`, checks its size and duration, and creates a job. `POST /api/translations` takes JSON (`sourceLanguage`, `targetLanguage`, `texts`). Both answer `202` with the job and a `Location` header, or `429` when the queue is full.
2. **Poll.** `GET .../:id` returns the job's status (`queued` → `processing` → `completed` | `failed` | `canceled`), stage, progress and results so far. Transcriptions take `wordsFrom` to return only the words the client doesn't have yet.
3. **Delete.** `DELETE .../:id` removes the job, and cancels it if it's running.

The job machinery is shared: `src/lib/worker-job-queue/WorkerJobQueue` owns the queue and **one child process** per feature, forked with `child_process.fork` (through `tsx` in development, a separate bundled file in production). Inference blocks the event loop for seconds and uses every CPU core, so jobs run one at a time, off the HTTP process, and a crashing native runtime can't take the server down.

- `TranscriptionJobsService` and `TranslationJobsService` extend it. They say how a job starts on the worker (`createStartRequest`), how progress events update it (`applyProgressEvent`), and what to free when it ends (`releaseJob`, e.g. deleting the uploaded audio).
- The workers (`logic/worker/*.worker.ts`) run Transformers.js: Whisper for transcription (`whisper-engine.ts`), NLLB-200 for translation (`nllb-engine.ts`). They report progress, results and log lines as IPC messages.
- Cancellation is cooperative: the worker checks between steps. If it doesn't stop within a grace period, the queue restarts the worker. An idle worker is stopped to free memory, and finished jobs expire after `JOB_TTL_MINUTES`.
- Models download into `storage/models` on first use, unless `ALLOW_REMOTE_MODELS=false`.

## 4. Errors

Throw the classes in `src/core/errors` (`BadRequestError`, `NotFoundError`, `TooManyRequestsError`, …), all `HttpException`s. The error handler (`src/middlewares/errorHandler.middleware.ts`) sends `{ statusCode, message }`:

- An `HttpException` keeps its status and message, so write the message for the end user.
- An Express error that marks itself safe to show (`expose: true`, e.g. a malformed JSON body) keeps its status and message.
- Anything else becomes a `500` with a generic message, and is logged with its stack.

4xx responses are logged as warnings, 5xx as errors.

## 5. Config

`src/plugins/config-service` validates the environment (`logic/env-validation-schema.ts`) and builds the typed config (`logic/configuration.ts`), read with `app.configService.get<T>(ConfigKeys.X)`. Every variable is optional; `.env.example` lists them with their defaults.

## 6. Shutdown

`src/common/register-process-handlers.ts` handles `SIGINT`/`SIGTERM` and fatal errors by calling each job module's `cleanup()`, which stops its worker and deletes leftover uploads before the process exits.
