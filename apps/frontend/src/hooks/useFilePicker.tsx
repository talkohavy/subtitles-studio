import { useRef } from 'react';

type UseFilePickerProps = {
  /**
   * The `accept` attribute of the file input.
   */
  accept: string;
  onFiles: (files: Array<File>) => void;
  multiple?: boolean;
};

/**
 * A hidden file input to render, and a function that opens the browser's file picker with it.
 */
export function useFilePicker(props: UseFilePickerProps) {
  const { accept, onFiles, multiple } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  function openFilePicker() {
    inputRef.current?.click();
  }

  const fileInput = (
    <input
      ref={inputRef}
      type='file'
      accept={accept}
      multiple={multiple}
      className='hidden'
      onChange={(event) => {
        const files = Array.from(event.currentTarget.files ?? []);
        // So choosing the same file again still triggers a change.
        event.currentTarget.value = '';

        if (files.length > 0) onFiles(files);
      }}
    />
  );

  return { fileInput, openFilePicker };
}
