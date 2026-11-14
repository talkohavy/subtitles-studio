import { describe, expect, it } from 'vite-plus/test';
import { formatCount } from './formatCount';

describe('formatCount', () => {
  it('should add an "s" for more than one, and use the irregular plural when given', () => {
    const actualResult = [
      formatCount({ count: 1, noun: 'subtitle' }),
      formatCount({ count: 1204, noun: 'subtitle' }),
      formatCount({ count: 1, noun: 'match', plural: 'matches' }),
      formatCount({ count: 0, noun: 'match', plural: 'matches' }),
    ];

    const expectedResult = ['1 subtitle', '1,204 subtitles', '1 match', '0 matches'];
    expect(actualResult).toEqual(expectedResult);
  });
});
