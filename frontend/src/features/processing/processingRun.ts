export type ProcessingRun = {
  controller: AbortController;
  /**
   * Cancels the server-side job working for this run, while there is one.
   */
  cancelServerJob: (() => void) | null;
};

let activeRun: ProcessingRun | null = null;

/**
 * Starts a run, stopping the one before it, since only one video or translation is processed at a time.
 */
export function startRun(): ProcessingRun {
  stopActiveRun();

  const run: ProcessingRun = { controller: new AbortController(), cancelServerJob: null };
  activeRun = run;

  return run;
}

export function stopActiveRun() {
  if (!activeRun) return;

  activeRun.controller.abort(new DOMException('Canceled', 'AbortError'));
  activeRun.cancelServerJob?.();
  activeRun = null;
}

export function finishRun(run: ProcessingRun) {
  run.cancelServerJob = null;

  if (activeRun === run) activeRun = null;
}
