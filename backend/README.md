# Subtitles Studio · Backend

The transcription and translation server of Subtitles Studio. It receives a video's audio track as a WAV file, transcribes it with OpenAI's Whisper running locally (no API keys, and the audio never leaves the machine), and returns word-level timestamps that the [frontend](../frontend/README.md) turns into captions. It also translates the captions' text into another language with Meta's NLLB-200, which runs locally too. In production it also serves the built frontend, so the whole app runs as a single server.

## Tech Stack

- **Express 5** with the `lucky-server` app framework from the express-server template (plugins, middleware, modules)
- **[Transformers.js](https://huggingface.co/docs/transformers.js)** (`@huggingface/transformers`), running Whisper ONNX models on the CPU or the GPU (WebGPU), and NLLB-200 on the CPU
- **TypeScript**, **Jest**, **ESLint**, **Biome**, **Prettier**, **pnpm**

## Getting Started

```bash
pnpm install
pnpm dev          # http://localhost:8000, in watch mode
```

No database or other service is needed. To change a setting, copy `.env.example` to `.env`; every variable is optional.

## Scripts

```bash
pnpm dev                  # run the server in watch mode (src/start-server.ts)
pnpm build                # bundle into dist/ (build.config.mjs)
pnpm start                # run the bundle
pnpm test                 # jest
pnpm run tsc              # type-check
pnpm run lint             # eslint
pnpm run lint:biome       # biome lint
pnpm run format           # biome format check (format:fix writes)
pnpm run format:prettier  # prettier check (format:prettier:fix writes)
pnpm run check            # lint + biome lint + format + tsc + test
```

## API

| Method   | Path                                      | Description                                                                                                                    |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET`    | `/api/transcription-options`              | The models (and whether each one is downloaded), the languages, the default model and the upload size limit                    |
| `POST`   | `/api/transcriptions?language=&model=`    | Queues a transcription. The body is the raw WAV file (`Content-Type: audio/wav`), not multipart. Responds with `202`           |
| `GET`    | `/api/transcriptions/:id?wordsFrom=`      | The job's status, stage and progress, and its words from index `wordsFrom` on, so polling only fetches new words               |
| `DELETE` | `/api/transcriptions/:id`                 | Cancels the job if it hasn't finished, and forgets it                                                                          |
| `GET`    | `/api/translation-options`                | The translation model (and whether it's downloaded) and the languages it translates between                                    |
| `POST`   | `/api/translations`                       | Queues a translation. The JSON body is `{ sourceLanguage, targetLanguage, texts }`, one sentence per text. Responds with `202` |
| `GET`    | `/api/translations/:id?translationsFrom=` | The job's status, stage and progress, and its translations from index `translationsFrom` on                                    |
| `DELETE` | `/api/translations/:id`                   | Cancels the job if it hasn't finished, and forgets it                                                                          |
| `GET`    | `/api/health-check`                       | Health check                                                                                                                   |

`language` is `auto` (the default) or a language code Whisper supports, such as `en`, `he` or `ja`. `model` is one of the models below.

`sourceLanguage` and `targetLanguage` use the same codes. All of Whisper's languages can be translated except Latin, Hawaiian and Breton, which NLLB-200 doesn't cover. A translation takes up to 5,000 texts of up to 2,000 characters each.

## Models

| `model`          | Name          | Download                   | Notes                                                                        |
| ---------------- | ------------- | -------------------------- | ---------------------------------------------------------------------------- |
| `base`           | Fast          | 76 MB                      | Quickest. Good for clear English speech                                      |
| `small`          | Balanced      | 263 MB (CPU), 482 MB (GPU) | The default. Accurate for most languages and still fast on a CPU             |
| `large-v3-turbo` | Most accurate | 574 MB (GPU), 754 MB (CPU) | Best quality, especially for non-English speech. Uses the GPU when available |

A model downloads from Hugging Face the first time it's used, and is kept in `storage/models`. On an Apple Silicon laptop, 30 seconds of speech take about 2 seconds with `base`, 4 with `small`, and 6 (GPU) or 18 (CPU) with `large-v3-turbo`.

Translation uses NLLB-200 distilled to 600M parameters and quantized to 8 bits (`Xenova/nllb-200-distilled-600M`, about 870 MB). It downloads the first time something is translated, into the same folder, and translates about one sentence per second on an Apple Silicon CPU. It's the largest NLLB model available for Transformers.js; its translations are usually right but sometimes miss a word's meaning.

## How Transcription Works

1. **Upload:** the WAV streams straight to `storage/uploads`, and a job is queued. Jobs run one at a time, and up to 20 can wait (`services/transcription-jobs.service.ts`).
2. **Worker:** jobs run in a forked worker process, so a long transcription never blocks the server (`logic/worker/`). The worker keeps the model loaded between jobs and stops after 10 idle minutes to free its memory.
3. **Windows:** the audio is split into windows shorter than 30 seconds (what Whisper sees at a time), cut at the quietest moments. Long silences are skipped, since Whisper tends to make up text over them (`logic/utils/splitIntoSpeechWindows.ts`). With `language=auto`, the language is detected from the first few windows.
4. **Cleanup:** Whisper's raw words are cleaned up (`logic/utils/normalizeWords.ts`). Known hallucinations (like "Thank you." over silence) and repetition loops are dropped, timings are fixed, and languages written without spaces, like Japanese, Chinese and Thai, are split into words with `Intl.Segmenter`.
5. **Results:** the frontend polls the job and receives the words as they're transcribed. The uploaded audio is deleted once the job finishes, and the job itself is forgotten after `JOB_TTL_MINUTES`.

## How Translation Works

1. **Sentences:** the frontend regroups the captions into sentences, since a translator does far better with whole sentences than with the pieces of them that fit in a caption, and sends one sentence per text.
2. **Worker:** like transcriptions, translations are queued and run one at a time in a forked worker process that keeps the model loaded and stops after 10 idle minutes. Both use the same queue (`lib/worker-job-queue/`).
3. **Translate:** each text is translated on its own, because NLLB-200 tends to drop sentences when given several at once. NLLB learned a lot from movie subtitles, so a short line can come back as made-up dialogue ("That's it." → "זה הכל. -כן."). To prevent that, dashes that open a word are banned unless the line has some, and a one- or two-word line keeps only the first clause of its translation (`logic/worker/nllb-engine.ts`).
4. **Results:** the frontend polls the job, receives the translations as they're done, and puts each sentence's translation back into the captions it came from.

## Configuration

Every variable is optional (see `.env.example`).

| Variable                                                   | Default                 | Description                                                                                                           |
| ---------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                                     | `8000`                  | HTTP port                                                                                                             |
| `CORS_ALLOWED_ORIGINS`                                     | `http://localhost:3004` | Comma-separated browser origins allowed to call the API (the Vite dev server proxies `/api`, so it doesn't need this) |
| `STORAGE_DIR`                                              | `./storage`             | Where uploads and models (Whisper's and the translator's) are kept                                                    |
| `MAX_UPLOAD_MB`                                            | `512`                   | The largest WAV accepted                                                                                              |
| `DEFAULT_WHISPER_MODEL`                                    | `small`                 | The model used when the request doesn't pick one                                                                      |
| `WHISPER_DEVICE`                                           | `auto`                  | `auto`, `cpu` or `webgpu`                                                                                             |
| `ALLOW_REMOTE_MODELS`                                      | `true`                  | Set to `false` to only use models already in `STORAGE_DIR/models` (offline)                                           |
| `JOB_TTL_MINUTES`                                          | `60`                    | How long a finished transcription or translation stays available                                                      |
| `FRONTEND_DIST_DIR`                                        | `../frontend/dist`      | The built frontend, served with a single-page-app fallback when it exists                                             |
| `LOG_LEVEL`, `LOG_ENV`, `USE_PRETTY_PRINT`, `SERVICE_NAME` |                         | Logging                                                                                                               |

## Project Structure

```
src/
├── modules/
│   ├── transcription/      # API, job queue, worker and Whisper engine
│   ├── translation/        # API, job queue, worker and NLLB engine
│   ├── health-check/
│   └── static-frontend/    # Serves frontend/dist in production
├── plugins/                # config, call context, logger, HTTP server
├── middlewares/            # request id, CORS, helmet, body limit, error handling
├── core/                   # config, logger and call-context services; HTTP errors
├── lib/                    # lucky-server (the app framework), the worker job queue and the logger
├── common/                 # constants, types, utilities
├── buildApp.ts             # registers the plugins, middleware and modules
└── start-server.ts         # entry point
```
