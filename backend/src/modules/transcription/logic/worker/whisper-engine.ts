import {
  env,
  pipeline,
  Tensor,
  type AutomaticSpeechRecognitionOutput,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';
import { createDownloadProgressHandler } from '@src/common/utils/createDownloadProgressHandler';
import { getErrorMessage } from '@src/common/utils/getErrorMessage';
import { WHISPER_SAMPLE_RATE, WhisperDevice } from '../constants';
import type { ModelDownloadProgress } from '@src/common/types';
import type { WhisperRuntime } from '../../types';
import type { RawWordChunk } from '../utils/normalizeWords';

type LoadProps = {
  repo: string;
  runtimes: Array<WhisperRuntime>;
  modelsDir: string;
  allowRemoteModels: boolean;
  onDownloadProgress: (progress: ModelDownloadProgress) => void;
  onRuntimeFailed: (props: { runtime: WhisperRuntime; error: unknown }) => void;
};

type DetectLanguageProps = {
  /**
   * 16kHz mono windows, at most 30 seconds each, in playback order.
   */
  windows: Array<Float32Array>;
};

type DetectedLanguage = {
  language: string;
  probability: number;
};

type TranscribeProps = {
  /**
   * 16kHz mono, at most 30 seconds.
   */
  samples: Float32Array;
  language: string;
};

type LoadedModel = {
  key: string;
  runtime: WhisperRuntime;
  transcriber: AutomaticSpeechRecognitionPipeline;
};

type WhisperGenerationConfig = {
  lang_to_id: Record<string, number>;
  decoder_start_token_id: number;
};

const BYTES_IN_MB = 1024 * 1024;
const MAX_LANGUAGE_DETECTION_WINDOWS = 3;
/**
 * Detection stops early once the windows seen so far agree with at least this probability.
 */
const CONFIDENT_LANGUAGE_PROBABILITY = 0.75;
const WARM_UP_SAMPLES = WHISPER_SAMPLE_RATE;

/**
 * Wraps transformers.js' Whisper pipeline. Keeps one model in memory; loading another unloads it.
 */
export class WhisperEngine {
  private loadedModel: LoadedModel | null = null;

  /**
   * Loads the first runtime (device + dtype) that works, downloading its files if needed.
   *
   * @returns The runtime that was loaded.
   */
  async load(props: LoadProps): Promise<WhisperRuntime> {
    const { repo, runtimes, modelsDir, allowRemoteModels, onDownloadProgress, onRuntimeFailed } = props;

    const alreadyLoadedRuntime = runtimes.find((runtime) => getModelKey({ repo, runtime }) === this.loadedModel?.key);

    if (alreadyLoadedRuntime) return alreadyLoadedRuntime;

    env.cacheDir = modelsDir;
    env.allowRemoteModels = allowRemoteModels;
    env.allowLocalModels = false;

    const failures: Array<string> = [];

    for (let runtimeIndex = 0; runtimeIndex < runtimes.length; runtimeIndex++) {
      const runtime = runtimes[runtimeIndex]!;

      try {
        await this.unload();

        const transcriber = await this.createTranscriber({ repo, runtime, onDownloadProgress });

        this.loadedModel = { key: getModelKey({ repo, runtime }), runtime, transcriber };

        return runtime;
      } catch (error) {
        failures.push(`${runtime.device}/${runtime.dtype}: ${getErrorMessage(error)}`);
        onRuntimeFailed({ runtime, error });
      }
    }

    throw new Error(`Could not load the speech recognition model "${repo}" (${failures.join('; ')})`);
  }

  async unload(): Promise<void> {
    const loadedModel = this.loadedModel;

    this.loadedModel = null;

    await loadedModel?.transcriber.dispose();
  }

  /**
   * Whisper predicts the language as the first token after start-of-transcript. Averages the language
   * probabilities of the first few windows, stopping as soon as they agree.
   */
  async detectLanguage(props: DetectLanguageProps): Promise<DetectedLanguage> {
    const { windows } = props;
    const { transcriber } = this.getLoadedModel();

    const generationConfig = transcriber.model.generation_config as unknown as WhisperGenerationConfig;
    const languageTokens = Object.entries(generationConfig.lang_to_id);
    const probabilitySums = new Float64Array(languageTokens.length);
    const windowsToCheck = windows.slice(0, MAX_LANGUAGE_DETECTION_WINDOWS);

    let checkedWindows = 0;
    let bestIndex = 0;

    for (let windowIndex = 0; windowIndex < windowsToCheck.length; windowIndex++) {
      const languageLogits = await this.computeLanguageLogits({
        samples: windowsToCheck[windowIndex]!,
        tokenIds: languageTokens.map(([, tokenId]) => tokenId),
        decoderStartTokenId: generationConfig.decoder_start_token_id,
      });
      const probabilities = softmax(languageLogits);

      probabilities.forEach((probability, languageIndex) => {
        probabilitySums[languageIndex]! += probability;
      });

      checkedWindows++;
      bestIndex = getIndexOfMax(probabilitySums);

      if (probabilitySums[bestIndex]! / checkedWindows >= CONFIDENT_LANGUAGE_PROBABILITY) break;
    }

    const [bestToken] = languageTokens[bestIndex]!;

    return {
      language: bestToken.slice(2, -2),
      probability: probabilitySums[bestIndex]! / Math.max(1, checkedWindows),
    };
  }

  /**
   * @throws When the model doesn't support `language`.
   */
  async transcribe(props: TranscribeProps): Promise<Array<RawWordChunk>> {
    const { samples, language } = props;
    const { transcriber } = this.getLoadedModel();

    const output = await transcriber(samples, { return_timestamps: 'word', language, task: 'transcribe' });
    const result: AutomaticSpeechRecognitionOutput | undefined = Array.isArray(output) ? output[0] : output;
    const chunks = (result?.chunks ?? []) as Array<RawWordChunk>;

    return chunks;
  }

  supportsLanguage(language: string): boolean {
    const { transcriber } = this.getLoadedModel();
    const generationConfig = transcriber.model.generation_config as unknown as WhisperGenerationConfig;

    return `<|${language}|>` in generationConfig.lang_to_id;
  }

  private async createTranscriber(props: {
    repo: string;
    runtime: WhisperRuntime;
    onDownloadProgress: LoadProps['onDownloadProgress'];
  }): Promise<AutomaticSpeechRecognitionPipeline> {
    const { repo, runtime, onDownloadProgress } = props;

    const handleProgress = createDownloadProgressHandler({
      approximateTotalBytes: runtime.approximateSizeMb * BYTES_IN_MB,
      onDownloadProgress,
    });

    const transcriber = await pipeline('automatic-speech-recognition', repo, {
      device: runtime.device,
      dtype: runtime.dtype,
      progress_callback: handleProgress,
    });

    // GPU backends can load fine and still fail on the first inference, so prove the runtime works now.
    if (runtime.device !== WhisperDevice.Cpu) {
      try {
        await transcriber(new Float32Array(WARM_UP_SAMPLES), { language: 'en', task: 'transcribe' });
      } catch (error) {
        await transcriber.dispose();
        throw error;
      }
    }

    return transcriber;
  }

  private async computeLanguageLogits(props: {
    samples: Float32Array;
    tokenIds: Array<number>;
    decoderStartTokenId: number;
  }): Promise<Array<number>> {
    const { samples, tokenIds, decoderStartTokenId } = props;
    const { transcriber } = this.getLoadedModel();

    const { input_features: inputFeatures } = await transcriber.processor(samples);
    const decoderInputIds = new Tensor('int64', [BigInt(decoderStartTokenId)], [1, 1]);
    const output = (await transcriber.model({
      input_features: inputFeatures,
      decoder_input_ids: decoderInputIds,
    })) as Record<string, unknown> & { logits: Tensor };

    const logits = output.logits.type === 'float16' ? output.logits.to('float32') : output.logits;
    const logitsData = logits.data as Float32Array;
    const languageLogits = tokenIds.map((tokenId) => logitsData[tokenId]!);

    // On GPU backends the cache tensors (`present.*`) live in GPU memory until disposed.
    Object.values(output).forEach((value) => {
      if (isDisposable(value)) value.dispose();
    });
    inputFeatures.dispose();
    decoderInputIds.dispose();

    return languageLogits;
  }

  private getLoadedModel(): LoadedModel {
    if (!this.loadedModel) throw new Error('No speech recognition model is loaded');

    return this.loadedModel;
  }
}

function getModelKey(props: { repo: string; runtime: WhisperRuntime }): string {
  const { repo, runtime } = props;

  return `${repo}|${runtime.device}|${runtime.dtype}`;
}

function isDisposable(value: unknown): value is { dispose: () => unknown } {
  return typeof (value as { dispose?: unknown } | null)?.dispose === 'function';
}

function softmax(values: Array<number>): Array<number> {
  const max = Math.max(...values);
  const exponents = values.map((value) => Math.exp(value - max));
  const sum = exponents.reduce((total, value) => total + value, 0);
  const probabilities = exponents.map((value) => value / sum);

  return probabilities;
}

function getIndexOfMax(values: Float64Array): number {
  let indexOfMax = 0;

  values.forEach((value, index) => {
    if (value > values[indexOfMax]!) indexOfMax = index;
  });

  return indexOfMax;
}
