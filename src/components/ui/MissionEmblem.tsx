/**
 * MissionEmblem.tsx — The MISSION ORBIT badge: double ring, crosshair ticks, tilted orbit paths
 * and a satellite that circles the central planet.
 */

import { useId } from 'react';

export interface MissionEmblemProps {
  size?: number;
  /** Orbit the satellite around the badge. */
  animated?: boolean;
  className?: string;
}

export function MissionEmblem({ size = 40, animated = true, className }: MissionEmblemProps) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      className={`mo-emblem${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${uid}-planet`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#b6f3ff" />
          <stop offset="55%" stopColor="#2f86d6" />
          <stop offset="100%" stopColor="#0a2250" />
        </radialGradient>
        <path id={`${uid}-orbit`} d="M 50 50 m -38 0 a 38 14 0 1 0 76 0 a 38 14 0 1 0 -76 0" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.6" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.8" strokeDasharray="2 4" />
      <g stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.4" strokeLinecap="round">
        <path d="M50 1v8M50 91v8M1 50h8M91 50h8" />
      </g>
      <g transform="rotate(-28 50 50)">
        <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke="#6ff3ff" strokeOpacity="0.8" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="17" fill={`url(#${uid}-planet)`} />
        <path d="M 12 50 a 38 14 0 0 0 76 0" fill="none" stroke="#6ff3ff" strokeOpacity="0.95" strokeWidth="1.8" />
        {animated ? (
          <circle r="3.6" fill="#ffb84d">
            <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
              <mpath href={`#${uid}-orbit`} />
            </animateMotion>
          </circle>
        ) : (
          <circle cx="86" cy="50" r="3.6" fill="#ffb84d" />
        )}
      </g>
    </svg>
  );
}

export default MissionEmblem;
