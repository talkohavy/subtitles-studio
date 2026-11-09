import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TranscriptionJob, TranslationJob } from '@src/lib/api/types';
import type { VideoInfo } from '@src/lib/media/probeVideo';

export const SessionPhases = {
  Idle: 'idle',
  Probing: 'probing',
  ExtractingAudio: 'extracting-audio',
  Uploading: 'uploading',
  Transcribing: 'transcribing',
  Translating: 'translating',
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

export type TranslationProgress = Pick<
  TranslationJob,
  'id' | 'status' | 'stage' | 'progress' | 'queuePosition' | 'modelDownload' | 'textsTotal' | 'translatedCount'
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
   * The end of the transcript (or of its translation) so far, shown while processing.
   */
  transcriptPreview: string;
  error: string | null;
  /**
   * The audio is already extracted, so only the transcription has to run again.
   */
  canRetry: boolean;
  requestedLanguage: string;
  requestedModelId: string | null;
  /**
   * The language the subtitles are translated into as part of the processing, if any.
   */
  translationLanguage: string | null;
  /**
   * The processing translates the existing subtitles, without transcribing.
   */
  isTranslationOnly: boolean;
  translation: TranslationProgress | null;
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
  translationLanguage: null,
  isTranslationOnly: false,
  translation: null,
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

    transcriptionRequested(
      state,
      action: PayloadAction<{ language: string; modelId: string | null; translationLanguage: string | null }>,
    ) {
      state.requestedLanguage = action.payload.language;
      state.requestedModelId = action.payload.modelId;
      state.translationLanguage = action.payload.translationLanguage;
      state.isTranslationOnly = false;
      state.transcription = null;
      state.translation = null;
      state.transcriptPreview = '';
      state.error = null;
    },

    translationRequested(state, action: PayloadAction<{ targetLanguage: string }>) {
      state.translationLanguage = action.payload.targetLanguage;
      state.isTranslationOnly = true;
      state.translation = null;
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

    translationProgressed(state, action: PayloadAction<{ job: TranslationProgress; transcriptPreview: string }>) {
      state.translation = action.payload.job;
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
  translationRequested,
  phaseChanged,
  phaseProgressed,
  transcriptionProgressed,
  translationProgressed,
  sessionReady,
  sessionFailed,
  sessionCleared,
} = sessionSlice.actions;

export const sessionReducer = sessionSlice.reducer;
