const LATIN = /\p{Script=Latin}/gu;
const CYRILLIC = /\p{Script=Cyrillic}/gu;
const ARABIC = /\p{Script=Arabic}/gu;
const HAN = /\p{Script=Han}/gu;
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/gu;

/**
 * Scripts used by a single language Whisper knows (or by one far more than the others).
 */
const SCRIPT_LANGUAGES: ReadonlyArray<{ pattern: RegExp; language: string }> = [
  { pattern: /\p{Script=Hebrew}/gu, language: 'he' },
  { pattern: /\p{Script=Greek}/gu, language: 'el' },
  { pattern: /\p{Script=Hangul}/gu, language: 'ko' },
  { pattern: /\p{Script=Thai}/gu, language: 'th' },
  { pattern: /\p{Script=Devanagari}/gu, language: 'hi' },
  { pattern: /\p{Script=Bengali}/gu, language: 'bn' },
  { pattern: /\p{Script=Tamil}/gu, language: 'ta' },
  { pattern: /\p{Script=Telugu}/gu, language: 'te' },
  { pattern: /\p{Script=Kannada}/gu, language: 'kn' },
  { pattern: /\p{Script=Malayalam}/gu, language: 'ml' },
  { pattern: /\p{Script=Gujarati}/gu, language: 'gu' },
  { pattern: /\p{Script=Gurmukhi}/gu, language: 'pa' },
  { pattern: /\p{Script=Sinhala}/gu, language: 'si' },
  { pattern: /\p{Script=Georgian}/gu, language: 'ka' },
  { pattern: /\p{Script=Armenian}/gu, language: 'hy' },
  { pattern: /\p{Script=Ethiopic}/gu, language: 'am' },
  { pattern: /\p{Script=Khmer}/gu, language: 'km' },
  { pattern: /\p{Script=Lao}/gu, language: 'lo' },
  { pattern: /\p{Script=Myanmar}/gu, language: 'my' },
  { pattern: /\p{Script=Tibetan}/gu, language: 'bo' },
];

const MIN_LETTERS = 20;
/**
 * Japanese mixes kana into its kanji; Chinese has none.
 */
const MIN_JAPANESE_KANA_SHARE = 0.05;

/**
 * Guesses the language of subtitles from their text: by script, and for Latin and Cyrillic scripts by the letters
 * and common words each language has.
 *
 * @returns `null` when there's too little text or it isn't clear.
 */
export function detectTextLanguage(text: string): string | null {
  const scripts = [
    { count: countMatches({ text, pattern: LATIN }), getLanguage: () => detectLatinLanguage(text) },
    { count: countMatches({ text, pattern: CYRILLIC }), getLanguage: () => detectCyrillicLanguage(text) },
    { count: countMatches({ text, pattern: ARABIC }), getLanguage: () => detectArabicLanguage(text) },
    {
      count: countMatches({ text, pattern: HAN }) + countMatches({ text, pattern: KANA }),
      getLanguage: () => detectHanLanguage(text),
    },
    ...SCRIPT_LANGUAGES.map(({ pattern, language }) => ({
      count: countMatches({ text, pattern }),
      getLanguage: () => language,
    })),
  ];
  const dominantScript = scripts.reduce((best, script) => (script.count > best.count ? script : best));

  if (dominantScript.count < MIN_LETTERS) return null;

  const language = dominantScript.getLanguage();

  return language;
}

function countMatches(props: { text: string; pattern: RegExp }): number {
  const { text, pattern } = props;

  const count = text.match(pattern)?.length ?? 0;

  return count;
}

function detectHanLanguage(text: string): string {
  const kanaCount = countMatches({ text, pattern: KANA });
  const hanCount = countMatches({ text, pattern: HAN });

  return kanaCount >= (kanaCount + hanCount) * MIN_JAPANESE_KANA_SHARE ? 'ja' : 'zh';
}

/**
 * Letters only some of the languages written in Cyrillic have, checked in this order.
 */
const CYRILLIC_LETTER_RULES: ReadonlyArray<{ language: string; letters: RegExp; minShare: number }> = [
  { language: 'kk', letters: /[әғқңөұүһ]/gu, minShare: 0.005 },
  { language: 'sr', letters: /[ђћ]/gu, minShare: 0.001 },
  { language: 'mk', letters: /[ѓќѕ]/gu, minShare: 0.001 },
  { language: 'sr', letters: /[љњџј]/gu, minShare: 0.005 },
  { language: 'be', letters: /ў/gu, minShare: 0.002 },
  { language: 'uk', letters: /[іїєґ]/gu, minShare: 0.01 },
];
const RUSSIAN_ONLY_VOWELS = /[ыэ]/gu;
const HARD_SIGN = /ъ/gu;
const MAX_BULGARIAN_RUSSIAN_VOWEL_SHARE = 0.001;
const MIN_BULGARIAN_HARD_SIGN_SHARE = 0.01;

function detectCyrillicLanguage(text: string): string {
  const lowerCaseText = text.toLowerCase();
  const letterCount = countMatches({ text: lowerCaseText, pattern: CYRILLIC });

  function getShare(pattern: RegExp): number {
    return countMatches({ text: lowerCaseText, pattern }) / letterCount;
  }

  const matchingRule = CYRILLIC_LETTER_RULES.find((rule) => getShare(rule.letters) >= rule.minShare);

  if (matchingRule) return matchingRule.language;

  // Bulgarian uses "ъ" as a vowel and has no "ы" or "э".
  const isBulgarian =
    getShare(RUSSIAN_ONLY_VOWELS) <= MAX_BULGARIAN_RUSSIAN_VOWEL_SHARE &&
    getShare(HARD_SIGN) >= MIN_BULGARIAN_HARD_SIGN_SHARE;

  return isBulgarian ? 'bg' : 'ru';
}

const URDU_LETTERS = /[ٹڈڑںے]/gu;
const PERSIAN_LETTERS = /[پچژگیک]/gu;
const ARABIC_ONLY_LETTERS = /[يكة]/gu;
const MIN_URDU_SHARE = 0.01;

function detectArabicLanguage(text: string): string {
  const letterCount = countMatches({ text, pattern: ARABIC });

  if (countMatches({ text, pattern: URDU_LETTERS }) / letterCount >= MIN_URDU_SHARE) return 'ur';

  const isPersian =
    countMatches({ text, pattern: PERSIAN_LETTERS }) > countMatches({ text, pattern: ARABIC_ONLY_LETTERS });

  return isPersian ? 'fa' : 'ar';
}

/**
 * Frequent words of the most common languages written in Latin letters. A word several languages share counts less
 * for each of them.
 */
const LATIN_STOPWORDS: Readonly<Record<string, string>> = {
  en: "the you and that what this have with your are was for not just don't i'm it's know can there they them be is it to of in we me my he she here all so do get go",
  es: 'que de no el la los las es y en lo un una por para con se me te mi pero qué si eso esto está estoy como bien muy aquí ahora sí todo nada cuando también',
  fr: "je de est pas le la les vous que et il un une à ne ce en tu on pour qui c'est j'ai moi mais ça nous avec dans bien suis tout oui rien",
  de: 'ich die und der nicht das du ist es sie ein eine zu wir was ja mit den auf mir dass hier sich auch aber noch nur mich bin wie habe kann',
  it: 'che non di il la è un una per mi sono ma ti si cosa questo ho lo del con bene perché ci io sei come mio tutto anche qui',
  pt: 'que não de o a e é um uma você eu se do da para com está isso me mas por os em no na muito aqui foi tem estou bem',
  nl: 'de het ik je een niet en dat is van wat we in zijn op te die maar met ze hij dit er voor heb jij hebben kan',
  sv: 'och att det är jag du inte en som på vi har med för den till ett kan vad om så men han här mig dig nu',
  da: 'og at det er jeg du ikke en på vi har med for den til et kan hvad om så men han her mig dig nu af',
  no: 'og at det er jeg du ikke en på vi har med for den til et kan hva om så men han her meg deg nå av',
  pl: 'nie się to w na jest że z co jak do mnie tak ja ale mi by już ty tu czy jestem tylko mam może',
  cs: 'je to se na že v ne si jsem jak co mi by tak ale jsi tady už já ty s za pro jsme máme být',
  ro: 'și de nu că la în să e o pe mai ce un cu eu am ești ai asta este tu ne dar sunt',
  hu: 'a az nem hogy és is egy meg ez de mi van csak már igen ki mit el én te itt jó vagy',
  tr: 'bir ve bu de ne da için mi ben sen çok ama o var şey gibi daha değil evet benim seni misin bana sana neden nasıl şimdi hayır tamam',
  id: 'yang dan tidak aku ini itu di kau ke apa kamu saya ada dengan akan untuk ya dia bisa sudah',
  vi: 'và của là không có một tôi được những này cho với anh em đã người các cái gì',
  fi: 'ja on ei se että en mitä minä sinä olen oli hän mutta kun niin tämä me nyt jos sen',
};

const STOPWORD_LANGUAGES = new Map<string, Array<string>>();
Object.entries(LATIN_STOPWORDS).forEach(([language, words]) => {
  words.split(' ').forEach((word) => {
    const languages = STOPWORD_LANGUAGES.get(word) ?? [];
    languages.push(language);
    STOPWORD_LANGUAGES.set(word, languages);
  });
});

const LATIN_WORD = /[\p{L}']+/gu;
const CURLY_APOSTROPHE = /’/gu;
const MIN_STOPWORD_SCORE = 3;
const MIN_STOPWORD_SHARE = 0.05;
/**
 * How far ahead of the runner-up the most likely language has to be.
 */
const MIN_STOPWORD_LEAD = 1.3;

function detectLatinLanguage(text: string): string | null {
  const words = text.toLowerCase().replace(CURLY_APOSTROPHE, "'").match(LATIN_WORD) ?? [];
  const scores = new Map<string, number>();
  words.forEach((word) => {
    const languages = STOPWORD_LANGUAGES.get(word) ?? [];
    languages.forEach((language) => {
      scores.set(language, (scores.get(language) ?? 0) + 1 / languages.length);
    });
  });

  const [best, runnerUp] = Array.from(scores.entries()).toSorted((a, b) => b[1] - a[1]);
  const isConfident =
    best !== undefined &&
    best[1] >= Math.max(MIN_STOPWORD_SCORE, words.length * MIN_STOPWORD_SHARE) &&
    (runnerUp === undefined || best[1] >= runnerUp[1] * MIN_STOPWORD_LEAD);

  return isConfident ? best[0] : null;
}

/**
 * Every language Whisper knows, by the code the server uses for it.
 */
// prettier-ignore
const LANGUAGE_CODES: ReadonlySet<string> = new Set([
  'en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'ja', 'pt', 'tr', 'pl', 'ca', 'nl', 'ar', 'sv', 'it', 'id', 'hi', 'fi',
  'vi', 'he', 'uk', 'el', 'ms', 'cs', 'ro', 'da', 'hu', 'ta', 'no', 'th', 'ur', 'hr', 'bg', 'lt', 'la', 'mi', 'ml',
  'cy', 'sk', 'te', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn', 'et', 'mk', 'br', 'eu', 'is', 'hy', 'ne', 'mn', 'bs',
  'kk', 'sq', 'sw', 'gl', 'mr', 'pa', 'si', 'km', 'sn', 'yo', 'so', 'af', 'oc', 'ka', 'be', 'tg', 'sd', 'gu', 'am',
  'yi', 'lo', 'uz', 'fo', 'ht', 'ps', 'tk', 'nn', 'mt', 'sa', 'lb', 'my', 'bo', 'tl', 'mg', 'as', 'tt', 'haw', 'ln',
  'ha', 'ba', 'jw', 'su', 'yue',
]);

/**
 * Other codes that subtitles files are tagged with: old and alternative two-letter codes, and three-letter ones.
 */
const LANGUAGE_CODE_ALIASES: Readonly<Record<string, string>> = {
  iw: 'he',
  in: 'id',
  ji: 'yi',
  jv: 'jw',
  nb: 'no',
  eng: 'en',
  heb: 'he',
  spa: 'es',
  fre: 'fr',
  fra: 'fr',
  ger: 'de',
  deu: 'de',
  ita: 'it',
  por: 'pt',
  rus: 'ru',
  ara: 'ar',
  chi: 'zh',
  zho: 'zh',
  jpn: 'ja',
  kor: 'ko',
  dut: 'nl',
  nld: 'nl',
  pol: 'pl',
  tur: 'tr',
  swe: 'sv',
  nor: 'no',
  nob: 'no',
  nno: 'nn',
  dan: 'da',
  fin: 'fi',
  gre: 'el',
  ell: 'el',
  hun: 'hu',
  cze: 'cs',
  ces: 'cs',
  rum: 'ro',
  ron: 'ro',
  ukr: 'uk',
  hin: 'hi',
  tha: 'th',
  vie: 'vi',
  ind: 'id',
  may: 'ms',
  msa: 'ms',
  per: 'fa',
  fas: 'fa',
  bul: 'bg',
  hrv: 'hr',
  srp: 'sr',
  slo: 'sk',
  slk: 'sk',
  slv: 'sl',
  cat: 'ca',
  est: 'et',
  lav: 'lv',
  lit: 'lt',
  ice: 'is',
  isl: 'is',
  ben: 'bn',
  urd: 'ur',
  tam: 'ta',
  tel: 'te',
  mal: 'ml',
  kan: 'kn',
  mar: 'mr',
  geo: 'ka',
  kat: 'ka',
  arm: 'hy',
  hye: 'hy',
  tgl: 'tl',
  fil: 'tl',
  baq: 'eu',
  eus: 'eu',
  glg: 'gl',
  alb: 'sq',
  sqi: 'sq',
  mac: 'mk',
  mkd: 'mk',
  bos: 'bs',
  aze: 'az',
  kaz: 'kk',
  uzb: 'uz',
  swa: 'sw',
  afr: 'af',
  wel: 'cy',
  cym: 'cy',
  bel: 'be',
  nep: 'ne',
  sin: 'si',
  khm: 'km',
  lao: 'lo',
  bur: 'my',
  mya: 'my',
  mon: 'mn',
  amh: 'am',
  yid: 'yi',
};

/**
 * A language tag (`en`, `en-US`, `heb`, `pt_BR`) as one of Whisper's language codes.
 *
 * @returns `null` when it isn't a language Whisper knows.
 */
export function toLanguageCode(tag: string): string | null {
  const [primaryTag = ''] = tag.trim().toLowerCase().split(/[-_]/u);
  const code = LANGUAGE_CODE_ALIASES[primaryTag] ?? primaryTag;

  return LANGUAGE_CODES.has(code) ? code : null;
}

const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  english: 'en',
  hebrew: 'he',
  ivrit: 'he',
  spanish: 'es',
  español: 'es',
  espanol: 'es',
  french: 'fr',
  français: 'fr',
  francais: 'fr',
  german: 'de',
  deutsch: 'de',
  italian: 'it',
  italiano: 'it',
  portuguese: 'pt',
  português: 'pt',
  portugues: 'pt',
  brazilian: 'pt',
  russian: 'ru',
  arabic: 'ar',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  dutch: 'nl',
  polish: 'pl',
  turkish: 'tr',
  swedish: 'sv',
  norwegian: 'no',
  danish: 'da',
  finnish: 'fi',
  greek: 'el',
  hungarian: 'hu',
  czech: 'cs',
  romanian: 'ro',
  ukrainian: 'uk',
  hindi: 'hi',
  thai: 'th',
  vietnamese: 'vi',
  indonesian: 'id',
  malay: 'ms',
  persian: 'fa',
  farsi: 'fa',
  bulgarian: 'bg',
  croatian: 'hr',
  serbian: 'sr',
  slovak: 'sk',
  slovenian: 'sl',
  catalan: 'ca',
  estonian: 'et',
  latvian: 'lv',
  lithuanian: 'lt',
  icelandic: 'is',
  bengali: 'bn',
  urdu: 'ur',
  tamil: 'ta',
  telugu: 'te',
  malayalam: 'ml',
  tagalog: 'tl',
  filipino: 'tl',
};

const FILE_NAME_PARTS = /[\s._()[\]]+/u;
const EXTENSION = /\.[^.]*$/u;
/**
 * Tags that can follow the language in a subtitles file's name, like `movie.en.sdh.srt`. "HI" means hearing
 * impaired there, not Hindi.
 */
const SUBTITLE_FLAGS: ReadonlySet<string> = new Set(['forced', 'sdh', 'cc', 'hi', 'default', 'full']);
const MAX_LANGUAGE_NAME_DISTANCE = 4;

/**
 * The language a subtitles file's name is tagged with: a code at the end (`movie.en.srt`, `movie.heb.forced.srt`)
 * or a language's name near it (`Movie.2019.Hebrew.720p.srt`).
 */
export function getFileNameLanguage(fileName: string): string | null {
  const parts = fileName
    .replace(EXTENSION, '')
    .split(FILE_NAME_PARTS)
    .filter((part) => part !== '');
  const trailingParts = parts.slice(-3).reverse();
  const tagPart = trailingParts.find((part) => !SUBTITLE_FLAGS.has(part.toLowerCase()));
  const taggedLanguage = tagPart ? toLanguageCode(tagPart) : null;

  if (taggedLanguage) return taggedLanguage;

  const namedLanguage = parts
    .slice(-MAX_LANGUAGE_NAME_DISTANCE)
    .flatMap((part) => part.toLowerCase().split('-'))
    .map((word) => LANGUAGE_NAMES[word])
    .findLast((language) => language !== undefined);

  return namedLanguage ?? null;
}
