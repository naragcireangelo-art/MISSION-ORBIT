/**
 * AssemblyScreen.tsx — Build and name the satellite before launch.
 *
 * Opens after a level is chosen in the Archive. The player picks one part for each of the four
 * slots (Antenna, Laser, Body, Thruster), watches the live vector preview update, and names the
 * satellite (1–16 characters, pre-filled from the mission's spacecraft, e.g. MARINER-II).
 *
 * The build lives in useAssemblyStore and is saved, so Retry and later missions reuse it.
 * Keyboard: Enter (outside a field) = Continue, Esc = Back to the Archive.
 */

import { useEffect, useMemo } from 'react';
import { BuildStats } from '../components/assembly/BuildStats';
import { NameInput } from '../components/assembly/NameInput';
import { PartSlotSelector } from '../components/assembly/PartSlotSelector';
import { VectorSatellitePreview } from '../components/assembly/VectorSatellitePreview';
import { IconArrowLeft, IconArrowRight } from '../components/ui/icons';
import { defaultCallsign, getMission } from '../data/missions';
import {
  PART_SLOTS,
  computeBuildStats,
  integrationProgress,
  validateSatelliteName,
} from '../data/parts';
import { uiAudio } from '../engine/uiAudio';
import { useAssemblyStore } from '../store/useAssemblyStore';
import { useGameStore, type ScreenId } from '../store/useGameStore';
import '../styles/missionControl.css';
import '../styles/assembly.css';

/** Screen that follows Assembly. Change this one line if a Briefing step is added in between. */
export const NEXT_AFTER_ASSEMBLY: ScreenId = 'objectives';

/** The mission the callsign was last pre-filled for, so choosing another level refreshes it. */
let prefilledForMission: string | null = null;

export function AssemblyScreen() {
  const selectedId = useGameStore((s) => s.selectedMissionId);
  const missionStars = useGameStore((s) => s.missionStars);
  const setScreen = useGameStore((s) => s.setScreen);
  const build = useAssemblyStore((s) => s.build);
  const setPart = useAssemblyStore((s) => s.setPart);
  const setName = useAssemblyStore((s) => s.setName);

  const mission = getMission(selectedId);
  const totalStars = useMemo(
    () => Object.values(missionStars).reduce((sum, n) => sum + n, 0),
    [missionStars],
  );

  // Pre-fill the callsign once per chosen level; after that the player's edits are kept.
  useEffect(() => {
    if (mission && prefilledForMission !== mission.id) {
      prefilledForMission = mission.id;
      setName(defaultCallsign(mission));
    }
  }, [mission, setName]);

  const parts = useMemo(
    () => ({ body: build.body, antenna: build.antenna, laser: build.laser, thruster: build.thruster }),
    [build.body, build.antenna, build.laser, build.thruster],
  );
  const stats = useMemo(() => computeBuildStats(build), [build]);
  const nameOk = validateSatelliteName(build.name).valid;
  const ready = nameOk && integrationProgress(build) === 1;

  const goBack = (): void => {
    uiAudio.sfx.click();
    setScreen('archive');
  };
  const proceed = (): void => {
    if (!ready) {
      uiAudio.sfx.denied();
      return;
    }
    uiAudio.sfx.confirm();
    setScreen(NEXT_AFTER_ASSEMBLY);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      const interactive =
        target instanceof HTMLElement && ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'Enter' && !interactive) {
        e.preventDefault();
        proceed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <section className="mo-screen mo-asm" aria-labelledby="mo-asm-title">
      <header className="mo-asm__head">
        <p className="mo-eyebrow">
          {mission ? `Level ${mission.levelNumber} · ${mission.spacecraft}` : 'Hangar'}
        </p>
        <h1 id="mo-asm-title" className="mo-title">
          Assembly
        </h1>
      </header>

      <div className="mo-asm__layout">
        <div className="mo-asm__left">
          <VectorSatellitePreview parts={parts} name={build.name} />
          <BuildStats stats={stats} />
        </div>

        <div className="mo-asm__right">
          <NameInput value={build.name} onChange={setName} onSubmit={proceed} />
          <div className="mo-asm__slots">
            {PART_SLOTS.map((slot) => (
              <PartSlotSelector
                key={slot}
                slot={slot}
                selectedId={build[slot]}
                onSelect={(id) => {
                  uiAudio.sfx.click();
                  setPart(slot, id);
                }}
                totalStars={totalStars}
              />
            ))}
          </div>
          <div className="mo-asm__actions">
            <button type="button" className="mo-btn mo-btn--ghost" onClick={goBack}>
              <IconArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              className={`mo-btn mo-btn--primary${ready ? ' is-pulsing' : ''}`}
              onClick={proceed}
              disabled={!ready}
            >
              Continue <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AssemblyScreen;
