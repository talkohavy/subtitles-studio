import { describe, expect, it } from 'vite-plus/test';
import { AUTO_DETECT_LANGUAGE, JobStatuses, TranscriptionStages, TranslationStages } from '@src/lib/api/types';
import {
  ProcessingTasks,
  SessionPhases,
  type SessionState,
  type TranscriptionProgress,
  type TranslationProgress,
} from '../../store/slices/session.slice';
import { getProcessingSteps, type ProcessingStep } from './processingSteps';

const BYTES_IN_MB = 1024 * 1024;

function makeTranscription(props: Partial<TranscriptionProgress>): TranscriptionProgress {
  const transcription: TranscriptionProgress = {
    id: 'job-1',
    status: JobStatuses.Processing,
    stage: TranscriptionStages.Transcribing,
    progress: 0,
    language: null,
    languageProbability: null,
    modelId: 'small',
    device: null,
    queuePosition: null,
    modelDownload: null,
    wordsTotal: 0,
    ...props,
  };

  return transcription;
}

function makeSession(props: Partial<SessionState>): SessionState {
  const session: SessionState = {
    phase: SessionPhases.Transcribing,
    fileName: 'clip.mp4',
    fileSize: 1000,
    video: { width: 1280, height: 720, durationSec: 83.2, hasAudio: true },
    phaseProgress: 0,
    transcription: null,
    transcriptPreview: '',
    error: null,
    canRetry: false,
    requestedLanguage: AUTO_DETECT_LANGUAGE,
    requestedModelId: null,
    translationLanguage: null,
    task: ProcessingTasks.Transcribe,
    subtitlesFileName: null,
    translation: null,
    ...props,
  };

  return session;
}

function makeTranslation(props: Partial<TranslationProgress>): TranslationProgress {
  const translation: TranslationProgress = {
    id: 'translation-1',
    status: JobStatuses.Processing,
    stage: TranslationStages.Translating,
    progress: 0,
    queuePosition: null,
    modelDownload: null,
    textsTotal: 10,
    translatedCount: 0,
    ...props,
  };

  return translation;
}

type GetStepProps = {
  session: SessionState;
  stepId: string;
};

function getStep(props: GetStepProps): ProcessingStep | undefined {
  const { session, stepId } = props;

  const steps = getProcessingSteps({
    session,
    getLanguageName: (code) => `language:${code}`,
    getModelName: (modelId) => `model:${modelId}`,
  });
  const step = steps.find((processingStep) => processingStep.id === stepId);

  return step;
}

describe('getProcessingSteps', () => {
  it('should mark the steps before the current phase as done and the rest as pending', () => {
    const session = makeSession({ phase: SessionPhases.ExtractingAudio, phaseProgress: 0.4 });

    const steps = getProcessingSteps({ session, getLanguageName: String, getModelName: String });
    const actualResult = steps.map((step) => [step.id, step.status, step.progress]);

    const expectedResult = [
      ['read', 'done', null],
      ['extract', 'active', 0.4],
      ['upload', 'pending', null],
      ['model', 'pending', null],
      ['language', 'pending', null],
      ['transcribe', 'pending', null],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should show the video’s size and length once it was read', () => {
    const session = makeSession({ phase: SessionPhases.ExtractingAudio });

    const actualResult = getStep({ session, stepId: 'read' })?.detail;

    expect(actualResult).toBe('1280×720 · 1:23.2');
  });

  it('should show the place in line while another video is transcribed', () => {
    const transcription = makeTranscription({ stage: TranscriptionStages.Waiting, queuePosition: 2 });
    const session = makeSession({ transcription });

    const step = getStep({ session, stepId: 'model' });
    const actualResult = { status: step?.status, detail: step?.detail, progress: step?.progress };

    const expectedResult = { status: 'active', detail: 'Waiting in line (#2)', progress: null };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should show how much of the model was downloaded', () => {
    const modelDownload = { loadedBytes: 50 * BYTES_IN_MB, totalBytes: 200 * BYTES_IN_MB };
    const transcription = makeTranscription({ stage: TranscriptionStages.LoadingModel, modelDownload });
    const session = makeSession({ transcription });

    const step = getStep({ session, stepId: 'model' });
    const actualResult = { detail: step?.detail, progress: step?.progress };

    const expectedResult = { detail: 'Downloading, first time only · 50 of 200 MB', progress: 0.25 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should show the detected language and how sure the detection is', () => {
    const transcription = makeTranscription({ language: 'he', languageProbability: 0.934 });
    const session = makeSession({ transcription });

    const step = getStep({ session, stepId: 'language' });
    const actualResult = { status: step?.status, detail: step?.detail };

    const expectedResult = { status: 'done', detail: 'language:he · 93% sure' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should show a chosen language as known from the start', () => {
    const session = makeSession({ phase: SessionPhases.Probing, requestedLanguage: 'he' });

    const step = getStep({ session, stepId: 'language' });
    const actualResult = { label: step?.label, status: step?.status, detail: step?.detail };

    const expectedResult = { label: 'Language', status: 'done', detail: 'language:he' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should add the translation after the transcription when the subtitles are translated too', () => {
    const session = makeSession({ phase: SessionPhases.Transcribing, translationLanguage: 'he' });

    const steps = getProcessingSteps({ session, getLanguageName: String, getModelName: String });
    const actualResult = steps.map((step) => [step.id, step.status]);

    const expectedResult = [
      ['read', 'done'],
      ['extract', 'done'],
      ['upload', 'done'],
      ['model', 'active'],
      ['language', 'pending'],
      ['transcribe', 'pending'],
      ['translation-model', 'pending'],
      ['translate', 'pending'],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should only show the translation when translating existing subtitles', () => {
    const translation = makeTranslation({ stage: TranslationStages.LoadingModel });
    const session = makeSession({
      phase: SessionPhases.Translating,
      translationLanguage: 'he',
      task: ProcessingTasks.Translate,
      translation,
    });

    const steps = getProcessingSteps({ session, getLanguageName: (code) => `language:${code}`, getModelName: String });
    const actualResult = steps.map((step) => [step.label, step.status]);

    const expectedResult = [
      ['Loading the translation model', 'active'],
      ['Translating to language:he', 'pending'],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should add a subtitles file instead of transcribing when the video comes with one', () => {
    const session = makeSession({
      phase: SessionPhases.Translating,
      translationLanguage: 'he',
      task: ProcessingTasks.AddSubtitlesFile,
      subtitlesFileName: 'clip.en.srt',
    });

    const steps = getProcessingSteps({ session, getLanguageName: String, getModelName: String });
    const actualResult = steps.map((step) => [step.id, step.status, step.detail]);

    const expectedResult = [
      ['read', 'done', '1280×720 · 1:23.2'],
      ['subtitles-file', 'done', 'clip.en.srt'],
      ['translation-model', 'active', null],
      ['translate', 'pending', null],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should show how far the translation got', () => {
    const translation = makeTranslation({ progress: 0.425 });
    const session = makeSession({ phase: SessionPhases.Translating, translationLanguage: 'he', translation });

    const step = getStep({ session, stepId: 'translate' });
    const actualResult = { status: step?.status, detail: step?.detail, progress: step?.progress };

    const expectedResult = { status: 'active', detail: '43%', progress: 0.425 };
    expect(actualResult).toEqual(expectedResult);
  });
});
