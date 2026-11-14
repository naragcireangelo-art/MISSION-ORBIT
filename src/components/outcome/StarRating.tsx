/**
 * StarRating.tsx — Three stars that light up one by one, with the rule behind each star listed.
 *
 *   <StarRating criteria={report.criteria} />
 */

import type { CSSProperties } from 'react';
import '../../styles/outcome.css';
import type { StarCriterion } from '../../store/useOutcomeStore';
import { IconCheck, IconStar } from '../ui/icons';

export interface StarRatingProps {
  criteria: readonly StarCriterion[];
  /** Hide the rules list (just the stars). */
  compact?: boolean;
  /** Star size in px. */
  size?: number;
}

export function StarRating({ criteria, compact = false, size = 44 }: StarRatingProps) {
  const earned = criteria.filter((c) => c.earned).length;
  return (
    <div className={`mo-stars${compact ? ' is-compact' : ''}`}>
      <div className="mo-stars__row" role="img" aria-label={`${earned} of ${criteria.length} stars`}>
        {criteria.map((c, i) => (
          <span
            key={c.id}
            className={`mo-stars__star${c.earned ? ' is-earned' : ''}`}
            style={{ '--mo-i': i } as CSSProperties}
          >
            <IconStar size={size} filled={c.earned} />
          </span>
        ))}
      </div>
      {!compact && (
        <ul className="mo-stars__rules">
          {criteria.map((c, i) => (
            <li key={c.id} className={c.earned ? 'is-earned' : ''} style={{ '--mo-i': i } as CSSProperties}>
              <span className="mo-stars__tick" aria-hidden="true">
                {c.earned ? <IconCheck size={11} /> : null}
              </span>
              {c.label}
              <span className="mo-visually-hidden">{c.earned ? ' — earned' : ' — not earned'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Static star row for lists (no animation, no rules). */
export function StarMeter({ stars, max = 3, size = 14 }: { stars: number; max?: number; size?: number }) {
  return (
    <span className="mo-starmeter" role="img" aria-label={`${stars} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < stars ? 'is-earned' : ''}>
          <IconStar size={size} filled={i < stars} />
        </span>
      ))}
    </span>
  );
}

export default StarRating;
