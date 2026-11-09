import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const PanelIds = {
  Subtitles: 'subtitles',
  Styles: 'styles',
  Enhance: 'enhance',
  Translate: 'translate',
  Animate: 'animate',
  Font: 'font',
  Layout: 'layout',
  Background: 'background',
  Canvas: 'canvas',
  Help: 'help',
} as const;

export type PanelIdValues = (typeof PanelIds)[keyof typeof PanelIds];

export type UiState = {
  activePanel: PanelIdValues;
  selectedCueId: string | null;
  /**
   * Timeline pixels per second, or `null` to fit the whole video.
   */
  timelineZoom: number | null;
  isNewVideoDialogOpen: boolean;
  isExportDialogOpen: boolean;
  /**
   * Asks the subtitles panel to focus a caption's text. The nonce makes repeated requests distinct.
   */
  focusRequest: { cueId: string; nonce: number } | null;
};

const initialState: UiState = {
  activePanel: PanelIds.Subtitles,
  selectedCueId: null,
  timelineZoom: null,
  isNewVideoDialogOpen: false,
  isExportDialogOpen: false,
  focusRequest: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    panelOpened(state, action: PayloadAction<PanelIdValues>) {
      state.activePanel = action.payload;
    },

    cueSelected(state, action: PayloadAction<string | null>) {
      state.selectedCueId = action.payload;
    },

    cueFocusRequested(state, action: PayloadAction<string>) {
      state.selectedCueId = action.payload;
      state.activePanel = PanelIds.Subtitles;
      state.focusRequest = { cueId: action.payload, nonce: (state.focusRequest?.nonce ?? 0) + 1 };
    },

    timelineZoomChanged(state, action: PayloadAction<number | null>) {
      state.timelineZoom = action.payload;
    },

    newVideoDialogToggled(state, action: PayloadAction<boolean>) {
      state.isNewVideoDialogOpen = action.payload;
    },

    exportDialogToggled(state, action: PayloadAction<boolean>) {
      state.isExportDialogOpen = action.payload;
    },
  },
});

export const {
  panelOpened,
  cueSelected,
  cueFocusRequested,
  timelineZoomChanged,
  newVideoDialogToggled,
  exportDialogToggled,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
