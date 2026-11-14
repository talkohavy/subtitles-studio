import { describe, expect, it } from 'vite-plus/test';
import { computeOutputSize, fitRect, getStyleScale } from './geometry';
import { AspectRatios } from './types';

describe('fitRect', () => {
  it('should contain the source in the frame, centered', () => {
    const actualResult = fitRect({
      sourceWidth: 100,
      sourceHeight: 50,
      frameWidth: 50,
      frameHeight: 50,
      fit: 'contain',
    });

    const expectedResult = { x: 0, y: 12.5, width: 50, height: 25 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should cover the frame with the source, centered', () => {
    const actualResult = fitRect({ sourceWidth: 100, sourceHeight: 50, frameWidth: 50, frameHeight: 50, fit: 'cover' });

    const expectedResult = { x: -25, y: 0, width: 100, height: 50 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should fill the frame when the source has no size', () => {
    const actualResult = fitRect({ sourceWidth: 0, sourceHeight: 0, frameWidth: 50, frameHeight: 40, fit: 'contain' });

    const expectedResult = { x: 0, y: 0, width: 50, height: 40 };
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('computeOutputSize', () => {
  it('should keep the source size, rounded to even numbers', () => {
    const actualResult = computeOutputSize({
      sourceWidth: 1279,
      sourceHeight: 719,
      aspectRatio: AspectRatios.Original,
    });

    const expectedResult = { width: 1280, height: 720 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should reframe to the aspect ratio with the source’s pixel count', () => {
    const actualResult = computeOutputSize({
      sourceWidth: 1280,
      sourceHeight: 720,
      aspectRatio: AspectRatios.Portrait,
    });

    const expectedResult = { width: 720, height: 1280 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should reframe large videos to at most Full HD', () => {
    const actualResult = computeOutputSize({ sourceWidth: 3840, sourceHeight: 2160, aspectRatio: AspectRatios.Square });

    const expectedResult = { width: 1440, height: 1440 };
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('getStyleScale', () => {
  it('should scale styles by the frame’s shorter side against 1080 pixels', () => {
    const actualResult = [
      getStyleScale({ frameWidth: 1920, frameHeight: 1080 }),
      getStyleScale({ frameWidth: 540, frameHeight: 960 }),
    ];

    expect(actualResult).toEqual([1, 0.5]);
  });
});
