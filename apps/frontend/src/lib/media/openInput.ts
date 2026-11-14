import { ALL_FORMATS, BlobSource, Input } from 'mediabunny';

export function openInput(file: Blob): Input {
  const source = new BlobSource(file);

  return new Input({ source, formats: ALL_FORMATS });
}
