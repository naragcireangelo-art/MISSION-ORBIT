/**
 * ScrollableTransmission.tsx — A scrollable "incoming transmission" console that types its
 * content out like a live Deep Space Network downlink.
 *
 *   • Types out character by character, with a soft tick sound and a blinking cursor
 *   • Stays pinned to the newest line until the player scrolls up to re-read
 *   • `skip` reveals everything instantly; `onComplete` fires once when it has finished
 *   • Screen readers get the full text immediately instead of the typing animation
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { uiAudio } from '../../engine/uiAudio';
import { useReducedMotion } from './hooks';
import { IconExternal } from './icons';

export type TransmissionBlock =
  | { type: 'heading'; text: string }
  | { type: 'rows'; rows: [string, string][] }
  | { type: 'paragraph'; text: string }
  | { type: 'sources'; items: { label: string; url: string }[] }
  | { type: 'divider' };

export interface ScrollableTransmissionProps {
  blocks: TransmissionBlock[];
  /** Reveal everything immediately. */
  skip?: boolean;
  /** Called once when the whole transmission is visible. */
  onComplete?: () => void;
  /** Called while typing with the fraction revealed so far (0–1). */
  onProgress?: (fraction: number) => void;
  /** Typing speed in characters per second. Default 150. */
  speed?: number;
  /** Delay before typing begins (ms). Default 500. */
  startDelay?: number;
  ariaLabel?: string;
}

function blockLength(b: TransmissionBlock): number {
  switch (b.type) {
    case 'heading':
      return b.text.length + 8;
    case 'rows':
      return b.rows.reduce((n, [k, v]) => n + k.length + v.length, 0);
    case 'paragraph':
      return b.text.length;
    case 'sources':
      return b.items.reduce((n, i) => n + i.label.length, 0);
    case 'divider':
      return 10;
  }
}

function plainText(blocks: TransmissionBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'heading':
        case 'paragraph':
          return b.text;
        case 'rows':
          return b.rows.map(([k, v]) => `${k}: ${v}`).join('. ');
        case 'sources':
          return `Sources: ${b.items.map((i) => i.label).join(', ')}`;
        case 'divider':
          return '';
      }
    })
    .filter(Boolean)
    .join('\n');
}

function renderBlock(b: TransmissionBlock, budget: number, key: number) {
  switch (b.type) {
    case 'heading':
      return (
        <h4 key={key} className="mo-tx__heading">
          <span className="mo-tx__prompt">&gt;</span> {b.text.slice(0, Math.max(0, budget - 8))}
        </h4>
      );
    case 'paragraph':
      return (
        <p key={key} className="mo-tx__p">
          {b.text.slice(0, budget)}
        </p>
      );
    case 'divider':
      return <hr key={key} className="mo-tx__divider" />;
    case 'rows': {
      let left = budget;
      return (
        <dl key={key} className="mo-tx__rows">
          {b.rows.map(([k, v], i) => {
            if (left <= 0) return null;
            const kShown = k.slice(0, left);
            left -= k.length;
            const vShown = left > 0 ? v.slice(0, left) : '';
            left -= v.length;
            return (
              <div key={i} className="mo-tx__row">
                <dt>{kShown}</dt>
                <dd>{vShown}</dd>
              </div>
            );
          })}
        </dl>
      );
    }
    case 'sources': {
      let left = budget;
      return (
        <ul key={key} className="mo-tx__sources">
          {b.items.map((item, i) => {
            if (left <= 0) return null;
            const shown = item.label.slice(0, left);
            const complete = left >= item.label.length;
            left -= item.label.length;
            return (
              <li key={i}>
                {complete ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.label} <IconExternal size={12} />
                  </a>
                ) : (
                  <span>{shown}</span>
                )}
              </li>
            );
          })}
        </ul>
      );
    }
  }
}

export function ScrollableTransmission({
  blocks,
  skip = false,
  onComplete,
  onProgress,
  speed = 150,
  startDelay = 500,
  ariaLabel = 'Incoming transmission',
}: ScrollableTransmissionProps) {
  const reduced = useReducedMotion();
  const total = useMemo(() => blocks.reduce((n, b) => n + blockLength(b), 0), [blocks]);
  const fullText = useMemo(() => plainText(blocks), [blocks]);
  const [chars, setChars] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const done = chars >= total;

  // Typing loop
  useEffect(() => {
    if (skip || reduced) {
      setChars(total);
      return;
    }
    let raf = 0;
    let cancelled = false;
    let value = 0;
    let last = 0;
    const timer = window.setTimeout(() => {
      const tick = (now: number): void => {
        if (cancelled) return;
        if (last === 0) last = now;
        const dt = Math.min(0.08, (now - last) / 1000);
        last = now;
        value = Math.min(total, value + speed * dt);
        setChars(Math.floor(value));
        onProgressRef.current?.(total > 0 ? value / total : 1);
        if (value < total) {
          uiAudio.sfx.type();
          raf = requestAnimationFrame(tick);
        }
      };
      raf = requestAnimationFrame(tick);
    }, startDelay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [skip, reduced, total, speed, startDelay]);

  // Announce completion once
  useEffect(() => {
    if (done && total > 0 && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current?.();
    }
  }, [done, total]);

  // Follow the newest line unless the player has scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [chars]);

  const onScroll = (): void => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 28;
  };

  let remaining = chars;
  const rendered: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (remaining <= 0) break;
    const len = blockLength(blocks[i]);
    rendered.push(renderBlock(blocks[i], Math.min(remaining, len), i));
    remaining -= len;
  }

  return (
    <div
      ref={scrollRef}
      className="mo-tx"
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={onScroll}
    >
      {!done && <div className="mo-visually-hidden">{fullText}</div>}
      <div className="mo-tx__content" aria-hidden={!done}>
        {rendered}
        {!done && <span className="mo-cursor" aria-hidden="true" />}
        {done && (
          <p className="mo-tx__end">
            <span className="mo-tx__prompt">&gt;</span> END OF TRANSMISSION <span className="mo-cursor" />
          </p>
        )}
      </div>
    </div>
  );
}

export default ScrollableTransmission;
