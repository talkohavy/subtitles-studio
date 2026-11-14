import { describe, expect, it } from 'vite-plus/test';
import { formatRulerLabel, getRulerSteps, getStoredZoom, sliderValueToZoom, zoomToSliderValue } from './timelineScale';

describe('getStoredZoom', () => {
  it('should keep the zoom within range, and store a zoom at or near fit as null', () => {
    const range = { fitPxPerSec: 10, maxPxPerSec: 400 };
    const actualResult = [
      getStoredZoom({ ...range, pxPerSec: 50 }),
      getStoredZoom({ ...range, pxPerSec: 1000 }),
      getStoredZoom({ ...range, pxPerSec: 5 }),
      getStoredZoom({ ...range, pxPerSec: 10.005 }),
    ];

    const expectedResult = [50, 400, null, null];
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('getRulerSteps', () => {
  it('should space labeled ticks apart and add small ticks between them', () => {
    const actualResult = [getRulerSteps(100), getRulerSteps(1)];

    const expectedResult = [
      { majorStep: 1, minorStep: 0.2 },
      { majorStep: 120, minorStep: 24 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should leave out small ticks that would be too close together', () => {
    const actualResult = getRulerSteps(0.001);

    const expectedResult = { majorStep: 3600, minorStep: null };
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('formatRulerLabel', () => {
  it('should show tenths only when the steps are shorter than a second', () => {
    const actualResult = [
      formatRulerLabel({ seconds: 65, step: 5 }),
      formatRulerLabel({ seconds: 3720, step: 60 }),
      formatRulerLabel({ seconds: 1.5, step: 0.5 }),
      formatRulerLabel({ seconds: 2, step: 0.2 }),
    ];

    expect(actualResult).toEqual(['1:05', '1:02:00', '0:01.5', '0:02.0']);
  });
});

describe('zoomToSliderValue', () => {
  const range = { fitPxPerSec: 10, maxPxPerSec: 400 };

  it('should map the zoom range to 0–100', () => {
    const actualResult = [
      zoomToSliderValue({ ...range, pxPerSec: 10 }),
      zoomToSliderValue({ ...range, pxPerSec: 400 }),
      zoomToSliderValue({ ...range, pxPerSec: 1000 }),
    ];

    expect(actualResult).toEqual([0, 100, 100]);
  });

  it('should be the inverse of sliderValueToZoom', () => {
    const pxPerSec = sliderValueToZoom({ ...range, value: 50 });

    const actualResult = zoomToSliderValue({ ...range, pxPerSec });

    expect(actualResult).toBeCloseTo(50);
  });

  it('should be 0 when the whole video already fits at the maximum zoom', () => {
    const actualResult = zoomToSliderValue({ fitPxPerSec: 500, maxPxPerSec: 400, pxPerSec: 500 });

    expect(actualResult).toBe(0);
  });
});
