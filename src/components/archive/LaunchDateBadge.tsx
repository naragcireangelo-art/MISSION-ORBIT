/**
 * LaunchDateBadge.tsx — The exact NASA launch date and time (UTC), styled as a tear-off
 * calendar tile: month strip, big day number, year and liftoff time.
 */

import type { MissionLaunch } from '../../data/missions';

export interface LaunchDateBadgeProps {
  launch: MissionLaunch;
  /** Smaller tile for tight layouts. */
  compact?: boolean;
  className?: string;
}

export function LaunchDateBadge({ launch, compact = false, className }: LaunchDateBadgeProps) {
  return (
    <div
      className={`mo-date${compact ? ' mo-date--compact' : ''}${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={`Launch date: ${launch.fullDate}, ${launch.timeUtc}`}
    >
      <span className="mo-date__rings" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="mo-date__month">{launch.monthShort}</span>
      <span className="mo-date__day">{String(launch.day).padStart(2, '0')}</span>
      <span className="mo-date__year">{launch.year}</span>
      <span className="mo-date__time">{launch.timeUtc}</span>
    </div>
  );
}

export default LaunchDateBadge;
