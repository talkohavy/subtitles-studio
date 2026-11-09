import { formatTime } from '@src/common/utils/formatTime';
import {
  AUTO_DETECT_LANGUAGE,
  TranscriptionStages,
  TranslationStages,
  type ModelDownloadProgress,
} from '@src/lib/api/types';
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

  const transcriptionSteps = session.isTranslationOnly
    ? []
    : getTranscriptionStepDefinitions({ session, getLanguageName, getModelName });
  const translationSteps = session.translationLanguage
    ? getTranslationStepDefinitions({ session, targetLanguage: session.translationLanguage, getLanguageName })
    : [];
  const definitions = [...transcriptionSteps, ...translationSteps];
  const activeStepId = getActiveStepId(session);
  const activeIndex = definitions.findIndex((definition) => definition.id === activeStepId);

  const steps = definitions.map((definition, index) => {
    const status = getStepStatus({ index, activeIndex, isAlwaysDone: definition.isAlwaysDone });

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
  /**
   * Known before the processing starts, like a language the user picked.
   */
  isAlwaysDone: boolean;
};

function getTranscriptionStepDefinitions(props: GetProcessingStepsProps): Array<StepDefinition> {
  const { session, getLanguageName, getModelName } = props;

  const { video, phaseProgress, transcription, requestedLanguage } = session;
  const isLanguageRequested = requestedLanguage !== AUTO_DETECT_LANGUAGE;
  const modelDownload = transcription?.modelDownload ?? null;
  const queuePosition = transcription?.queuePosition ?? null;
  const detectedLanguage = transcription?.language ?? null;
  const languageProbability = transcription?.languageProbability ?? null;

  return [
    {
      id: 'read',
      label: 'Reading the video',
      activeDetail: null,
      doneDetail: video ? `${video.width}×${video.height} · ${formatTime(video.durationSec)}` : null,
      activeProgress: null,
      isAlwaysDone: false,
    },
    {
      id: 'extract',
      label: 'Extracting the audio',
      activeDetail: null,
      doneDetail: null,
      activeProgress: phaseProgress,
      isAlwaysDone: false,
    },
    {
      id: 'upload',
      label: 'Uploading the audio',
      activeDetail: null,
      doneDetail: null,
      activeProgress: phaseProgress,
      isAlwaysDone: false,
    },
    {
      id: 'model',
      label: 'Loading the AI model',
      activeDetail: getModelStepDetail({ queuePosition, modelDownload, queuedBehind: 'video' }),
      doneDetail: transcription ? getModelName(transcription.modelId) : null,
      activeProgress: getDownloadProgress({ queuePosition, modelDownload }),
      isAlwaysDone: false,
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
      isAlwaysDone: isLanguageRequested,
    },
    {
      id: 'transcribe',
      label: 'Transcribing the speech',
      activeDetail: transcription ? `${Math.round(transcription.progress * 100)}%` : null,
      doneDetail: null,
      activeProgress: transcription?.progress ?? 0,
      isAlwaysDone: false,
    },
  ];
}

type GetTranslationStepDefinitionsProps = {
  session: SessionState;
  targetLanguage: string;
  getLanguageName: (code: string) => string;
};

function getTranslationStepDefinitions(props: GetTranslationStepDefinitionsProps): Array<StepDefinition> {
  const { session, targetLanguage, getLanguageName } = props;

  const { translation } = session;
  const modelDownload = translation?.modelDownload ?? null;
  const queuePosition = translation?.queuePosition ?? null;

  return [
    {
      id: 'translation-model',
      label: 'Loading the translation model',
      activeDetail: getModelStepDetail({ queuePosition, modelDownload, queuedBehind: 'translation' }),
      doneDetail: null,
      activeProgress: getDownloadProgress({ queuePosition, modelDownload }),
      isAlwaysDone: false,
    },
    {
      id: 'translate',
      label: `Translating to ${getLanguageName(targetLanguage)}`,
      activeDetail: translation ? `${Math.round(translation.progress * 100)}%` : null,
      doneDetail: null,
      activeProgress: translation?.progress ?? 0,
      isAlwaysDone: false,
    },
  ];
}

function toProcessingStep(props: { definition: StepDefinition; status: ProcessingStepStatusValues }): ProcessingStep {
  const { definition, status } = props;

  const { id, label, activeDetail, doneDetail, activeProgress } = definition;

  if (status === ProcessingStepStatuses.Done) return { id, label, status, detail: doneDetail, progress: null };

  if (status === ProcessingStepStatuses.Active)
    return { id, label, status, detail: activeDetail, progress: activeProgress };

  return { id, label, status, detail: null, progress: null };
}

function getActiveStepId(session: SessionState): string {
  const { phase, transcription, translation } = session;

  if (phase === SessionPhases.Probing) return 'read';

  if (phase === SessionPhases.ExtractingAudio) return 'extract';

  if (phase === SessionPhases.Uploading) return 'upload';

  if (phase === SessionPhases.Translating) {
    const translationStage = translation?.stage ?? TranslationStages.Waiting;
    const isLoadingModel =
      translationStage === TranslationStages.Waiting || translationStage === TranslationStages.LoadingModel;

    return isLoadingModel ? 'translation-model' : 'translate';
  }

  const stage = transcription?.stage ?? TranscriptionStages.Waiting;

  if (stage === TranscriptionStages.Waiting || stage === TranscriptionStages.LoadingModel) return 'model';

  if (stage === TranscriptionStages.DetectingLanguage) return 'language';

  return 'transcribe';
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

type ModelProgressProps = {
  queuePosition: number | null;
  modelDownload: ModelDownloadProgress | null;
};

function getModelStepDetail(props: ModelProgressProps & { queuedBehind: 'video' | 'translation' }): string | null {
  const { queuePosition, modelDownload, queuedBehind } = props;

  if (queuePosition !== null) {
    return queuePosition === 1
      ? `Waiting for another ${queuedBehind} to finish`
      : `Waiting in line (#${queuePosition})`;
  }

  if (modelDownload) {
    const loadedMb = Math.round(modelDownload.loadedBytes / BYTES_IN_MB);
    const totalMb = Math.round(modelDownload.totalBytes / BYTES_IN_MB);

    return `Downloading, first time only · ${loadedMb} of ${totalMb} MB`;
  }

  return null;
}

function getDownloadProgress(props: ModelProgressProps): number | null {
  const { queuePosition, modelDownload } = props;

  if (!modelDownload || queuePosition !== null) return null;

  return modelDownload.loadedBytes / modelDownload.totalBytes;
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
