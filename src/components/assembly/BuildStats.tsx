/**
 * BuildStats.tsx — Readout of what the current build does in flight.
 */

import type { BuildStats as Stats } from '../../data/parts';

export interface BuildStatsProps {
  stats: Stats;
}

/** Share of a bar to fill for a value between `min` and `max` (never fully empty). */
function share(value: number, min: number, max: number): number {
  return Math.max(0.06, Math.min(1, (value - min) / (max - min)));
}

export function BuildStats({ stats }: BuildStatsProps) {
  const rows: { label: string; value: string; fill: number }[] = [
    { label: 'Hull integrity', value: `${stats.maxHull} hits`, fill: share(stats.maxHull, 2, 7) },
    { label: 'Flight speed', value: `${stats.moveSpeed.toFixed(2)} /s`, fill: share(stats.moveSpeed, 0.3, 0.7) },
    {
      label: 'Scan range',
      value: `${Math.round(stats.scanRangeMultiplier * 100)}%`,
      fill: share(stats.scanRangeMultiplier, 0.9, 1.4),
    },
    { label: 'Free errors', value: `${stats.freeErrors} per scan`, fill: share(stats.freeErrors, -0.5, 2) },
  ];
  return (
    <section className="mo-asm__stats" aria-label="Build statistics">
      <ul>
        {rows.map((r) => (
          <li key={r.label}>
            <span className="mo-asm__stat-label">{r.label}</span>
            <span className="mo-asm__bar" aria-hidden="true">
              <i style={{ width: `${r.fill * 100}%` }} />
            </span>
            <span className="mo-asm__stat-value">{r.value}</span>
          </li>
        ))}
      </ul>
      <p className="mo-asm__totals">
        {stats.totalMassKg} kg · {stats.totalPowerW} W
        {stats.scanScoreBonus > 0 ? ` · +${Math.round(stats.scanScoreBonus * 100)}% scan score` : ''}
      </p>
    </section>
  );
}

export default BuildStats;
