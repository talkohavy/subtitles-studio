import { useSyncExternalStore } from 'react';

export type VideoSetup = {
  /**
   * Tells openings apart, so each starts with fresh choices.
   */
  id: number;
  /**
   * `null` when choosing new subtitles for the open video.
   */
  videoFile: File | null;
  subtitlesFile: File | null;
};

let setup: VideoSetup | null = null;
let lastId = 0;
const listeners = new Set<() => void>();

function setSetup(nextSetup: VideoSetup | null) {
  setup = nextSetup;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function getSnapshot(): VideoSetup | null {
  return setup;
}

/**
 * The video waiting for the user to choose where its subtitles come from. Files can't live in Redux, so like the
 * open video's media, it's kept here.
 */
export const videoSetupStore = {
  subscribe,
  getSnapshot,

  open(props: { videoFile: File | null; subtitlesFile: File | null }) {
    const { videoFile, subtitlesFile } = props;

    lastId++;
    setSetup({ id: lastId, videoFile, subtitlesFile });
  },

  setSubtitlesFile(subtitlesFile: File) {
    if (setup) setSetup({ ...setup, subtitlesFile });
  },

  close() {
    setSetup(null);
  },
};

export function useVideoSetup(): VideoSetup | null {
  const videoSetup = useSyncExternalStore(subscribe, getSnapshot);

  return videoSetup;
}
