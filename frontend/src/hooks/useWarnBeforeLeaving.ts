import { useEffect } from 'react';

/**
 * Asks before the page is closed or reloaded, while there's work that would be lost.
 */
export function useWarnBeforeLeaving(shouldWarn: boolean) {
  useEffect(() => {
    if (!shouldWarn) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldWarn]);
}
