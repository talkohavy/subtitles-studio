import { useEffect, useSyncExternalStore } from 'react';
import { getErrorMessage } from '@src/common/utils/getErrorMessage';

export type ServerOptionsState<T> = {
  options: T | null;
  error: string | null;
  isLoading: boolean;
};

/**
 * Creates a hook for options the server offers (models, languages). They are shared by every component, and
 * refreshed whenever a component using them mounts, so e.g. a model downloaded since shows as ready.
 */
export function createServerOptionsHook<T>(fetchOptions: () => Promise<T>): () => ServerOptionsState<T> {
  let state: ServerOptionsState<T> = { options: null, error: null, isLoading: false };
  const listeners = new Set<() => void>();

  function setState(partialState: Partial<ServerOptionsState<T>>) {
    state = { ...state, ...partialState };
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  }

  function getSnapshot(): ServerOptionsState<T> {
    return state;
  }

  async function loadOptions(): Promise<void> {
    if (state.isLoading) return;

    setState({ isLoading: true });

    try {
      const options = await fetchOptions();
      setState({ options, error: null, isLoading: false });
    } catch (error) {
      setState({ error: getErrorMessage(error), isLoading: false });
    }
  }

  return function useServerOptions(): ServerOptionsState<T> {
    const optionsState = useSyncExternalStore(subscribe, getSnapshot);

    useEffect(() => {
      void loadOptions();
    }, []);

    return optionsState;
  };
}
