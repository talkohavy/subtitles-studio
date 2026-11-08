import { useEffect, useSyncExternalStore } from 'react';
import { getErrorMessage } from '@src/common/utils/getErrorMessage';
import { fetchTranscriptionOptions } from '@src/lib/api/transcriptionApi';
import type { TranscriptionOptions } from '@src/lib/api/types';

type TranscriptionOptionsState = {
  options: TranscriptionOptions | null;
  error: string | null;
  isLoading: boolean;
};

let state: TranscriptionOptionsState = { options: null, error: null, isLoading: false };
const listeners = new Set<() => void>();

function setState(partialState: Partial<TranscriptionOptionsState>) {
  state = { ...state, ...partialState };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function getSnapshot(): TranscriptionOptionsState {
  return state;
}

async function loadOptions(): Promise<void> {
  if (state.isLoading) return;

  setState({ isLoading: true });

  try {
    const options = await fetchTranscriptionOptions();
    setState({ options, error: null, isLoading: false });
  } catch (error) {
    setState({ error: getErrorMessage(error), isLoading: false });
  }
}

/**
 * The models and languages the server offers. Shared by every component, and refreshed whenever a component
 * using it mounts (so a model downloaded since shows as ready).
 */
export function useTranscriptionOptions(): TranscriptionOptionsState {
  const optionsState = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    void loadOptions();
  }, []);

  return optionsState;
}
