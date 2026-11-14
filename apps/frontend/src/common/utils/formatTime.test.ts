import { describe, expect, it } from 'vite-plus/test';
import { formatTime, formatTimestamp, parseTime } from './formatTime';

describe('formatTime', () => {
  it('should show minutes, seconds and tenths', () => {
    const actualResult = [formatTime(1.5), formatTime(83.24), formatTime(0)];

    expect(actualResult).toEqual(['0:01.5', '1:23.2', '0:00.0']);
  });

  it('should show hours for long videos', () => {
    const actualResult = formatTime(3723.4);

    expect(actualResult).toBe('1:02:03.4');
  });

  it('should carry a rounded-up tenth into the minutes', () => {
    const actualResult = formatTime(59.96);

    expect(actualResult).toBe('1:00.0');
  });

  it('should show negative times as zero', () => {
    const actualResult = formatTime(-3);

    expect(actualResult).toBe('0:00.0');
  });
});

describe('formatTimestamp', () => {
  it('should format a subtitle-file timestamp with the given separator', () => {
    const actualResult = [
      formatTimestamp({ seconds: 3723.4567, millisecondsSeparator: ',' }),
      formatTimestamp({ seconds: 0.5, millisecondsSeparator: '.' }),
    ];

    expect(actualResult).toEqual(['01:02:03,457', '00:00:00.500']);
  });
});

describe('parseTime', () => {
  it('should parse seconds, minutes and hours', () => {
    const actualResult = ['83.5', '1:23.5', '1:01:23.5', '1,5', ' 7 '].map(parseTime);

    expect(actualResult).toEqual([83.5, 83.5, 3683.5, 1.5, 7]);
  });

  it('should reject what isn’t a time', () => {
    const actualResult = ['abc', '1:2:3:4', '', '-5', '1:'].map(parseTime);

    expect(actualResult).toEqual([null, null, null, null, null]);
  });
});
