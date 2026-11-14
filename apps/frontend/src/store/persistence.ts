import { parseJson } from '@src/common/utils/parseJson';
import type { SettingsState } from './slices/settings.slice';
import type { CanvasSettings, SubtitleStyle } from '@src/lib/renderer/types';

const STORAGE_KEYS = {
  settings: 'subtitles-studio:settings:v1',
  look: 'subtitles-studio:look:v1',
} as const;

type PersistedLook = {
  style: SubtitleStyle;
  canvas: CanvasSettings;
};

type PersistedState = {
  settings: Partial<SettingsState>;
  style: Partial<SubtitleStyle>;
  canvas: Partial<CanvasSettings>;
};

/**
 * Reads remembered preferences. Values whose type doesn't match the defaults are dropped, so an old or edited
 * entry can't break the app.
 */
export function loadPersistedState(props: {
  defaults: { settings: SettingsState; style: SubtitleStyle; canvas: CanvasSettings };
}): PersistedState {
  const { defaults } = props;

  const settings = readItem<Partial<SettingsState>>(STORAGE_KEYS.settings);
  const look = readItem<Partial<PersistedLook>>(STORAGE_KEYS.look);

  return {
    settings: pickMatchingTypes({ value: settings, defaults: defaults.settings }),
    style: pickMatchingTypes({ value: look?.style, defaults: defaults.style }),
    canvas: pickMatchingTypes({ value: look?.canvas, defaults: defaults.canvas }),
  };
}

let lastSaved: { settings: unknown; style: unknown; canvas: unknown } | null = null;

export function savePersistedState(props: { settings: SettingsState; style: SubtitleStyle; canvas: CanvasSettings }) {
  const { settings, style, canvas } = props;

  if (lastSaved?.settings === settings && lastSaved.style === style && lastSaved.canvas === canvas) return;

  if (lastSaved?.settings !== settings) writeItem({ key: STORAGE_KEYS.settings, value: settings });

  if (lastSaved?.style !== style || lastSaved.canvas !== canvas) {
    writeItem({ key: STORAGE_KEYS.look, value: { style, canvas } });
  }

  lastSaved = { settings, style, canvas };
}

function readItem<T>(key: string): T | null {
  try {
    const rawValue = localStorage.getItem(key);

    return parseJson<T>(rawValue);
  } catch {
    return null;
  }
}

function writeItem(props: { key: string; value: unknown }) {
  const { key, value } = props;

  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch {
    // Storage is full or disabled; preferences just won't be remembered.
  }
}

function pickMatchingTypes<T extends object>(props: { value: unknown; defaults: T }): Partial<T> {
  const { value, defaults } = props;

  if (!value || typeof value !== 'object') return {};

  const matchingEntries = Object.entries(value).filter(([key, entryValue]) => {
    if (!Object.hasOwn(defaults, key)) return false;

    const defaultValue = (defaults as Record<string, unknown>)[key];

    return defaultValue === null || entryValue === null ? true : typeof entryValue === typeof defaultValue;
  });

  return Object.fromEntries(matchingEntries) as Partial<T>;
}
