import { useSyncExternalStore } from 'react';
import { mediaStore, type MediaState } from '@src/lib/media/mediaStore';

function subscribe(listener: () => void) {
  return mediaStore.subscribe(listener);
}

function getSnapshot(): MediaState {
  return mediaStore.getSnapshot();
}

export function useMediaState(): MediaState {
  const mediaState = useSyncExternalStore(subscribe, getSnapshot);

  return mediaState;
}
