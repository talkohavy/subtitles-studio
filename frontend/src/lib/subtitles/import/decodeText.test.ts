import { describe, expect, it } from 'vite-plus/test';
import { decodeText } from './decodeText';

/**
 * Text in a single-byte code page, built by reading every byte with it.
 */
function encodeLegacy(props: { text: string; encoding: string }): Uint8Array {
  const { text, encoding } = props;

  const decoder = new TextDecoder(encoding);
  const bytesByCharacter = new Map<string, number>();
  Array.from({ length: 256 }, (_, byte) => byte).forEach((byte) => {
    bytesByCharacter.set(decoder.decode(new Uint8Array([byte])), byte);
  });
  const bytes = Uint8Array.from(Array.from(text), (character) => bytesByCharacter.get(character) ?? 0x3f);

  return bytes;
}

function toSubRip(lines: ReadonlyArray<string>): string {
  const blocks = lines.map((line, index) => `${index + 1}\r\n00:00:0${index},000 --> 00:00:0${index},900\r\n${line}`);

  return `${blocks.join('\r\n\r\n')}\r\n`;
}

const LEGACY_SAMPLES: ReadonlyArray<{ encoding: string; lines: Array<string> }> = [
  { encoding: 'windows-1255', lines: ['שלום, מה שלומך היום?', 'אני בסדר גמור, תודה רבה.', 'בוא נלך הביתה.'] },
  { encoding: 'windows-1251', lines: ['Привет, как дела?', 'Всё хорошо, спасибо.', 'Что ты делаешь сегодня вечером?'] },
  { encoding: 'windows-1256', lines: ['مرحبا، كيف حالك اليوم؟', 'أنا بخير، شكرا جزيلا.', 'هيا نذهب إلى البيت.'] },
  { encoding: 'windows-1253', lines: ['Γεια σου, τι κάνεις σήμερα;', 'Είμαι καλά, ευχαριστώ πολύ.', 'Πάμε σπίτι.'] },
  { encoding: 'windows-1252', lines: ['Bonjour, ça va très bien.', 'Où est la bibliothèque ?', 'Je préfère le café.'] },
  {
    encoding: 'windows-1254',
    lines: [
      'Merhaba, nasılsın?',
      'Ben iyiyim, teşekkür ederim. Sen?',
      'Bu çok güzel bir gün, değil mi?',
      'Şimdi eve gidelim.',
    ],
  },
  {
    encoding: 'windows-1250',
    lines: [
      'Dzień dobry, jak się masz?',
      'Wszystko w porządku, dziękuję.',
      'Nie wiem, co mam teraz zrobić.',
      'To jest ważne.',
    ],
  },
];

describe('decodeText', () => {
  it('should read UTF-8 text as it is', () => {
    const bytes = new TextEncoder().encode('שלום, “world” 👋');

    const actualResult = decodeText({ bytes });

    const expectedResult = { text: 'שלום, “world” 👋', encoding: 'utf-8', isGuessed: false };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should read UTF-16 text, with or without a byte order mark', () => {
    const utf16Bytes = Array.from('Hi!').flatMap((character) => [character.charCodeAt(0), 0]);
    const withBom = new Uint8Array([0xff, 0xfe, ...utf16Bytes]);
    const withoutBom = new Uint8Array([...utf16Bytes, ...utf16Bytes]);

    const actualResult = [decodeText({ bytes: withBom }), decodeText({ bytes: withoutBom })];

    const expectedResult = [
      { text: 'Hi!', encoding: 'utf-16le', isGuessed: false },
      { text: 'Hi!Hi!', encoding: 'utf-16le', isGuessed: false },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should drop UTF-8’s byte order mark', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('WEBVTT')]);

    const actualResult = decodeText({ bytes }).text;

    expect(actualResult).toBe('WEBVTT');
  });

  it('should recognize the code page of older subtitles files by how their text reads', () => {
    const actualResult = LEGACY_SAMPLES.map(({ encoding, lines }) => {
      const text = toSubRip(lines);
      const decodedText = decodeText({ bytes: encodeLegacy({ text, encoding }) });

      return { encoding: decodedText.encoding, isGuessed: decodedText.isGuessed, isIntact: decodedText.text === text };
    });

    const expectedResult = LEGACY_SAMPLES.map(({ encoding }) => ({ encoding, isGuessed: true, isIntact: true }));
    expect(actualResult).toEqual(expectedResult);
  });

  it('should read with the encoding it’s given', () => {
    const bytes = encodeLegacy({ text: 'שלום', encoding: 'windows-1255' });

    const actualResult = decodeText({ bytes, encoding: 'windows-1251' });

    const expectedResult = { text: 'щмен', encoding: 'windows-1251', isGuessed: false };
    expect(actualResult).toEqual(expectedResult);
  });
});
