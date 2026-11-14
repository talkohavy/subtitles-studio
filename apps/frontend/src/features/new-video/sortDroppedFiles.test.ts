import { describe, expect, it } from 'vite-plus/test';
import { sortDroppedFiles } from './sortDroppedFiles';

describe('sortDroppedFiles', () => {
  it('should pick out the video, the subtitles file, and a file that’s neither', () => {
    const notes = new File([''], 'notes.txt', { type: 'text/plain' });
    const subtitles = new File([''], 'clip.en.vtt', { type: 'text/vtt' });
    const video = new File([''], 'clip.mkv');

    const sortedFiles = sortDroppedFiles([notes, subtitles, video]);
    const actualResult = {
      videoFile: sortedFiles.videoFile?.name,
      subtitlesFile: sortedFiles.subtitlesFile?.name,
      otherFile: sortedFiles.otherFile?.name,
    };

    const expectedResult = { videoFile: 'clip.mkv', subtitlesFile: 'clip.en.vtt', otherFile: 'notes.txt' };
    expect(actualResult).toEqual(expectedResult);
  });
});
