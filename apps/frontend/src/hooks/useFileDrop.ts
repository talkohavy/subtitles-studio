import { useState, type DragEvent } from 'react';

type UseFileDropProps = {
  onFiles: (files: Array<File>) => void;
};

/**
 * Drag-and-drop handlers for an element that takes files, and whether files are dragged over it.
 */
export function useFileDrop(props: UseFileDropProps) {
  const { onFiles } = props;

  const [isDragOver, setIsDragOver] = useState(false);

  function onDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();

    setIsDragOver(true);
  }

  function onDragLeave(event: DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragOver(false);
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    // The window-wide drop handler would take the files a second time.
    event.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);

    if (files.length > 0) onFiles(files);
  }

  const dropHandlers = { onDragOver, onDragLeave, onDrop };

  return { isDragOver, dropHandlers };
}
