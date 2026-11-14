import { SessionPhases } from './slices/session.slice';
import type { RootState } from './index';

export function selectCues(state: RootState) {
  return state.project.present.cues;
}

export function selectStyle(state: RootState) {
  return state.project.present.style;
}

export function selectCanvasSettings(state: RootState) {
  return state.project.present.canvas;
}

export function selectLanguage(state: RootState) {
  return state.project.present.language;
}

/**
 * Not while processing: it would bring back subtitles that the processing then overwrites.
 */
export function selectCanUndo(state: RootState) {
  return selectIsEditable(state) && state.project.past.length > 0;
}

export function selectCanRedo(state: RootState) {
  return selectIsEditable(state) && state.project.future.length > 0;
}

export function selectSession(state: RootState) {
  return state.session;
}

export function selectVideoInfo(state: RootState) {
  return state.session.video;
}

export function selectMediaDuration(state: RootState) {
  return state.session.video?.durationSec ?? 0;
}

export function selectHasProject(state: RootState) {
  return state.session.phase !== SessionPhases.Idle;
}

export function selectIsEditable(state: RootState) {
  return state.session.phase === SessionPhases.Ready;
}

export function selectIsProcessing(state: RootState) {
  const { phase } = state.session;

  return phase !== SessionPhases.Idle && phase !== SessionPhases.Ready && phase !== SessionPhases.Failed;
}

export function selectSelectedCueId(state: RootState) {
  return state.ui.selectedCueId;
}

export function selectSettings(state: RootState) {
  return state.settings;
}
