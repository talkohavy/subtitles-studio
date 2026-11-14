import { describe, expect, it } from 'vite-plus/test';
import { applyTranslations, buildTranslationUnits } from './translateCues';
import type { Cue } from './types';

function makeCue(props: { id: string; start: number; end: number; text: string }): Cue {
  const { id, start, end, text } = props;

  const cue = { id, start, end, text, words: [{ text, start, end }] };

  return cue;
}

function toTimedText(cues: ReadonlyArray<Cue>) {
  const timedText = cues.map(({ id, start, end, text }) => ({ id, start, end, text }));

  return timedText;
}

describe('buildTranslationUnits', () => {
  it('should join a sentence that runs across captions into one unit', () => {
    const cues = [
      makeCue({ id: 'a', start: 0, end: 1, text: 'Hey everyone,\nwelcome' }),
      makeCue({ id: 'b', start: 1, end: 2, text: 'back to my channel.' }),
    ];

    const actualResult = buildTranslationUnits({ cues, language: 'en' });

    const expectedResult = [
      {
        text: 'Hey everyone, welcome back to my channel.',
        fragments: [
          { cueIndex: 0, text: 'Hey everyone, welcome' },
          { cueIndex: 1, text: 'back to my channel.' },
        ],
      },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should split a caption that ends one sentence and starts the next', () => {
    const cues = [
      makeCue({ id: 'a', start: 0, end: 1, text: 'I love it. But wait' }),
      makeCue({ id: 'b', start: 1, end: 2, text: 'a second!' }),
    ];

    const units = buildTranslationUnits({ cues, language: 'en' });
    const actualResult = units.map((unit) => unit.text);

    const expectedResult = ['I love it.', 'But wait a second!'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should not end a sentence at a title, an initial, or a period followed by a lowercase word', () => {
    const cues = [makeCue({ id: 'a', start: 0, end: 3, text: 'Mr. Smith and J. Doe left the U.S. last year.' })];

    const units = buildTranslationUnits({ cues, language: 'en' });
    const actualResult = units.map((unit) => unit.text);

    const expectedResult = ['Mr. Smith and J. Doe left the U.S. last year.'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should cut a sentence with no ending punctuation at a long pause', () => {
    const cues = [
      makeCue({ id: 'a', start: 0, end: 1, text: 'so then we' }),
      makeCue({ id: 'b', start: 4, end: 5, text: 'went home' }),
    ];

    const units = buildTranslationUnits({ cues, language: 'en' });
    const actualResult = units.map((unit) => unit.text);

    const expectedResult = ['so then we', 'went home'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should split a long sentence at the clause end nearest its middle', () => {
    const cues = [
      makeCue({ id: 'a', start: 8.6, end: 10.8, text: 'First, I grind the beans fresh,' }),
      makeCue({ id: 'b', start: 10.8, end: 12, text: 'right before brewing,' }),
      makeCue({ id: 'c', start: 12, end: 13, text: 'then I heat the water' }),
      makeCue({ id: 'd', start: 13, end: 14.6, text: 'to about 90 degrees,' }),
      makeCue({ id: 'e', start: 14.6, end: 16.4, text: 'which is just below boiling.' }),
    ];

    const units = buildTranslationUnits({ cues, language: 'en' });
    const actualResult = units.map((unit) => unit.text);

    const expectedResult = [
      'First, I grind the beans fresh, right before brewing,',
      'then I heat the water to about 90 degrees, which is just below boiling.',
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should join the captions of a language written without spaces without adding spaces', () => {
    const cues = [
      makeCue({ id: 'a', start: 0, end: 1, text: '今日は' }),
      makeCue({ id: 'b', start: 1, end: 2, text: 'いい天気です。' }),
    ];

    const units = buildTranslationUnits({ cues, language: 'ja' });
    const actualResult = units.map((unit) => unit.text);

    const expectedResult = ['今日はいい天気です。'];
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('applyTranslations', () => {
  it('should share a translation between the captions its sentence came from', () => {
    const cues = [
      makeCue({ id: 'a', start: 0, end: 1, text: 'Hey everyone, welcome' }),
      makeCue({ id: 'b', start: 1, end: 2, text: 'back to my channel.' }),
    ];
    const units = buildTranslationUnits({ cues, language: 'en' });

    const translatedCues = applyTranslations({
      cues,
      units,
      translations: ['היי כולם, ברוכים הבאים בחזרה לערוץ שלי.'],
      language: 'he',
    });
    const actualResult = toTimedText(translatedCues);

    const expectedResult = [
      { id: 'a', start: 0, end: 1, text: 'היי כולם, ברוכים הבאים' },
      { id: 'b', start: 1, end: 2, text: 'בחזרה לערוץ שלי.' },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should spread the words of a translated caption over its time', () => {
    const cues = [makeCue({ id: 'a', start: 0, end: 1.8, text: 'Hello world.' })];
    const units = buildTranslationUnits({ cues, language: 'en' });

    const [translatedCue] = applyTranslations({ cues, units, translations: ['שלום עולם.'], language: 'he' });
    const actualResult = translatedCue?.words.map((word) => ({
      text: word.text,
      start: Number(word.start.toFixed(2)),
      end: Number(word.end.toFixed(2)),
    }));

    const expectedResult = [
      { text: 'שלום', start: 0, end: 0.8 },
      { text: ' עולם.', start: 0.8, end: 1.8 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should give the time of a caption left without text to the caption before it', () => {
    const cues = [
      makeCue({ id: 'a', start: 0, end: 1, text: 'Thank' }),
      makeCue({ id: 'b', start: 1, end: 2, text: 'you.' }),
    ];
    const units = buildTranslationUnits({ cues, language: 'en' });

    const translatedCues = applyTranslations({ cues, units, translations: ['תודה.'], language: 'he' });
    const actualResult = toTimedText(translatedCues);

    const expectedResult = [{ id: 'a', start: 0, end: 2, text: 'תודה.' }];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should give the time of a caption left without text to the caption after it after a pause', () => {
    const cues = [
      makeCue({ id: 'a', start: 0, end: 1, text: 'Bye.' }),
      makeCue({ id: 'b', start: 3, end: 3.5, text: 'I' }),
      makeCue({ id: 'c', start: 3.5, end: 5, text: 'really mean it.' }),
    ];
    const units = buildTranslationUnits({ cues, language: 'en' });

    const translatedCues = applyTranslations({ cues, units, translations: ['להתראות.', 'באמת.'], language: 'he' });
    const actualResult = toTimedText(translatedCues);

    const expectedResult = [
      { id: 'a', start: 0, end: 1, text: 'להתראות.' },
      { id: 'c', start: 3, end: 5, text: 'באמת.' },
    ];
    expect(actualResult).toEqual(expectedResult);
  });
});
