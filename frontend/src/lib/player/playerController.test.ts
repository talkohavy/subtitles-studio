import { afterEach, describe, expect, it } from 'vite-plus/test';
import { player } from './playerController';

describe('player', () => {
  afterEach(() => {
    player.detach();
  });

  it('should stay muted when a new video loads', () => {
    const video = document.createElement('video');
    player.attach(video);
    player.toggleMute();

    video.dispatchEvent(new Event('emptied'));
    const actualResult = { isMuted: player.getSnapshot().isMuted, isVideoMuted: video.muted };

    const expectedResult = { isMuted: true, isVideoMuted: true };
    expect(actualResult).toEqual(expectedResult);
  });
});
