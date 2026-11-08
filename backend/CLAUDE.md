# CLAUDE.md

Guidance for Claude Code (and other AI agents) when working in this repository.

## 1. Code Quality Standards

Before making any code changes (edits, new files, or refactors), read ai-agent-docs/code-quality-standards.md.

`ai-agent-docs/code-quality-standards.md`

## 2. Project Knowledge Base

Project knowledge base is found in all the md files under:

`ai-agent-docs/knowledge/`

These files explain the `lucky-server` framework (app factory, plugins, modules) with examples from the original template: Books/Users/Dragons modules, Postgres/Redis/Socket.IO plugins, and micro-services. This project uses only part of it: the entry point is `src/start-server.ts`, `src/buildApp.ts` registers the config, call-context, logger and HTTP-server plugins, and the modules are `transcription`, `health-check` and `static-frontend`.

## 3. What this project is

The transcription server of Subtitles Studio (package manager: `pnpm`). It transcribes uploaded WAV audio with Whisper running locally (Transformers.js in a forked worker process) and returns word-level timestamps. In production it also serves the built frontend. See [README.md](./README.md).

## 4. How to run project locally

No database or other service is needed. Just run:

```bash
pnpm dev
```

The first transcription with each Whisper model downloads it into `storage/models`.

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
