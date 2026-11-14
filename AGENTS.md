# AGENTS.md

Guidance for AI agents working in this repository. Each app also has its own instructions; read them before changing that app's code: [apps/frontend/CLAUDE.md](./apps/frontend/CLAUDE.md) and [apps/backend/CLAUDE.md](./apps/backend/CLAUDE.md).

## 1. Layout

A pnpm monorepo (`pnpm-workspace.yaml`):

```
apps/
├── frontend/   # React web app: transcribe, translate, edit, style and export subtitles
└── backend/    # Express server: Whisper transcription and NLLB translation; serves the built frontend in production
packages/
└── shared/     # @subtitles-studio/shared: the API contract both apps import
```

- `packages/shared` holds what the frontend and backend must agree on: the response DTOs, the job statuses and stages, and similar constants. When a request or response changes, change it there so both apps break at compile time together. It is source-only: its `exports` point at `src/index.ts`, and each app's toolchain (Vite, tsx, Vitest, esbuild) compiles it in, so there is no build step.
- `tsconfig.base.json` holds the compiler options every workspace shares. Each workspace's `tsconfig.json` extends it and adds only its own (`lib`, `jsx`, `paths`, ...). The root `tsconfig.json` covers only root files such as `vite.config.ts`.
- The root `vite.config.ts` holds the lint (Oxlint) and format (Oxfmt) config for the whole repo, with per-app `overrides`. The apps' `vite.config.ts` files hold only their dev, build and test config; don't add `lint` or `fmt` blocks to them.
- Import order is enforced by the formatter: React, then built-ins, then packages, then `@src/`, then relative imports, with type imports in the same order after them.
- There is one `.gitignore` and one `.vscode/`, both at the root. The Cursor rules (`.cursor/rules`) and Claude agents and skills (`.claude/`) are at the root too, scoped to the app they're about.

## 2. Commands

Run these from the root:

```bash
pnpm install
pnpm dev                    # both apps in watch mode; the frontend (port 3004) proxies /api to the backend
pnpm dev:frontend
pnpm dev:backend
pnpm build                  # the frontend, then the backend (which serves the frontend's dist/)
pnpm start                  # run the built backend
pnpm test                   # every workspace's tests (Vitest, via `vp test`)
pnpm tsc                    # type-check every workspace
pnpm lint                   # vp lint (lint:fix fixes)
pnpm format                 # vp fmt --check (format:fix writes)
pnpm check                  # format + lint + tsc + test (run before considering work done)
pnpm check:fix              # fix what format and lint can fix
```

Run one workspace's script with `pnpm --filter <frontend|backend|@subtitles-studio/shared> run <script>`, e.g. `pnpm --filter backend test src/path/to/file.test.ts`.

## 3. Vite+, the unified toolchain

This repo uses Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

### Built-in commands vs scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp check` and `vp run check` do different things here: the built-in only formats, lints and type-checks, while the `check` script also runs `tsc` and the tests. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

### Tool versions

Run `vp toolchain` to show versions and relationships in the active Vite+ release. Add a tool name to select part of the graph. For example, run `vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use `vp why <package>` to show the package-manager dependency graph.

## 4. Review checklist

- [ ] Run `pnpm install` after pulling remote changes and before getting started.
- [ ] Run `pnpm check` to format-check, lint, type-check and test changes.
- [ ] If an API request or response changed, its type is in `packages/shared` and both apps use it.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.
