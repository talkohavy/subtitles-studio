import { describe, expect, it } from 'vite-plus/test';
import { AUTO_DETECT_LANGUAGE, TranscriptionStages, TranscriptionStatuses } from '@src/lib/api/types';
import { SessionPhases, type SessionState, type TranscriptionProgress } from '../../store/slices/session.slice';
import { getProcessingSteps, type ProcessingStep } from './processingSteps';

const BYTES_IN_MB = 1024 * 1024;

function makeTranscription(props: Partial<TranscriptionProgress>): TranscriptionProgress {
  const transcription: TranscriptionProgress = {
    id: 'job-1',
    status: TranscriptionStatuses.Processing,
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
    ...props,
  };

  return session;
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
});
