import { useRef, useState, type KeyboardEvent } from 'react';
import { formatTime, parseTime } from '@src/common/utils/formatTime';

const NUDGE_SEC = 0.1;
const LARGE_NUDGE_SEC = 1;

type TimeInputProps = {
  label: string;
  value: number;
  onCommit: (seconds: number) => void;
  disabled?: boolean;
};

/**
 * A time that can be typed ("1:02.5", "62.5"), or nudged with the arrow keys.
 */
export function TimeInput(props: TimeInputProps) {
  const { label, value, onCommit, disabled } = props;

  const [draft, setDraft] = useState<string | null>(null);
  const isCancelingRef = useRef(false);

  function commit() {
    const text = draft;
    setDraft(null);

    if (isCancelingRef.current) {
      isCancelingRef.current = false;
      return;
    }

    if (text === null) return;

    const seconds = parseTime(text);

    if (seconds !== null && seconds !== value) onCommit(seconds);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
      return;
    }

    if (event.key === 'Escape') {
      isCancelingRef.current = true;
      event.currentTarget.blur();
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();

      const step = event.shiftKey ? LARGE_NUDGE_SEC : NUDGE_SEC;
      const direction = event.key === 'ArrowUp' ? 1 : -1;
      setDraft(null);
      onCommit(Math.max(0, Math.round((value + direction * step) * 1000) / 1000));
    }
  }

  return (
    <input
      aria-label={label}
      value={draft ?? formatTime(value)}
      disabled={disabled}
      spellCheck={false}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className='w-[4.75rem] rounded-md bg-transparent px-1.5 py-1 font-mono text-[11px] text-zinc-400 tabular-nums outline-none hover:bg-zinc-800 hover:text-zinc-200 focus:bg-zinc-800 focus:text-zinc-50 disabled:hover:bg-transparent'
    />
  );
}
