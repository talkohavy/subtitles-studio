import { normalizeWords, type RawWordChunk } from './normalizeWords';

type ChunkProps = {
  text: string;
  start: number;
  end: number | null;
};

function chunk(props: ChunkProps): RawWordChunk {
  const { text, start, end } = props;

  return { text, timestamp: [start, end] };
}

describe('normalizeWords', () => {
  it('should convert window-relative timestamps to absolute ones', () => {
    const chunks = [chunk({ text: ' Hello', start: 0.5, end: 0.9 }), chunk({ text: ' world.', start: 1, end: 1.5 })];

    const actualResult = normalizeWords({ chunks, windowStartSec: 10, windowEndSec: 20, language: 'en' });

    const expectedResult = [
      { text: ' Hello', start: 10.5, end: 10.9 },
      { text: ' world.', start: 11, end: 11.5 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should drop empty words', () => {
    const chunks = [chunk({ text: ' ', start: 0, end: 1 }), chunk({ text: ' Hi', start: 1, end: 1.5 })];

    const actualResult = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 10, language: 'en' });

    const expectedResult = [{ text: ' Hi', start: 1, end: 1.5 }];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should clamp words to the window and drop words far past its end', () => {
    const chunks = [chunk({ text: ' late', start: 9.8, end: 10.6 }), chunk({ text: ' ghost', start: 11, end: 11.5 })];

    const actualResult = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 10, language: 'en' });

    const expectedResult = [{ text: ' late', start: 9.8, end: 10 }];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should stretch a zero-length word up to the next word', () => {
    const chunks = [chunk({ text: ' a', start: 1, end: 1 }), chunk({ text: ' b', start: 1.1, end: 1.5 })];

    const actualResult = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 10, language: 'en' })[0];

    const expectedResult = { text: ' a', start: 1, end: 1.1 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should give a zero-length word before a pause a short duration', () => {
    const chunks = [chunk({ text: ' a', start: 1, end: null }), chunk({ text: ' b', start: 5, end: 5.5 })];

    const actualResult = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 10, language: 'en' })[0];

    const expectedResult = { text: ' a', start: 1, end: 1.3 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep start times in order', () => {
    const chunks = [chunk({ text: ' a', start: 2, end: 2.5 }), chunk({ text: ' b', start: 1.5, end: 3 })];

    const words = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 10, language: 'en' });
    const actualResult = words.map((word) => word.start);

    expect(actualResult).toEqual([2, 2]);
  });

  it('should drop a known hallucination that is all a long window produced', () => {
    const chunks = [chunk({ text: ' Thank', start: 25, end: 25.4 }), chunk({ text: ' you.', start: 25.4, end: 25.8 })];

    const actualResult = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 29, language: 'en' });

    expect(actualResult).toEqual([]);
  });

  it('should keep the same phrase when it fills a short window', () => {
    const chunks = [chunk({ text: ' Thank', start: 0.2, end: 0.5 }), chunk({ text: ' you.', start: 0.5, end: 0.9 })];

    const actualResult = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 1.5, language: 'en' }).length;

    expect(actualResult).toBe(2);
  });

  it('should drop music symbols but keep lyrics', () => {
    const chunks = [
      chunk({ text: ' ♪', start: 0, end: 1 }),
      chunk({ text: ' ♪La', start: 1, end: 1.5 }),
      chunk({ text: ' la', start: 1.5, end: 2 }),
    ];

    const words = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 5, language: 'en' });
    const actualResult = words.map((word) => word.text);

    expect(actualResult).toEqual([' ♪La', ' la']);
  });

  it('should collapse a looping phrase to a single occurrence', () => {
    const loop = [0, 1, 2, 3, 4].flatMap((index) => [
      chunk({ text: ' I', start: index, end: index + 0.4 }),
      chunk({ text: ' know.', start: index + 0.4, end: index + 0.9 }),
    ]);

    const words = normalizeWords({ chunks: loop, windowStartSec: 0, windowEndSec: 10, language: 'en' });
    const actualResult = words.map((word) => word.text).join('');

    expect(actualResult).toBe(' I know.');
  });

  it('should keep up to three repetitions of a single repeated word', () => {
    const chunks = [0, 1, 2, 3, 4, 5].map((index) => chunk({ text: ' no', start: index, end: index + 0.5 }));

    const actualResult = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 10, language: 'en' }).length;

    expect(actualResult).toBe(3);
  });

  it('should split an unspaced Japanese phrase into several words that restore the phrase', () => {
    const chunks = [chunk({ text: ' 今日はいい天気ですね。', start: 0, end: 2 })];

    const words = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 5, language: 'ja' });
    const actualResult = {
      hasSeveralWords: words.length > 1,
      text: words.map((word) => word.text).join(''),
      start: words[0]?.start,
      end: words.at(-1)?.end,
    };

    const expectedResult = { hasSeveralWords: true, text: '今日はいい天気ですね。', start: 0, end: 2 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should attach punctuation that starts a phrase to the word before it', () => {
    const chunks = [
      chunk({ text: 'はい', start: 0, end: 1 }),
      chunk({ text: '。本当に', start: 1, end: 2 }),
      chunk({ text: '、', start: 2, end: 2.1 }),
    ];

    const words = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 5, language: 'ja' });
    const actualResult = words.map((word) => word.text);

    const expectedResult = ['はい。', '本当に、'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should attach an opening quote to the word after it', () => {
    const chunks = [chunk({ text: '彼は「はい」と', start: 0, end: 2 })];

    const words = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 5, language: 'ja' });
    const actualResult = words.some((word) => word.text.startsWith('「') && word.text.endsWith('」'));

    expect(actualResult).toBe(true);
  });

  it('should keep the space before a Latin word in unspaced languages', () => {
    const chunks = [chunk({ text: '新しい', start: 0, end: 0.5 }), chunk({ text: ' iPhone', start: 0.5, end: 1 })];

    const words = normalizeWords({ chunks, windowStartSec: 0, windowEndSec: 5, language: 'ja' });
    const actualResult = words.map((word) => word.text).join('');

    expect(actualResult).toBe('新しい iPhone');
  });
});
