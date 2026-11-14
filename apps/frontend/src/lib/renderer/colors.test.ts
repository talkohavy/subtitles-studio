import { describe, expect, it } from 'vite-plus/test';
import { hexToRgba } from './colors';

describe('hexToRgba', () => {
  it('should convert 6-digit and 3-digit hex colors', () => {
    const actualResult = [hexToRgba({ hex: '#7c3aed', alpha: 0.5 }), hexToRgba({ hex: '#fff', alpha: 1 })];

    expect(actualResult).toEqual(['rgba(124, 58, 237, 0.5)', 'rgba(255, 255, 255, 1)']);
  });

  it('should fall back to black for an invalid color', () => {
    const actualResult = hexToRgba({ hex: 'nope', alpha: 0.3 });

    expect(actualResult).toBe('rgba(0, 0, 0, 0.3)');
  });
});
