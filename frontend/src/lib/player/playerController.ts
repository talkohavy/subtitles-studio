export type PlayerState = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  /**
   * A frame of the video can be drawn.
   */
  hasFrame: boolean;
};

const INITIAL_STATE: PlayerState = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackRate: 1,
  volume: 1,
  isMuted: false,
  hasFrame: false,
};

/**
 * Wraps the preview's `<video>` element. Time changes many times a second, so it is kept out of Redux and
 * read through `useSyncExternalStore` (see `usePlayerState`).
 */
class PlayerController {
  private video: HTMLVideoElement | null = null;
  private state: PlayerState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();
  private readonly frameListeners = new Set<() => void>();
  private animationFrameId: number | null = null;
  private removeVideoListeners: (() => void) | null = null;

  attach(video: HTMLVideoElement) {
    this.detach();
    this.video = video;
    video.playbackRate = this.state.playbackRate;
    video.volume = this.state.volume;
    video.muted = this.state.isMuted;

    const handlers: Record<string, () => void> = {
      loadedmetadata: () => this.syncFromVideo(),
      durationchange: () => this.syncFromVideo(),
      loadeddata: () => {
        this.setState({ hasFrame: true });
        this.notifyFrame();
      },
      play: () => {
        this.setState({ isPlaying: true });
        this.startLoop();
      },
      pause: () => this.handleStop(),
      ended: () => this.handleStop(),
      seeked: () => {
        this.syncFromVideo();
        this.notifyFrame();
      },
      timeupdate: () => {
        if (!this.state.isPlaying) this.syncFromVideo();
      },
      emptied: () =>
        this.setState({ ...INITIAL_STATE, playbackRate: this.state.playbackRate, volume: this.state.volume }),
    };

    Object.entries(handlers).forEach(([eventType, handler]) => video.addEventListener(eventType, handler));

    this.removeVideoListeners = () => {
      Object.entries(handlers).forEach(([eventType, handler]) => video.removeEventListener(eventType, handler));
    };

    this.syncFromVideo();
  }

  detach() {
    this.stopLoop();
    this.removeVideoListeners?.();
    this.removeVideoListeners = null;
    this.video = null;
    this.setState({ currentTime: 0, duration: 0, isPlaying: false, hasFrame: false });
  }

  getVideo(): HTMLVideoElement | null {
    return this.video;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  /**
   * Called whenever the video shows a different frame: on every animation frame while playing, and after seeking.
   */
  subscribeToFrames(listener: () => void): () => void {
    this.frameListeners.add(listener);

    return () => this.frameListeners.delete(listener);
  }

  getSnapshot(): PlayerState {
    return this.state;
  }

  async play(): Promise<void> {
    const { video } = this;

    if (!video) return;

    if (video.ended || video.currentTime >= video.duration - 0.05) video.currentTime = 0;

    try {
      await video.play();
    } catch {
      // Interrupted by a pause or a new source.
    }
  }

  pause() {
    this.video?.pause();
  }

  async togglePlay(): Promise<void> {
    if (this.state.isPlaying) {
      this.pause();
      return;
    }

    await this.play();
  }

  seek(time: number) {
    const { video } = this;

    if (!video) return;

    const duration = Number.isFinite(video.duration) ? video.duration : this.state.duration;
    const clampedTime = Math.min(Math.max(0, time), duration || 0);
    video.currentTime = clampedTime;
    this.setState({ currentTime: clampedTime });
  }

  seekBy(seconds: number) {
    this.seek(this.getCurrentTime() + seconds);
  }

  /**
   * The precise current time (the state is only refreshed once per animation frame).
   */
  getCurrentTime(): number {
    return this.video?.currentTime ?? this.state.currentTime;
  }

  setPlaybackRate(playbackRate: number) {
    if (this.video) this.video.playbackRate = playbackRate;

    this.setState({ playbackRate });
  }

  setVolume(volume: number) {
    const isMuted = volume === 0;

    if (this.video) {
      this.video.volume = volume;
      this.video.muted = isMuted;
    }

    this.setState({ volume, isMuted });
  }

  toggleMute() {
    const isMuted = !this.state.isMuted;
    const volume = !isMuted && this.state.volume === 0 ? 1 : this.state.volume;

    if (this.video) {
      this.video.muted = isMuted;
      this.video.volume = volume;
    }

    this.setState({ isMuted, volume });
  }

  private handleStop() {
    this.stopLoop();
    this.setState({ isPlaying: false });
    this.syncFromVideo();
    this.notifyFrame();
  }

  private syncFromVideo() {
    const { video } = this;

    if (!video) return;

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    this.setState({ currentTime: video.currentTime, duration });
  }

  private startLoop() {
    if (this.animationFrameId !== null) return;

    const tick = () => {
      this.syncFromVideo();
      this.notifyFrame();
      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  private stopLoop() {
    if (this.animationFrameId === null) return;

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  private notifyFrame() {
    this.frameListeners.forEach((listener) => listener());
  }

  private setState(partialState: Partial<PlayerState>) {
    const entries = Object.entries(partialState) as Array<[keyof PlayerState, PlayerState[keyof PlayerState]]>;
    const hasChanges = entries.some(([key, value]) => this.state[key] !== value);

    if (!hasChanges) return;

    this.state = { ...this.state, ...partialState };
    this.listeners.forEach((listener) => listener());
  }
}

export const player = new PlayerController();

export function subscribeToPlayer(listener: () => void): () => void {
  return player.subscribe(listener);
}

export function getPlayerSnapshot(): PlayerState {
  return player.getSnapshot();
}
