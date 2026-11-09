# Subtitles Studio · Frontend

The web app of Subtitles Studio: drop a video, get word-timed subtitles generated from its audio, translate them into another language if you like, edit and style them, and export the video with the subtitles burned in. The video never leaves the browser; only its audio is sent to the [backend](../backend/README.md) to be transcribed (and the subtitles' text, to be translated).

## Tech Stack

| Layer           | Choice                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------- |
| Toolchain       | [Vite+](https://viteplus.dev) (`vp`: Vite + Rolldown, Vitest, Oxlint, Oxfmt)                |
| UI              | React 19 with the React Compiler, Tailwind CSS v4, Radix UI, lucide-react, sonner           |
| State           | Redux Toolkit                                                                               |
| Media           | [Mediabunny](https://mediabunny.dev) on WebCodecs: reading videos, extracting audio, export |
| Fonts           | Fontsource (13 caption typefaces, bundled with the app)                                     |
| Tests           | Vitest via `vp test` (jsdom)                                                                |
| Package manager | pnpm                                                                                        |

## Getting Started

Transcription runs on the backend, so start both. From the repository root:

```bash
pnpm install
pnpm dev          # backend on http://localhost:8000, frontend on http://localhost:3004
```

In development, Vite proxies `/api` to the backend (`VITE_BACKEND_URL`, default `http://localhost:8000`). In production the backend serves the built frontend, so a single server is enough.

The first transcription with each model downloads it (76 MB to 754 MB, see the [backend README](../backend/README.md#models)), and the first translation downloads the translator (about 870 MB); later ones use the cached copies.

## Scripts

```bash
pnpm dev                     # Vite dev server (port 3004, override with VITE_PORT)
pnpm build                   # production build into dist/
pnpm preview                 # serve the production build
pnpm test                    # Vitest, once (vp test run)
pnpm test src/lib/subtitles  # run the tests of one folder or file
pnpm tsc                     # type-check
pnpm lint                    # Oxlint (vp lint)
pnpm format:fix              # Oxfmt (vp fmt . --write)
pnpm check                   # lint + format check + tsc + test (run before committing)
```

## Project Structure

```
src/
├── features/           # The app's UI, by feature
│   ├── new-video/          # Dropzone, New Video dialog, transcription settings, language names
│   ├── transcription/      # The pipeline: read the video → extract audio → upload → poll → build captions
│   ├── translation/        # Translating the captions, right after transcription or from the Translate panel
│   ├── processing/         # The running job (one at a time, cancelable) and polling, shared by both pipelines
│   ├── preview/            # Preview canvas, caption dragging, processing and failure overlays
│   ├── playback/           # Play/pause, previous/next subtitle, speed, volume, timeline zoom
│   ├── timeline/           # Ruler, waveform, and caption blocks that can be moved and resized
│   ├── subtitles/          # Caption list: edit text and timing, split, merge, insert, delete
│   ├── panels/             # Styles, Enhance, Translate, Animate, Font, Layout, Background, Canvas and Help panels
│   ├── side-panel/         # Tool rail and panel layout
│   ├── export/             # Export dialog (burned-in MP4) and subtitle file downloads
│   ├── top-bar/            # New Video, undo/redo, Export
│   └── shortcuts/          # Keyboard shortcuts
├── lib/                # Logic that doesn't depend on React
│   ├── subtitles/          # Grouping words into captions, fitting translations into them, editing, cleanup, SRT/VTT/TXT
│   ├── renderer/           # Draws a frame with its captions; shared by the preview and the export
│   ├── media/              # Mediabunny: read videos, extract audio, waveform peaks, export
│   ├── player/             # The playback clock and the video element
│   ├── fonts/              # Font catalog and loading
│   └── api/                # Backend client
├── store/              # Redux: project (with undo/redo), session, settings, ui; saved preferences
├── components/ui/      # Shared UI controls
├── hooks/              # Shared React hooks
└── common/             # Utilities and global styles
```

## How It Works

1. **Read:** Mediabunny reads the video's size (after rotation), duration and tracks in the browser (`lib/media/probeVideo.ts`).
2. **Extract:** the audio is decoded into a 16 kHz mono WAV, the format Whisper works with (`lib/media/extractAudio.ts`).
3. **Transcribe:** the WAV is uploaded to the backend, which queues a Whisper job. The app polls the job and shows the transcript as it grows (`features/transcription/transcriptionPipeline.ts`).
4. **Caption:** the timed words are grouped into captions. A cost model prefers breaking at sentence ends, then at clauses and pauses, and avoids ending a caption on a word that leads into the next one, like "the" or "של" (`lib/subtitles/buildCues.ts`).
5. **Translate** (optional): when a language is picked under "Translate To", or from the Translate panel later, the captions are regrouped into sentences (long ones are split at a comma) and translated by the backend. Each sentence's translation is shared out among the captions it came from in proportion to how much of the original each held, breaking at punctuation where it can. Captions keep their timing, right-to-left text is detected, and the whole translation is undone in one step (`lib/subtitles/translateCues.ts`, `features/translation/translationPipeline.ts`).
6. **Edit:** caption edits go through the `project` slice, which has undo/redo; a burst of typing or a whole drag is undone in one step (`store/undoable.ts`).
7. **Render:** a single renderer draws each frame onto a canvas: the video (reframed to the chosen aspect ratio), the captions, the word highlight and the animations. The preview and the export both use it, so the export looks exactly like the preview (`lib/renderer/renderFrame.ts`).
8. **Export:** the frames are encoded into an H.264 MP4 with WebCodecs. AAC audio is copied; other audio is re-encoded to AAC when the browser supports it (`lib/media/exportVideo.ts`). The subtitles can also be downloaded as SRT, VTT or plain text.

The style, canvas settings, language, translation language, model and caption length are saved in `localStorage`. The video and its subtitles aren't, so the app asks before the tab is closed.

## Browser Support

Export needs WebCodecs with H.264 encoding. The app was tested in Chromium-based browsers.
