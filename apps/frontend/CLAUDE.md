# CLAUDE.md

Guidance for Claude Code (and other AI agents) when working in this repository.

## 1. What this project is

The web app of Subtitles Studio: it generates subtitles from a video's audio (transcribed by the backend), lets the user edit and style them, and exports the video with the subtitles burned in. Explained at the [README.md](./README.md) file.

## 2. Code Quality Standards

Code quality standard are found under: [code-quality-standards.md](./ai-docs/code-quality-standards.md)

## 3. Commands

```bash
pnpm dev                       # vite dev server (--host), port 3004 (override via VITE_PORT); proxies /api to the backend
pnpm build                     # vp build into dist/ (the backend serves it in production)
pnpm preview                   # serve the production build
pnpm test                      # vitest via `vp test run` (jsdom)
pnpm test path/to/file.test.ts # run a single test file (no `--`; pnpm forwards it to vitest)
pnpm test -t "name"            # run tests matching a name
pnpm tsc                       # tsc -p tsconfig.json (no emit)
pnpm lint                      # oxlint via `vp lint` (config in vite.config.ts `lint` block)
pnpm lint:fix                  # vp lint --fix
pnpm format:fix                # oxfmt via `vp fmt . --write`
pnpm check                     # lint + format check + tsc check + test (run before considering work done)
```
