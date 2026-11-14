type SleepProps = {
  ms: number;
  signal?: AbortSignal;
};

/**
 * Resolves after `ms`, or rejects with the signal's reason as soon as it aborts.
 */
export async function sleep(props: SleepProps): Promise<void> {
  const { ms, signal } = props;

  signal?.throwIfAborted();

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeoutId);
      reject(signal?.reason);
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
