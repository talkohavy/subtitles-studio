import type { WaveformPeaks } from './computeWaveformPeaks';

/**
 * Media objects can't live in Redux (they aren't serializable), so they are kept here.
 */
export type MediaState = {
  file: File | null;
  /**
   * A `blob:` URL of the file, for the video element.
   */
  objectUrl: string | null;
  /**
   * The extracted 16 kHz mono audio, kept so a transcription can be retried without extracting it again.
   */
  wav: ArrayBuffer | null;
  /**
   * Seconds to add to transcript times to get video times, when the audio starts after the video.
   */
  audioOffsetSec: number;
  waveform: WaveformPeaks | null;
};

const EMPTY_STATE: MediaState = { file: null, objectUrl: null, wav: null, audioOffsetSec: 0, waveform: null };

let state: MediaState = EMPTY_STATE;
const listeners = new Set<() => void>();

function setState(partialState: Partial<MediaState>) {
  state = { ...state, ...partialState };
  listeners.forEach((listener) => listener());
}

export const mediaStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },

  getSnapshot(): MediaState {
    return state;
  },

  setFile(file: File) {
    const objectUrl = URL.createObjectURL(file);

    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);

    setState({ ...EMPTY_STATE, file, objectUrl });
  },

  setAudio(props: { wav: ArrayBuffer; audioOffsetSec: number; waveform: WaveformPeaks | null }) {
    const { wav, audioOffsetSec, waveform } = props;

    setState({ wav, audioOffsetSec, waveform });
  },

  clear() {
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);

    setState(EMPTY_STATE);
  },
};
