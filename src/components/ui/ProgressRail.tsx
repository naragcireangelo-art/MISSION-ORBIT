/**
 * ProgressRail.tsx — The 6-step mission progress rail in the top bar.
 *
 *   01 Archive → 02 Assembly → 03 Briefing → 04 Objectives → 05 Explore → 06 Outcome
 *
 * Reads the current screen from the store: finished steps are lit, the current step is highlighted,
 * upcoming steps are dim. It is a status display only (not navigation), so it is hidden from the
 * tab order and exposed to screen readers as a single "step X of 6" label.
 */

import type { ScreenId } from '../../store/useGameStore';
import '../../styles/briefing.css';

export interface RailStep {
  id: string;
  label: string;
  /** Screens that belong to this step. */
  screens: readonly ScreenId[];
}

export const RAIL_STEPS: readonly RailStep[] = [
  { id: 'archive', label: 'Archive', screens: ['archive'] },
  { id: 'assembly', label: 'Assembly', screens: ['assembly'] },
  { id: 'briefing', label: 'Briefing', screens: ['briefing'] },
  { id: 'objectives', label: 'Objectives', screens: ['objectives'] },
  { id: 'explore', label: 'Explore', screens: ['explore'] },
  { id: 'outcome', label: 'Outcome', screens: ['complete', 'lost', 'outro'] },
];

/** Index (0-5) of the step the screen belongs to, or -1 when it is not part of the rail (Splash). */
export function railIndexFor(screen: ScreenId): number {
  return RAIL_STEPS.findIndex((s) => s.screens.includes(screen));
}

export interface ProgressRailProps {
  screen: ScreenId;
}

export function ProgressRail({ screen }: ProgressRailProps) {
  const current = railIndexFor(screen);
  if (current < 0) return null;
  return (
    <nav className="mo-rail" aria-label={`Mission progress: step ${current + 1} of ${RAIL_STEPS.length}, ${RAIL_STEPS[current].label}`}>
      <ol className="mo-rail__list">
        {RAIL_STEPS.map((step, i) => {
          const state = i < current ? 'is-done' : i === current ? 'is-current' : 'is-next';
          return (
            <li key={step.id} className={`mo-rail__step ${state}`} aria-current={i === current ? 'step' : undefined}>
              <span className="mo-rail__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="mo-rail__label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default ProgressRail;
