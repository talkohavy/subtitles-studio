# CLAUDE.md

Guidance for Claude Code (and other AI agents) when working in this repository.

## 1. Code Quality Standards

Before making any code changes (edits, new files, or refactors), read ai-agent-docs/code-quality-standards.md.

`ai-agent-docs/code-quality-standards.md`

## 2. Architecture

How the server is put together (startup order, plugins, modules, the transcription and translation job queues, errors, config) is in:

`ai-agent-docs/ARCHITECTURE.md`

## 3. What this project is

The transcription and translation server of Subtitles Studio (package manager: `pnpm`). It transcribes uploaded WAV audio with Whisper and returns word-level timestamps, and translates subtitle texts with NLLB-200. Both run locally with Transformers.js, each in its own forked worker process. The modules are `transcription`, `translation`, `health-check` and `static-frontend`. In production it also serves the built frontend. See [README.md](./README.md).

## 4. How to run project locally

No database or other service is needed. Just run:

```bash
pnpm dev
```

The first transcription with each Whisper model, and the first translation, download the model into `storage/models`.

## 5. Commands

```bash
pnpm dev                  # run the server (watch mode) -> src/start-server.ts
pnpm build                # build the project (build.config.mjs)
pnpm test                 # run jest tests
pnpm run lint             # eslint
pnpm run lint:fix         # eslint --fix
pnpm run tsc              # type-check (tsc -p tsconfig.json)
pnpm run check            # lint + biome lint + biome format + tsc + test (run before finishing a change / opening a PR)
```
