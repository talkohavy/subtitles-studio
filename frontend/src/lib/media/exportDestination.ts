import { BufferTarget, StreamTarget, type StreamTargetChunk, type Target } from 'mediabunny';
import { MediaError } from './media-error';

/**
 * Mediabunny's in-memory buffer stops growing at 4 GiB; stopping a bit before that leaves room for the end of the file.
 */
const MAX_IN_MEMORY_BYTES = 2 ** 32 - 2 ** 28;

export type ExportResult =
  | { type: 'download'; blob: Blob }
  | {
      type: 'file';
      /**
       * The name the user saved it under.
       */
      fileName: string;
      size: number;
    };

/**
 * Where an export writes the video.
 */
export type ExportDestination = {
  target: Target;
  /**
   * How large the video can get, or `null` for no limit.
   */
  maxBytes: number | null;
  /**
   * Completes the video, once the export succeeded.
   */
  finish: () => Promise<ExportResult>;
  /**
   * Throws away what was written, when the export failed or was canceled.
   */
  discard: () => Promise<void>;
};

export const BRAVE_FILE_SAVING_FLAG = 'brave://flags/#file-system-access-api';

/**
 * Brave can save straight to a file like Chrome, but only once the user turns on a flag.
 */
export const IS_BRAVE_WITHOUT_FILE_SAVING = navigator.brave !== undefined && window.showSaveFilePicker === undefined;

/**
 * A file the user picks, when the browser can save straight to one (which keeps memory use flat however long the
 * video is), otherwise memory. Must be called right from a click, since the file picker only opens then.
 *
 * @throws an `AbortError` when the user closes the file picker.
 */
export async function openExportDestination(props: { suggestedName: string }): Promise<ExportDestination> {
  const { suggestedName } = props;

  if (!window.showSaveFilePicker) return createMemoryDestination();

  const fileHandle = await window.showSaveFilePicker({
    suggestedName,
    types: [{ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } }],
  });
  const destination = await createFileDestination(fileHandle);

  return destination;
}

/**
 * Builds the video in memory, to be downloaded at the end.
 */
export function createMemoryDestination(): ExportDestination {
  const target = new BufferTarget();

  return {
    target,
    maxBytes: MAX_IN_MEMORY_BYTES,
    async finish() {
      if (!target.buffer) throw new MediaError('The export didn’t produce a video.');

      return { type: 'download', blob: new Blob([target.buffer], { type: 'video/mp4' }) };
    },
    async discard() {},
  };
}

/**
 * Writes the video straight into a file the user picked.
 */
export async function createFileDestination(fileHandle: FileSystemFileHandle): Promise<ExportDestination> {
  const fileStream = await fileHandle.createWritable();
  let size = 0;

  // Mediabunny closes its stream when canceled too, and closing a file stream saves what was written so far. So
  // closing is left to `finish`.
  const writable = new WritableStream<StreamTargetChunk>({
    write(chunk) {
      size = Math.max(size, chunk.position + chunk.data.byteLength);

      return fileStream.write(chunk);
    },
  });

  return {
    target: new StreamTarget(writable, { chunked: true }),
    maxBytes: null,
    async finish() {
      await fileStream.close();

      return { type: 'file', fileName: fileHandle.name, size };
    },
    async discard() {
      await fileStream.abort().catch(() => {});
      // The picker already created the (empty) file.
      await fileHandle.remove?.().catch(() => {});
    },
  };
}
