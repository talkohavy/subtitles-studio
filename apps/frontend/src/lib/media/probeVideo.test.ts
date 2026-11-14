import { describe, expect, it, vi } from 'vite-plus/test';
import { openInput } from './openInput';
import { probeVideo } from './probeVideo';

vi.mock('./openInput', () => ({
  openInput: vi.fn(() => ({
    getPrimaryVideoTrack: async () => ({ getDisplayWidth: async () => 1280, getDisplayHeight: async () => 720 }),
    getPrimaryAudioTrack: async () => ({}),
    computeDuration: async () => 12.5,
    dispose: () => {},
  })),
}));

describe('probeVideo', () => {
  it('should read each file only once', async () => {
    const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' });

    const firstProbe = await probeVideo(file);
    const secondProbe = await probeVideo(file);
    const actualResult = { firstProbe, secondProbe, readCount: vi.mocked(openInput).mock.calls.length };

    const videoInfo = { width: 1280, height: 720, durationSec: 12.5, hasAudio: true };
    const expectedResult = { firstProbe: videoInfo, secondProbe: videoInfo, readCount: 1 };
    expect(actualResult).toEqual(expectedResult);
  });
});
