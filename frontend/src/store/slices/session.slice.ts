import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TranscriptionJob } from '@src/lib/api/types';
import type { VideoInfo } from '@src/lib/media/probeVideo';

export const SessionPhases = {
  Idle: 'idle',
  Probing: 'probing',
  ExtractingAudio: 'extracting-audio',
  Uploading: 'uploading',
  Transcribing: 'transcribing',
  Ready: 'ready',
  Failed: 'failed',
} as const;

export type SessionPhaseValues = (typeof SessionPhases)[keyof typeof SessionPhases];

export type TranscriptionProgress = Pick<
  TranscriptionJob,
  | 'id'
  | 'status'
  | 'stage'
  | 'progress'
  | 'language'
  | 'languageProbability'
  | 'modelId'
  | 'device'
  | 'queuePosition'
  | 'modelDownload'
  | 'wordsTotal'
>;

export type SessionState = {
  phase: SessionPhaseValues;
  fileName: string | null;
  fileSize: number;
  video: VideoInfo | null;
  /**
   * Progress of the current phase, from 0 to 1.
   */
  phaseProgress: number;
  transcription: TranscriptionProgress | null;
  /**
   * The end of the transcript so far, shown while transcribing.
   */
  transcriptPreview: string;
  error: string | null;
  /**
   * The audio is already extracted, so only the transcription has to run again.
   */
  canRetry: boolean;
  requestedLanguage: string;
  requestedModelId: string | null;
};

const initialState: SessionState = {
  phase: SessionPhases.Idle,
  fileName: null,
  fileSize: 0,
  video: null,
  phaseProgress: 0,
  transcription: null,
  transcriptPreview: '',
  error: null,
  canRetry: false,
  requestedLanguage: 'auto',
  requestedModelId: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<{ fileName: string; fileSize: number }>) {
      return {
        ...initialState,
        phase: SessionPhases.Probing,
        fileName: action.payload.fileName,
        fileSize: action.payload.fileSize,
        requestedLanguage: state.requestedLanguage,
        requestedModelId: state.requestedModelId,
      };
    },

    videoProbed(state, action: PayloadAction<VideoInfo>) {
      state.video = action.payload;
    },

    transcriptionRequested(state, action: PayloadAction<{ language: string; modelId: string | null }>) {
      state.requestedLanguage = action.payload.language;
      state.requestedModelId = action.payload.modelId;
      state.transcription = null;
      state.transcriptPreview = '';
      state.error = null;
    },

    phaseChanged(state, action: PayloadAction<SessionPhaseValues>) {
      state.phase = action.payload;
      state.phaseProgress = 0;
    },

    phaseProgressed(state, action: PayloadAction<number>) {
      state.phaseProgress = action.payload;
    },

    transcriptionProgressed(state, action: PayloadAction<{ job: TranscriptionProgress; transcriptPreview: string }>) {
      state.transcription = action.payload.job;
      state.transcriptPreview = action.payload.transcriptPreview;
    },

    sessionReady(state) {
      state.phase = SessionPhases.Ready;
      state.error = null;
    },

    sessionFailed(state, action: PayloadAction<{ error: string; canRetry: boolean }>) {
      state.phase = SessionPhases.Failed;
      state.error = action.payload.error;
      state.canRetry = action.payload.canRetry;
    },

    sessionCleared(state) {
      return { ...initialState, requestedLanguage: state.requestedLanguage, requestedModelId: state.requestedModelId };
    },
  },
});

export const {
  sessionStarted,
  videoProbed,
  transcriptionRequested,
  phaseChanged,
  phaseProgressed,
  transcriptionProgressed,
  sessionReady,
  sessionFailed,
  sessionCleared,
} = sessionSlice.actions;

export const sessionReducer = sessionSlice.reducer;
