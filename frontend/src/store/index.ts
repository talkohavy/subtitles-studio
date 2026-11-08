import { useDispatch, useSelector } from 'react-redux';
import { combineReducers, configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit';
import { DEFAULT_CANVAS_SETTINGS, DEFAULT_SUBTITLE_STYLE } from '@src/lib/renderer/presets';
import { loadPersistedState, savePersistedState } from './persistence';
import { initialProjectState, projectReducer } from './slices/project.slice';
import { sessionReducer } from './slices/session.slice';
import { initialSettingsState, settingsReducer } from './slices/settings.slice';
import { uiReducer } from './slices/ui.slice';
import { createUndoableState } from './undoable';

const rootReducer = combineReducers({
  project: projectReducer,
  session: sessionReducer,
  ui: uiReducer,
  settings: settingsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function createAppStore(props?: { preloadedState?: Partial<RootState> }) {
  const { preloadedState } = props ?? {};

  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    // The checks walk the whole state on every action, which is slow with long transcripts.
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }),
  });

  return store;
}

function createBrowserStore() {
  const persisted = loadPersistedState({
    defaults: { settings: initialSettingsState, style: DEFAULT_SUBTITLE_STYLE, canvas: DEFAULT_CANVAS_SETTINGS },
  });

  const browserStore = createAppStore({
    preloadedState: {
      settings: { ...initialSettingsState, ...persisted.settings },
      project: createUndoableState({
        ...initialProjectState,
        style: { ...DEFAULT_SUBTITLE_STYLE, ...persisted.style },
        canvas: { ...DEFAULT_CANVAS_SETTINGS, ...persisted.canvas },
      }),
    },
  });

  let lastSaved = { settings: initialSettingsState, style: DEFAULT_SUBTITLE_STYLE, canvas: DEFAULT_CANVAS_SETTINGS };

  browserStore.subscribe(() => {
    const { settings, project } = browserStore.getState();
    const { style, canvas } = project.present;
    const hasChanges = settings !== lastSaved.settings || style !== lastSaved.style || canvas !== lastSaved.canvas;

    if (!hasChanges) return;

    lastSaved = { settings, style, canvas };
    savePersistedState({ settings, style, canvas });
  });

  return browserStore;
}

export const store = createBrowserStore();

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, undefined, UnknownAction>;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
