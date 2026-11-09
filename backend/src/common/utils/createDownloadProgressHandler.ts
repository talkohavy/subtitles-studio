import type { ProgressInfo } from '@huggingface/transformers';
import type { ModelDownloadProgress } from '../types';

type CreateDownloadProgressHandlerProps = {
  /**
   * Reported as the total until the real one is larger: transformers.js only learns a file's size once its
   * download starts.
   */
  approximateTotalBytes: number;
  onDownloadProgress: (progress: ModelDownloadProgress) => void;
};

const DOWNLOAD_PROGRESS_INTERVAL_MS = 250;

/**
 * Turns transformers.js' loading events into download progress, at most every 250ms. Models that are already on
 * disk report nothing.
 */
export function createDownloadProgressHandler(
  props: CreateDownloadProgressHandlerProps,
): (progressInfo: ProgressInfo) => void {
  const { approximateTotalBytes, onDownloadProgress } = props;

  let isDownloading = false;
  let lastReportTime = 0;

  return function handleProgress(progressInfo: ProgressInfo) {
    if (progressInfo.status === 'download') isDownloading = true;

    if (progressInfo.status !== 'progress_total' || !isDownloading) return;

    const now = Date.now();
    const isDone = progressInfo.loaded >= progressInfo.total;

    if (!isDone && now - lastReportTime < DOWNLOAD_PROGRESS_INTERVAL_MS) return;

    lastReportTime = now;
    onDownloadProgress({
      loadedBytes: progressInfo.loaded,
      totalBytes: Math.max(progressInfo.total, approximateTotalBytes),
    });
  };
}
