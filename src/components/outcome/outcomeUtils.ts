/**
 * outcomeUtils.ts — Small helpers shared by the Mission Complete, Signal Lost and Outro screens.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';

/** "125" -> "02:05". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/**
 * Screen hotkeys (Enter / Escape / single letters). Ignored while the Codex is open, while a
 * modifier is held, and when focus is on a button or link (so Enter activates that instead).
 */
export function useScreenKeys(keys: Record<string, () => void>): void {
  const ref = useRef(keys);
  ref.current = keys;
  const codexOpen = useGameStore((s) => s.codexOpen);

  useEffect(() => {
    if (codexOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target;
      const interactive = t instanceof HTMLElement && ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
      if (e.key === 'Enter' && interactive) return;
      const fn = ref.current[e.key] ?? ref.current[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [codexOpen]);
}
