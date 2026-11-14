/**
 * LaunchDateBadge.tsx — The exact NASA launch date and time (UTC), styled as a tear-off
 * calendar tile: month strip, big day number, year and liftoff time.
 */

import { formatLaunchDate, type MissionData } from '../../data/missions';

export interface LaunchDateBadgeProps {
  mission: Pick<MissionData, 'launchDateISO' | 'launchTimeUTC'>;
  /** Smaller tile for tight layouts. */
  compact?: boolean;
  className?: string;
}

export function LaunchDateBadge({ mission, compact = false, className }: LaunchDateBadgeProps) {
  // 'Oct 15, 1997' -> month, day, year. Parsed from the ISO date so time zones never shift it.
  const [year, , day] = mission.launchDateISO.split('-').map(Number);
  const monthShort = formatLaunchDate(mission.launchDateISO).split(' ')[0].toUpperCase();
  const timeUtc = `${mission.launchTimeUTC} UTC`;
  return (
    <div
      className={`mo-date${compact ? ' mo-date--compact' : ''}${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={`Launch date: ${formatLaunchDate(mission.launchDateISO)}, ${timeUtc}`}
    >
      <span className="mo-date__rings" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="mo-date__month">{monthShort}</span>
      <span className="mo-date__day">{String(day).padStart(2, '0')}</span>
      <span className="mo-date__year">{year}</span>
      <span className="mo-date__time">{timeUtc}</span>
    </div>
  );
}

export default LaunchDateBadge;
