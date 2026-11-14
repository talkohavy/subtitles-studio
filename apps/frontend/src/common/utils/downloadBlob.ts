type DownloadBlobProps = {
  blob: Blob;
  fileName: string;
};

export function downloadBlob(props: DownloadBlobProps) {
  const { blob, fileName } = props;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * `my.video.mp4` → `my.video`
 */
export function getBaseFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');

  return lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
}
