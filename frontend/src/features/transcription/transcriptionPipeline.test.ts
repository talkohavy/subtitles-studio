import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { extractAudio } from '@src/lib/media/extractAudio';
import { mediaStore } from '@src/lib/media/mediaStore';
import { createAppStore } from '../../store';
import { cueDeleted, projectLoaded } from '../../store/slices/project.slice';
import { SessionPhases, sessionReady } from '../../store/slices/session.slice';
import { cancelProcessing, retranscribe } from './transcriptionPipeline';
import type { Cue } from '@src/lib/subtitles/types';

vi.mock('@src/lib/media/extractAudio', async (importOriginal) => {
  const original = await importOriginal<typeof import('@src/lib/media/extractAudio')>();

  return { ...original, extractAudio: vi.fn() };
});

const extractAudioMock = vi.mocked(extractAudio);

function makeCue(props: { id: string; start: number }): Cue {
  const { id, start } = props;

  return { id, start, end: start + 1, text: id, words: [{ text: id, start, end: start + 1 }] };
}

const CUES = ['a', 'b', 'c'].map((id, index) => makeCue({ id, start: index * 2 }));

/**
 * A video opened with a subtitles file, edited once, whose audio wasn't extracted yet.
 */
function createStoreWithImportedSubtitles() {
  const store = createAppStore();
  mediaStore.setFile(new File(['video'], 'clip.mp4', { type: 'video/mp4' }));
  store.dispatch(projectLoaded({ cues: CUES, language: 'en' }));
  store.dispatch(cueDeleted({ cueId: 'a' }));
  store.dispatch(sessionReady());

  return store;
}

function getProjectSummary(store: ReturnType<typeof createAppStore>) {
  const { project, session } = store.getState();

  return {
    cueIds: project.present.cues.map((cue) => cue.id),
    pastLength: project.past.length,
    phase: session.phase,
  };
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:clip');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  mediaStore.clear();
  extractAudioMock.mockReset();
});

describe('retranscribe', () => {
  it('should extract the audio while keeping the subtitles, and keep them when canceled', async () => {
    extractAudioMock.mockImplementation(
      ({ signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
    );
    const store = createStoreWithImportedSubtitles();

    const retranscribing = store.dispatch(retranscribe({ language: 'auto', modelId: null }));
    const phaseWhileExtracting = store.getState().session.phase;
    store.dispatch(cancelProcessing());
    await retranscribing;
    const actualResult = { phaseWhileExtracting, ...getProjectSummary(store) };

    const expectedResult = {
      phaseWhileExtracting: SessionPhases.ExtractingAudio,
      cueIds: ['b', 'c'],
      pastLength: 1,
      phase: SessionPhases.Ready,
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep the subtitles when the audio can’t be extracted', async () => {
    extractAudioMock.mockRejectedValue(new Error('No decoder'));
    const store = createStoreWithImportedSubtitles();

    await store.dispatch(retranscribe({ language: 'auto', modelId: null }));
    const actualResult = getProjectSummary(store);

    const expectedResult = { cueIds: ['b', 'c'], pastLength: 1, phase: SessionPhases.Failed };
    expect(actualResult).toEqual(expectedResult);
  });
});
