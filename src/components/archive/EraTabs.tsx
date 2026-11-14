/**
 * EraTabs.tsx — The three era folder tabs of the Mission Archive.
 *
 * Accessible tab list: ← / → (and Home / End) move between folders; the active folder's tab
 * visually merges into the folder panel below it.
 */

import { useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Era, EraId } from '../../data/missions';
import { IconCheck } from '../ui/icons';

export interface EraTabCount {
  total: number;
  complete: number;
}

export interface EraTabsProps {
  eras: Era[];
  active: EraId;
  counts: Record<EraId, EraTabCount>;
  onChange: (id: EraId) => void;
}

export const eraTabId = (id: EraId): string => `mo-era-tab-${id}`;
export const eraPanelId = (id: EraId): string => `mo-era-panel-${id}`;

export function EraTabs({ eras, active, counts, onChange }: EraTabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (index: number): void => {
    const next = eras[(index + eras.length) % eras.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number): void => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        move(index + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        move(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        move(0);
        break;
      case 'End':
        e.preventDefault();
        move(eras.length - 1);
        break;
      default:
    }
  };

  return (
    <div className="mo-eratabs" role="tablist" aria-label="Mission eras">
      {eras.map((era, index) => {
        const isActive = era.id === active;
        const count = counts[era.id];
        const finished = count.total > 0 && count.complete === count.total;
        return (
          <button
            key={era.id}
            ref={(el) => {
              refs.current[era.id] = el;
            }}
            id={eraTabId(era.id)}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={eraPanelId(era.id)}
            tabIndex={isActive ? 0 : -1}
            className={`mo-eratab${isActive ? ' is-active' : ''}`}
            onClick={() => onChange(era.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            <span className="mo-eratab__index">{`0${index + 1}`}</span>
            <span className="mo-eratab__text">
              <span className="mo-eratab__label">{era.tabLabel}</span>
              <span className="mo-eratab__count">
                {finished ? (
                  <>
                    <IconCheck size={11} /> ALL {count.total} COMPLETE
                  </>
                ) : (
                  `${count.complete}/${count.total} COMPLETE · ${count.total} MISSIONS`
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default EraTabs;
