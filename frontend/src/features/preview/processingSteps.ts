import { formatTime } from '@src/common/utils/formatTime';
import { AUTO_DETECT_LANGUAGE, TranscriptionStages } from '@src/lib/api/types';
import { SessionPhases, type SessionState } from '../../store/slices/session.slice';

export const ProcessingStepStatuses = {
  Done: 'done',
  Active: 'active',
  Pending: 'pending',
} as const;

export type ProcessingStepStatusValues = (typeof ProcessingStepStatuses)[keyof typeof ProcessingStepStatuses];

export type ProcessingStep = {
  id: string;
  label: string;
  status: ProcessingStepStatusValues;
  detail: string | null;
  /**
   * From 0 to 1, or `null` when it can't be measured. Only set on the active step.
   */
  progress: number | null;
};

const BYTES_IN_MB = 1024 * 1024;

type GetProcessingStepsProps = {
  session: SessionState;
  getLanguageName: (code: string) => string;
  getModelName: (modelId: string) => string;
};

/**
 * The checklist shown while a video is processed, from the session's phase and the server's progress reports.
 */
export function getProcessingSteps(props: GetProcessingStepsProps): Array<ProcessingStep> {
  const { session, getLanguageName, getModelName } = props;

  const { video, phaseProgress, transcription, requestedLanguage } = session;
  const activeIndex = getActiveStepIndex(session);
  const isLanguageRequested = requestedLanguage !== AUTO_DETECT_LANGUAGE;

  const modelDownload = transcription?.modelDownload ?? null;
  const queuePosition = transcription?.queuePosition ?? null;
  const detectedLanguage = transcription?.language ?? null;
  const languageProbability = transcription?.languageProbability ?? null;

  const definitions: Array<StepDefinition> = [
    {
      id: 'read',
      label: 'Reading the video',
      activeDetail: null,
      doneDetail: video ? `${video.width}×${video.height} · ${formatTime(video.durationSec)}` : null,
      activeProgress: null,
    },
    {
      id: 'extract',
      label: 'Extracting the audio',
      activeDetail: null,
      doneDetail: null,
      activeProgress: phaseProgress,
    },
    {
      id: 'upload',
      label: 'Uploading the audio',
      activeDetail: null,
      doneDetail: null,
      activeProgress: phaseProgress,
    },
    {
      id: 'model',
      label: 'Loading the AI model',
      activeDetail: getModelStepDetail({ queuePosition, modelDownload }),
      doneDetail: transcription ? getModelName(transcription.modelId) : null,
      activeProgress:
        modelDownload && queuePosition === null ? modelDownload.loadedBytes / modelDownload.totalBytes : null,
    },
    {
      id: 'language',
      label: isLanguageRequested ? 'Language' : 'Detecting the language',
      activeDetail: null,
      doneDetail: getLanguageStepDetail({
        language: isLanguageRequested ? requestedLanguage : detectedLanguage,
        probability: isLanguageRequested ? null : languageProbability,
        getLanguageName,
      }),
      activeProgress: null,
    },
    {
      id: 'transcribe',
      label: 'Transcribing the speech',
      activeDetail: transcription ? `${Math.round(transcription.progress * 100)}%` : null,
      doneDetail: null,
      activeProgress: transcription?.progress ?? 0,
    },
  ];

  const steps = definitions.map((definition, index) => {
    const isLanguageKnown = definition.id === 'language' && isLanguageRequested;
    const status = getStepStatus({ index, activeIndex, isAlwaysDone: isLanguageKnown });

    return toProcessingStep({ definition, status });
  });

  return steps;
}

type StepDefinition = {
  id: string;
  label: string;
  activeDetail: string | null;
  doneDetail: string | null;
  activeProgress: number | null;
};

function toProcessingStep(props: { definition: StepDefinition; status: ProcessingStepStatusValues }): ProcessingStep {
  const { definition, status } = props;

  const { id, label, activeDetail, doneDetail, activeProgress } = definition;

  if (status === ProcessingStepStatuses.Done) return { id, label, status, detail: doneDetail, progress: null };

  if (status === ProcessingStepStatuses.Active)
    return { id, label, status, detail: activeDetail, progress: activeProgress };

  return { id, label, status, detail: null, progress: null };
}

function getActiveStepIndex(session: SessionState): number {
  const { phase, transcription } = session;

  if (phase === SessionPhases.Probing) return 0;

  if (phase === SessionPhases.ExtractingAudio) return 1;

  if (phase === SessionPhases.Uploading) return 2;

  const stage = transcription?.stage ?? TranscriptionStages.Waiting;

  if (stage === TranscriptionStages.Waiting || stage === TranscriptionStages.LoadingModel) return 3;

  if (stage === TranscriptionStages.DetectingLanguage) return 4;

  return 5;
}

function getStepStatus(props: {
  index: number;
  activeIndex: number;
  isAlwaysDone: boolean;
}): ProcessingStepStatusValues {
  const { index, activeIndex, isAlwaysDone } = props;

  if (index < activeIndex || isAlwaysDone) return ProcessingStepStatuses.Done;

  if (index === activeIndex) return ProcessingStepStatuses.Active;

  return ProcessingStepStatuses.Pending;
}

function getModelStepDetail(props: {
  queuePosition: number | null;
  modelDownload: { loadedBytes: number; totalBytes: number } | null;
}): string | null {
  const { queuePosition, modelDownload } = props;

  if (queuePosition !== null) {
    return queuePosition === 1 ? 'Waiting for another video to finish' : `Waiting in line (#${queuePosition})`;
  }

  if (modelDownload) {
    const loadedMb = Math.round(modelDownload.loadedBytes / BYTES_IN_MB);
    const totalMb = Math.round(modelDownload.totalBytes / BYTES_IN_MB);

    return `Downloading, first time only · ${loadedMb} of ${totalMb} MB`;
  }

  return null;
}

function getLanguageStepDetail(props: {
  language: string | null;
  probability: number | null;
  getLanguageName: (code: string) => string;
}): string | null {
  const { language, probability, getLanguageName } = props;

  if (!language) return null;

  const name = getLanguageName(language);

  return probability === null ? name : `${name} · ${Math.round(probability * 100)}% sure`;
}
