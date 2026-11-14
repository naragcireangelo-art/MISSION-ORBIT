/**
 * ScanReticle.tsx — Lock-on reticle with the target's name and live letter highlighting.
 *
 *   <ScanReticle router={router} getAnchor={() => planetScreenPosition} />
 *
 * - Appears on `scanStart`, highlights typed letters on every `scanKey`, flashes "SCANNED" on
 *   `scanComplete`, and clears itself shortly after (or straight away if the scan is cancelled).
 * - Wrong key: the next letter flashes red and the name shakes. Progress is never reset.
 *   An error absorbed by the LiDAR allowance flashes amber instead.
 * - `getAnchor` is polled every animation frame (no React re-render), so the reticle can ride on a
 *   moving planet. Return CSS pixels relative to the Explore stage. Omit it to centre the reticle.
 */

import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import '../../styles/flight.css';
import type { InputRouter } from '../../engine/inputRouter';
import { useReticleState } from './flightHooks';

export interface ReticleAnchor {
  x: number;
  y: number;
  /** On-screen radius of the body in CSS px; the ring is sized to frame it. */
  radius?: number;
}

export interface ScanReticleProps {
  router: InputRouter;
  getAnchor?: () => ReticleAnchor | null;
}

const MIN_RING = 132;
const MAX_RING = 360;
const RING_R = 46; // SVG units, viewBox 100x100
const RING_C = 2 * Math.PI * RING_R;

export function ScanReticle({ router, getAnchor }: ScanReticleProps) {
  const { status, progress, feedback, feedbackSeq } = useReticleState(router);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef(getAnchor);
  anchorRef.current = getAnchor;

  const visible = status !== 'idle' && progress !== null;

  // Follow the target every frame without re-rendering React.
  useLayoutEffect(() => {
    if (!visible) return;
    let raf = 0;
    const place = (): void => {
      const el = rootRef.current;
      const anchor = anchorRef.current?.() ?? null;
      if (el) {
        if (anchor) {
          const ring = Math.max(MIN_RING, Math.min(MAX_RING, (anchor.radius ?? 0) * 2 + 36));
          el.style.left = `${anchor.x}px`;
          el.style.top = `${anchor.y}px`;
          el.style.setProperty('--ring', `${ring}px`);
        } else {
          el.style.left = '50%';
          el.style.top = '44%';
          el.style.setProperty('--ring', `${MIN_RING + 40}px`);
        }
      }
      raf = window.requestAnimationFrame(place);
    };
    place();
    return () => window.cancelAnimationFrame(raf);
  }, [visible]);

  if (!visible || !progress) return null;

  const done = status === 'done';
  const chars = Array.from(progress.target);
  const errorFlash = feedback === 'error' || feedback === 'forgiven';

  return (
    <div
      ref={rootRef}
      className={`mo-reticle${done ? ' is-done' : ''}${feedback === 'error' ? ' is-error' : ''}${feedback === 'forgiven' ? ' is-forgiven' : ''}`}
      style={{ '--ratio': progress.ratio } as CSSProperties}
    >
      <div className="mo-reticle__ring" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="mo-reticle__svg">
          <circle className="mo-reticle__track" cx="50" cy="50" r={RING_R} />
          <circle
            className="mo-reticle__progress"
            cx="50"
            cy="50"
            r={RING_R}
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress.ratio)}
          />
        </svg>
        <span className="mo-reticle__bracket mo-reticle__bracket--tl" />
        <span className="mo-reticle__bracket mo-reticle__bracket--tr" />
        <span className="mo-reticle__bracket mo-reticle__bracket--bl" />
        <span className="mo-reticle__bracket mo-reticle__bracket--br" />
        <span className="mo-reticle__sweep" />
      </div>

      <div className="mo-reticle__label">
        <p className="mo-reticle__eyebrow">{done ? 'Scan complete' : 'Scan lock · type the name'}</p>
        <p
          className="mo-reticle__name"
          // Re-mount on each error so the shake animation restarts.
          key={errorFlash ? `e${feedbackSeq}` : 'name'}
          aria-label={`${progress.target}: ${progress.typed.length} of ${progress.length} letters typed`}
        >
          {chars.map((ch, i) => {
            const state = i < progress.index ? 'is-typed' : i === progress.index ? 'is-next' : 'is-pending';
            const flash = i === progress.index && errorFlash ? ` is-flash-${feedback}` : '';
            return (
              <span key={i} className={`mo-reticle__char ${state}${flash}${ch === ' ' ? ' is-space' : ''}`} aria-hidden="true">
                {ch === ' ' ? ' ' : ch}
              </span>
            );
          })}
        </p>
        <p className="mo-reticle__hint mo-mono" aria-hidden="true">
          {done
            ? 'SCANNED'
            : feedback === 'forgiven'
              ? 'LIDAR ABSORBED ERROR'
              : feedback === 'error'
                ? 'MISREAD — KEEP TYPING'
                : `${Math.round(progress.ratio * 100)}% RESOLVED`}
        </p>
      </div>

      <p className="mo-visually-hidden" aria-live="assertive">
        {done ? `${progress.target} scanned` : progress.index === 0 ? `Scan lock on ${progress.target}. Type the name.` : ''}
      </p>
    </div>
  );
}

export default ScanReticle;
