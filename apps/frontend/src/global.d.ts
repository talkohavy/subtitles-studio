/// <reference types="vite/client" />

// Parts of the File System Access API that TypeScript's DOM library doesn't have yet (Chromium only).

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, Array<string>> }>;
};

interface Window {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
}

interface FileSystemHandle {
  remove?: (options?: { recursive?: boolean }) => Promise<void>;
}

interface Navigator {
  /**
   * Only in Brave.
   */
  brave?: { isBrave: () => Promise<boolean> };
}
