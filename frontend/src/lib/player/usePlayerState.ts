import { useSyncExternalStore } from 'react';
import { getPlayerSnapshot, subscribeToPlayer, type PlayerState } from './playerController';

/**
 * Subscribes to part of the player's state. The selector must return a primitive (or a stable reference),
 * so the component only re-renders when that part changes.
 */
export function usePlayerState<T>(selector: (state: PlayerState) => T): T {
  const selectedState = useSyncExternalStore(subscribeToPlayer, () => selector(getPlayerSnapshot()));

  return selectedState;
}
