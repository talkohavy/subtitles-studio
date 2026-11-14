import type { TranslationModelDefinition } from '../types';

/**
 * Meta's NLLB-200 (distilled to 600M parameters), 8-bit quantized. It translates one sentence at a time well, but
 * tends to drop sentences when given several at once, so clients send sentences. About 1 second per sentence on
 * an Apple Silicon CPU.
 */
export const TRANSLATION_MODEL: TranslationModelDefinition = {
  name: 'NLLB-200',
  repo: 'Xenova/nllb-200-distilled-600M',
  approximateSizeMb: 870,
  files: [
    'config.json',
    'generation_config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'onnx/encoder_model_quantized.onnx',
    'onnx/decoder_model_merged_quantized.onnx',
  ],
};

/**
 * The languages NLLB-200 translates between, keyed by the codes the rest of the app uses (Whisper's), with the
 * FLORES-200 code NLLB expects. Whisper's Latin, Hawaiian and Breton have no NLLB counterpart.
 */
export const NLLB_LANGUAGE_CODES: Readonly<Record<string, string>> = {
  af: 'afr_Latn',
  am: 'amh_Ethi',
  ar: 'arb_Arab',
  as: 'asm_Beng',
  az: 'azj_Latn',
  ba: 'bak_Cyrl',
  be: 'bel_Cyrl',
  bg: 'bul_Cyrl',
  bn: 'ben_Beng',
  bo: 'bod_Tibt',
  bs: 'bos_Latn',
  ca: 'cat_Latn',
  cs: 'ces_Latn',
  cy: 'cym_Latn',
  da: 'dan_Latn',
  de: 'deu_Latn',
  el: 'ell_Grek',
  en: 'eng_Latn',
  es: 'spa_Latn',
  et: 'est_Latn',
  eu: 'eus_Latn',
  fa: 'pes_Arab',
  fi: 'fin_Latn',
  fo: 'fao_Latn',
  fr: 'fra_Latn',
  gl: 'glg_Latn',
  gu: 'guj_Gujr',
  ha: 'hau_Latn',
  he: 'heb_Hebr',
  hi: 'hin_Deva',
  hr: 'hrv_Latn',
  ht: 'hat_Latn',
  hu: 'hun_Latn',
  hy: 'hye_Armn',
  id: 'ind_Latn',
  is: 'isl_Latn',
  it: 'ita_Latn',
  ja: 'jpn_Jpan',
  jw: 'jav_Latn',
  ka: 'kat_Geor',
  kk: 'kaz_Cyrl',
  km: 'khm_Khmr',
  kn: 'kan_Knda',
  ko: 'kor_Hang',
  lb: 'ltz_Latn',
  ln: 'lin_Latn',
  lo: 'lao_Laoo',
  lt: 'lit_Latn',
  lv: 'lvs_Latn',
  mg: 'plt_Latn',
  mi: 'mri_Latn',
  mk: 'mkd_Cyrl',
  ml: 'mal_Mlym',
  mn: 'khk_Cyrl',
  mr: 'mar_Deva',
  ms: 'zsm_Latn',
  mt: 'mlt_Latn',
  my: 'mya_Mymr',
  ne: 'npi_Deva',
  nl: 'nld_Latn',
  nn: 'nno_Latn',
  no: 'nob_Latn',
  oc: 'oci_Latn',
  pa: 'pan_Guru',
  pl: 'pol_Latn',
  ps: 'pbt_Arab',
  pt: 'por_Latn',
  ro: 'ron_Latn',
  ru: 'rus_Cyrl',
  sa: 'san_Deva',
  sd: 'snd_Arab',
  si: 'sin_Sinh',
  sk: 'slk_Latn',
  sl: 'slv_Latn',
  sn: 'sna_Latn',
  so: 'som_Latn',
  sq: 'als_Latn',
  sr: 'srp_Cyrl',
  su: 'sun_Latn',
  sv: 'swe_Latn',
  sw: 'swh_Latn',
  ta: 'tam_Taml',
  te: 'tel_Telu',
  tg: 'tgk_Cyrl',
  th: 'tha_Thai',
  tk: 'tuk_Latn',
  tl: 'tgl_Latn',
  tr: 'tur_Latn',
  tt: 'tat_Cyrl',
  uk: 'ukr_Cyrl',
  ur: 'urd_Arab',
  uz: 'uzn_Latn',
  vi: 'vie_Latn',
  yi: 'ydd_Hebr',
  yo: 'yor_Latn',
  yue: 'yue_Hant',
  zh: 'zho_Hans',
};

export const TRANSLATION_LANGUAGE_CODES: ReadonlyArray<string> = Object.keys(NLLB_LANGUAGE_CODES);

export const MAX_TEXTS_PER_TRANSLATION = 5000;
export const MAX_TEXT_LENGTH = 2000;

export const TranslationStages = {
  Waiting: 'waiting',
  LoadingModel: 'loading-model',
  Translating: 'translating',
  Done: 'done',
} as const;

type TypeOfTranslationStages = typeof TranslationStages;
export type TranslationStageKeys = keyof TypeOfTranslationStages;
export type TranslationStageValues = TypeOfTranslationStages[TranslationStageKeys];

/**
 * Besides the requests every worker understands (see `WorkerJobRequestTypes`).
 */
export const TranslationWorkerRequestTypes = {
  Translate: 'translate',
} as const;

/**
 * Progress events, besides the events every worker sends (see `WorkerJobEventTypes`).
 */
export const TranslationWorkerEventTypes = {
  Stage: 'stage',
  ModelDownload: 'model-download',
  Translations: 'translations',
} as const;
