/**
 * icons.tsx — Tiny inline SVG icons (no icon library needed). All use `currentColor`.
 */

interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
});

export function IconSound({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" fillOpacity="0.2" />
      <path d="M15.5 8.8a4.6 4.6 0 0 1 0 6.4M18 6.3a8.2 8.2 0 0 1 0 11.4" />
    </svg>
  );
}

export function IconMute({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" fillOpacity="0.2" />
      <path d="m16 9.5 5 5m0-5-5 5" />
    </svg>
  );
}

export function IconCodex({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8.2" />
      <ellipse cx="12" cy="12" rx="12" ry="3.6" transform="rotate(-24 12 12)" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}

export function IconCheck({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.6} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconLock({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="currentColor" fillOpacity="0.15" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

export function IconStar({ size = 14, className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} className={className} fill={filled ? 'currentColor' : 'none'}>
      <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6Z" />
    </svg>
  );
}

export function IconArrowRight({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.2} className={className}>
      <path d="M5 12h13m-5-5 5 5-5 5" />
    </svg>
  );
}

export function IconArrowLeft({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.2} className={className}>
      <path d="M19 12H6m5-5-5 5 5 5" />
    </svg>
  );
}

export function IconSkip({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.2} className={className}>
      <path d="m5 6 7 6-7 6V6Zm9 0 7 6-7 6V6Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

export function IconClose({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.2} className={className}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function IconSearch({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function IconExternal({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function IconCrosshair({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v5m0 10v5M2 12h5m10 0h5" />
    </svg>
  );
}
