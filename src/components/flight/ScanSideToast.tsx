/**
 * ScanSideToast.tsx — Slide-in "[Name] has been scanned" notification with a NASA Science Log card.
 *
 *   <ScanSideToast router={router} />
 *
 * Listens for `scanComplete` on its own. Each toast shows the body's portrait, diameter / orbital
 * distance rows and key fact (from celestialBodies.ts `buildScanCard`), plus this scan's WPM and
 * accuracy. Toasts stack on the right edge, newest on top, and dismiss themselves.
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import '../../styles/flight.css';
import { buildScanCard, type ScanCard } from '../../data/celestialBodies';
import type { InputRouter, ScanResult } from '../../engine/inputRouter';
import { BodyPortrait } from '../ui/planet/BodyPortrait';
import { IconStar } from '../ui/icons';
import { bodyArt, findBody } from './bodyLookup';
import { useScanComplete } from './flightHooks';

export interface ScanSideToastProps {
  router: InputRouter;
  /** How long each toast stays up, in ms. */
  durationMs?: number;
  /** Most toasts visible at once; older ones are dropped. */
  maxVisible?: number;
}

interface Toast {
  id: number;
  message: string;
  bodyId: string | null;
  card: ScanCard | undefined;
  result: ScanResult | null;
  leaving: boolean;
}

const LEAVE_MS = 420;

export function ScanSideToast({ router, durationMs = 6500, maxVisible = 2 }: ScanSideToastProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Set<number>());

  const later = (fn: () => void, ms: number): void => {
    const t = window.setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      pending.clear();
    };
  }, []);

  useScanComplete(router, (e) => {
    const body = findBody(e.target);
    const id = nextId.current++;
    const toast: Toast = {
      id,
      message: e.message,
      bodyId: body?.id ?? null,
      card: body ? buildScanCard(body.id) : undefined,
      result: e.result,
      leaving: false,
    };
    setToasts((list) => [toast, ...list].slice(0, maxVisible + 1));
    later(() => setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t))), durationMs);
    later(() => setToasts((list) => list.filter((t) => t.id !== id)), durationMs + LEAVE_MS);
  });

  return (
    <div className="mo-toasts" role="status" aria-live="polite">
      {toasts.slice(0, maxVisible).map((t) => {
        const art = t.bodyId ? bodyArt(t.bodyId) : null;
        const acc = t.result ? Math.round(t.result.accuracy * 100) : null;
        return (
          <article
            key={t.id}
            className={`mo-toast${t.leaving ? ' is-leaving' : ''}`}
            style={{ '--mo-toast-ms': `${durationMs}ms` } as CSSProperties}
          >
            <header className="mo-toast__head">
              {art && (
                <span className="mo-toast__art" aria-hidden="true">
                  <BodyPortrait art={art} size={art === 'saturn' ? 30 : 46} glow={false} fps={20} />
                </span>
              )}
              <div className="mo-toast__titles">
                <p className="mo-toast__eyebrow">Scan complete · Science Log</p>
                <p className="mo-toast__message">{t.message}</p>
              </div>
            </header>

            {t.card && (
              <>
                {t.card.rows.length > 0 && (
                  <dl className="mo-toast__rows">
                    {t.card.rows.map((r) => (
                      <div key={r.label} className="mo-toast__row">
                        <dt>{r.label}</dt>
                        <dd className="mo-mono">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="mo-toast__fact">{t.card.fact}</p>
              </>
            )}

            {t.result && (
              <footer className="mo-toast__foot mo-mono">
                <span>{Math.round(t.result.wpm)} WPM</span>
                <span>{acc}% ACC</span>
                {t.result.perfect && (
                  <span className="mo-toast__perfect">
                    <IconStar size={11} filled /> Perfect
                  </span>
                )}
              </footer>
            )}
            <span className="mo-toast__timer" aria-hidden="true" />
          </article>
        );
      })}
    </div>
  );
}

export default ScanSideToast;
