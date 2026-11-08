export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * How the Cmd/Ctrl key is written in shortcut hints.
 */
export const MOD_KEY_LABEL = IS_MAC ? '⌘' : 'Ctrl+';
