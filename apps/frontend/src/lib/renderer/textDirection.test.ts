import { describe, expect, it } from 'vite-plus/test';
import { getTextDirection, TextDirections } from './textDirection';

describe('getTextDirection', () => {
  it('should be right-to-left for Hebrew and Arabic', () => {
    const actualResult = [getTextDirection('שלום לכולם'), getTextDirection('مرحبا')];

    expect(actualResult).toEqual([TextDirections.Rtl, TextDirections.Rtl]);
  });

  it('should be left-to-right for Latin and Japanese', () => {
    const actualResult = [getTextDirection('Hello'), getTextDirection('こんにちは')];

    expect(actualResult).toEqual([TextDirections.Ltr, TextDirections.Ltr]);
  });

  it('should follow the first letter, skipping digits and punctuation', () => {
    const actualResult = getTextDirection('2024: שנה טובה');

    expect(actualResult).toBe(TextDirections.Rtl);
  });

  it('should be neutral without letters', () => {
    const actualResult = getTextDirection('123 !?');

    expect(actualResult).toBe(TextDirections.Neutral);
  });
});
