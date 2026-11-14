import { describe, expect, it } from 'vite-plus/test';
import { isVideoFile } from './isVideoFile';

describe('isVideoFile', () => {
  it('should accept files with a video type', () => {
    const actualResult = isVideoFile({ name: 'clip', type: 'video/mp4' });

    expect(actualResult).toBe(true);
  });

  it('should accept video extensions when the type is missing', () => {
    const actualResult = isVideoFile({ name: 'Holiday.MKV', type: '' });

    expect(actualResult).toBe(true);
  });

  it('should reject other files', () => {
    const actualResult = [
      isVideoFile({ name: 'song.mp3', type: 'audio/mpeg' }),
      isVideoFile({ name: 'notes.txt', type: '' }),
    ];

    expect(actualResult).toEqual([false, false]);
  });
});
