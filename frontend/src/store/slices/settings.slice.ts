import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { AUTO_DETECT_LANGUAGE } from '@src/lib/api/types';
import { ExportQualities, type ExportQualityValues } from '@src/lib/media/constants';
import { CaptionLengths, type CaptionLengthValues } from '@src/lib/subtitles/constants';

/**
 * Preferences remembered between visits.
 */
export type SettingsState = {
  /**
   * A language code, or `auto`.
   */
  language: string;
  /**
   * `null` uses the server's default model.
   */
  modelId: string | null;
  captionLength: CaptionLengthValues;
  exportQuality: ExportQualityValues;
};

export const initialSettingsState: SettingsState = {
  language: AUTO_DETECT_LANGUAGE,
  modelId: null,
  captionLength: CaptionLengths.Line,
  exportQuality: ExportQualities.High,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState: initialSettingsState,
  reducers: {
    settingsChanged(state, action: PayloadAction<Partial<SettingsState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const { settingsChanged } = settingsSlice.actions;

export const settingsReducer = settingsSlice.reducer;
