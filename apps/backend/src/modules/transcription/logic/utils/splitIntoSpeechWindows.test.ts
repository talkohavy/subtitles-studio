import { splitIntoSpeechWindows } from './splitIntoSpeechWindows';

const SAMPLE_RATE = 16_000;

function tone(seconds: number): Array<number> {
  return Array.from({ length: Math.round(seconds * SAMPLE_RATE) }, (_, index) => 0.5 * Math.sin(index / 10));
}

function silence(seconds: number): Array<number> {
  return new Array(Math.round(seconds * SAMPLE_RATE)).fill(0);
}

function toSamples(parts: Array<Array<number>>): Float32Array {
  return Float32Array.from(parts.flat());
}

describe('splitIntoSpeechWindows', () => {
  it('should return no windows for silent audio', () => {
    const samples = toSamples([silence(10)]);

    const actualResult = splitIntoSpeechWindows({ samples, sampleRate: SAMPLE_RATE });

    expect(actualResult).toEqual([]);
  });

  it('should return no windows for empty audio', () => {
    const actualResult = splitIntoSpeechWindows({ samples: new Float32Array(0), sampleRate: SAMPLE_RATE });

    expect(actualResult).toEqual([]);
  });

  it('should return one window for short continuous speech', () => {
    const samples = toSamples([tone(5)]);

    const actualResult = splitIntoSpeechWindows({ samples, sampleRate: SAMPLE_RATE });

    const expectedResult = [{ start: 0, end: 5 * SAMPLE_RATE }];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should skip a long silence, keeping some padding around the speech', () => {
    const samples = toSamples([tone(2), silence(6), tone(3)]);

    const actualResult = splitIntoSpeechWindows({ samples, sampleRate: SAMPLE_RATE });

    const expectedResult = [
      { start: 0, end: 2.3 * SAMPLE_RATE },
      { start: 7.7 * SAMPLE_RATE, end: 11 * SAMPLE_RATE },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep a short pause inside the window', () => {
    const samples = toSamples([tone(2), silence(2), tone(2)]);

    const actualResult = splitIntoSpeechWindows({ samples, sampleRate: SAMPLE_RATE });

    const expectedResult = [{ start: 0, end: 6 * SAMPLE_RATE }];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should cut long speech at its pauses into contiguous windows of at most 29.5 seconds', () => {
    const samples = toSamples([tone(20), silence(0.4), tone(24.6), silence(0.4), tone(24.6)]);

    const windows = splitIntoSpeechWindows({ samples, sampleRate: SAMPLE_RATE });
    const actualResult = windows.map((window) => ({
      startSec: window.start / SAMPLE_RATE,
      endSec: window.end / SAMPLE_RATE,
    }));

    const expectedResult = [
      { startSec: 0, endSec: expect.closeTo(20.2, 0) },
      { startSec: expect.closeTo(20.2, 0), endSec: expect.closeTo(45.2, 0) },
      { startSec: expect.closeTo(45.2, 0), endSec: 70 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep every window within the cut pauses', () => {
    const samples = toSamples([tone(20), silence(0.4), tone(24.6), silence(0.4), tone(24.6)]);

    const windows = splitIntoSpeechWindows({ samples, sampleRate: SAMPLE_RATE });
    const [firstCutSec = 0, secondCutSec = 0] = windows.slice(0, -1).map((window) => window.end / SAMPLE_RATE);
    const actualResult = firstCutSec >= 20 && firstCutSec <= 20.4 && secondCutSec >= 45 && secondCutSec <= 45.4;

    expect(actualResult).toBe(true);
  });

  it('should respect a custom maximum window length', () => {
    const samples = toSamples([tone(10)]);

    const windows = splitIntoSpeechWindows({ samples, sampleRate: SAMPLE_RATE, maxWindowSec: 4 });
    const actualResult = windows.every((window) => window.end - window.start <= 4 * SAMPLE_RATE);

    expect(actualResult).toBe(true);
  });
});
