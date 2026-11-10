import { useEffect } from 'react';
import { player } from '@src/lib/player/playerController';
import { useAppDispatch } from '../../store';
import { redoChange, undoChange } from '../history/historyThunks';
import { seekToNextCue, seekToPreviousCue } from '../subtitles/cueThunks';

const TEXT_INPUT_TYPES = new Set(['', 'text', 'search', 'email', 'number', 'password', 'tel', 'url']);
/**
 * Controls that use Space or the arrow keys themselves.
 */
const KEYBOARD_ROLES = new Set(['slider', 'radio', 'menuitem', 'menuitemradio', 'option', 'tab', 'switch', 'combobox']);
const SEEK_STEP_SEC = 1;
const LARGE_SEEK_STEP_SEC = 5;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }

  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type);
}

function isKeyboardControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const role = target.getAttribute('role');

  return role !== null && KEYBOARD_ROLES.has(role);
}

/**
 * Captions' text uses the app's undo history (which also holds their timing); other text fields keep the browser's.
 */
function usesAppUndo(target: EventTarget | null): boolean {
  if (!isTypingTarget(target)) return true;

  return target instanceof HTMLTextAreaElement && target.closest('[data-cue-index]') !== null;
}

function isInsideDialog(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role="dialog"]') !== null;
}

export function useKeyboardShortcuts() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;

      const key = event.key.toLowerCase();
      const hasModifier = event.metaKey || event.ctrlKey;

      if (hasModifier && !event.altKey && (key === 'z' || key === 'y')) {
        if (!usesAppUndo(event.target) || isInsideDialog(event.target)) return;

        event.preventDefault();
        dispatch(key === 'y' || event.shiftKey ? redoChange() : undoChange());
        return;
      }

      if (hasModifier || event.altKey || isTypingTarget(event.target) || isInsideDialog(event.target)) return;

      if (isKeyboardControl(event.target)) return;

      const isButton = event.target instanceof HTMLButtonElement;

      if (key === ' ' && !isButton) {
        event.preventDefault();
        void player.togglePlay();
        return;
      }

      if (key === 'k') {
        void player.togglePlay();
        return;
      }

      if (key === 'm') {
        player.toggleMute();
        return;
      }

      if (key === 'arrowleft' || key === 'arrowright') {
        event.preventDefault();
        const step = event.shiftKey ? LARGE_SEEK_STEP_SEC : SEEK_STEP_SEC;
        player.seekBy(key === 'arrowleft' ? -step : step);
        return;
      }

      if (key === 'arrowup' || key === 'arrowdown') {
        event.preventDefault();
        dispatch(key === 'arrowup' ? seekToPreviousCue() : seekToNextCue());
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);
}
