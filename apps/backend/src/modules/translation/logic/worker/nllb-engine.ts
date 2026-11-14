import { env, pipeline, type TranslationPipeline } from '@huggingface/transformers';
import { createDownloadProgressHandler } from '@src/common/utils/createDownloadProgressHandler';
import { trimShortLineTranslation } from '../utils/trimShortLineTranslation';
import type { ModelDownloadProgress } from '@src/common/types';

type LoadProps = {
  repo: string;
  approximateSizeMb: number;
  modelsDir: string;
  allowRemoteModels: boolean;
  onDownloadProgress: (progress: ModelDownloadProgress) => void;
};

type TranslateProps = {
  text: string;
  /**
   * A FLORES-200 code, e.g. `eng_Latn`.
   */
  sourceLanguage: string;
  /**
   * A FLORES-200 code, e.g. `heb_Hebr`.
   */
  targetLanguage: string;
};

const BYTES_IN_MB = 1024 * 1024;
/**
 * A translation rarely needs more tokens than its source; the cap stops a model that got stuck repeating itself.
 */
const MAX_OUTPUT_TOKENS_PER_INPUT_TOKEN = 3;
const MIN_MAX_NEW_TOKENS = 16;
const MAX_NEW_TOKENS = 512;
const HAS_WORDS = /[\p{L}\p{N}]/u;
/**
 * SentencePiece marks a word start with "▁", so these are dashes that open a word ("- Yes", "-5"), not hyphens.
 */
const WORD_START_DASH_TOKEN_PREFIX = '▁-';
const WORD_START_DASH = /(?:^|\s)[-–—]/u;

/**
 * Wraps transformers.js' translation pipeline around NLLB-200. Runs on the CPU: the 8-bit model is the smallest
 * download, and the GPU builds are twice its size.
 */
export class NllbEngine {
  private loadedRepo: string | null = null;
  private translator: TranslationPipeline | null = null;
  private dashTokenIds: Array<Array<number>> = [];

  /**
   * Loads the model, downloading its files if needed. Does nothing when it's already loaded.
   */
  async load(props: LoadProps): Promise<void> {
    const { repo, approximateSizeMb, modelsDir, allowRemoteModels, onDownloadProgress } = props;

    if (this.loadedRepo === repo) return;

    env.cacheDir = modelsDir;
    env.allowRemoteModels = allowRemoteModels;
    env.allowLocalModels = false;

    await this.translator?.dispose();
    this.translator = null;
    this.loadedRepo = null;

    const handleProgress = createDownloadProgressHandler({
      approximateTotalBytes: approximateSizeMb * BYTES_IN_MB,
      onDownloadProgress,
    });
    const translator = await pipeline('translation', repo, {
      device: 'cpu',
      dtype: 'q8',
      progress_callback: handleProgress,
    });
    const dashTokenIds: Array<Array<number>> = [];

    translator.tokenizer.get_vocab().forEach((id, token) => {
      if (token.startsWith(WORD_START_DASH_TOKEN_PREFIX)) dashTokenIds.push([id]);
    });

    this.translator = translator;
    this.dashTokenIds = dashTokenIds;
    this.loadedRepo = repo;
  }

  /**
   * Text without letters or digits (e.g. "♪" or "...") comes back unchanged.
   *
   * NLLB learned a lot from movie subtitles: a short line can come back as dialogue it made up, opened by a dash
   * ("That's it." → "זה הכל. -כן."). Unless the line has dashes of its own, dashes that open a word are banned, which
   * also steers the model back to translating instead of inventing a reply.
   */
  async translate(props: TranslateProps): Promise<string> {
    const { text, sourceLanguage, targetLanguage } = props;

    if (!HAS_WORDS.test(text)) return text;

    const translator = this.getTranslator();
    const { input_ids: inputIds } = translator.tokenizer(text);
    const inputTokens = inputIds.dims.at(-1) ?? 0;
    const maxNewTokens = Math.min(
      MAX_NEW_TOKENS,
      Math.max(MIN_MAX_NEW_TOKENS, inputTokens * MAX_OUTPUT_TOKENS_PER_INPUT_TOKEN),
    );
    const badWordsIds = WORD_START_DASH.test(text) ? [] : this.dashTokenIds;

    const output = await translator(text, {
      src_lang: sourceLanguage,
      tgt_lang: targetLanguage,
      max_new_tokens: maxNewTokens,
      bad_words_ids: badWordsIds,
    });
    const rawTranslation = output[0]?.translation_text.trim() ?? '';
    const translation = trimShortLineTranslation({ text, translation: rawTranslation });

    return translation;
  }

  private getTranslator(): TranslationPipeline {
    if (!this.translator) throw new Error('No translation model is loaded');

    return this.translator;
  }
}
