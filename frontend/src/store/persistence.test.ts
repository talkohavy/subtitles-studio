import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { DEFAULT_CANVAS_SETTINGS, DEFAULT_SUBTITLE_STYLE } from '@src/lib/renderer/presets';
import { savePersistedState } from './persistence';
import { initialSettingsState } from './slices/settings.slice';

function createPreferences() {
  const preferences = {
    settings: { ...initialSettingsState },
    style: { ...DEFAULT_SUBTITLE_STYLE },
    canvas: { ...DEFAULT_CANVAS_SETTINGS },
  };

  return preferences;
}

describe('savePersistedState', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should write nothing when saving the same preferences again', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const preferences = createPreferences();

    savePersistedState(preferences);
    const writesAfterFirstSave = setItem.mock.calls.length;
    savePersistedState(preferences);
    const actualResult = { writesAfterFirstSave, writesAfterSecondSave: setItem.mock.calls.length };

    const expectedResult = { writesAfterFirstSave: 2, writesAfterSecondSave: 2 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should rewrite only the look when only the style changed', () => {
    const preferences = createPreferences();
    savePersistedState(preferences);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    savePersistedState({ ...preferences, style: { ...preferences.style } });
    const actualResult = setItem.mock.calls.map(([key]) => key);

    const expectedResult = ['subtitles-studio:look:v1'];
    expect(actualResult).toEqual(expectedResult);
  });
});
