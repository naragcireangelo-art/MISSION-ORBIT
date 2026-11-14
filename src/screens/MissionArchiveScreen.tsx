/**
 * MissionArchiveScreen.tsx — Step 01: the Mission Archive.
 *
 * Nine real NASA missions, filed in strict launch-date order inside three era folders
 * (1970s–1980s · 1990s–2000s · 2010s–2020s). Each folder shows its mission dossier cards. 
 *
 * Every level is open. Keyboard: 1 / 2 / 3 jump to an era folder; ← / → move between tabs.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { EraTabs, eraPanelId, eraTabId, type EraTabCount } from '../components/archive/EraTabs';
import { MissionDossierCard, type DossierStatus } from '../components/archive/MissionDossierCard';
import {
  ERAS,
  MISSIONS,
  getMissionsByEra,
  getUnlockRequirement,
  isMissionUnlocked,
  type EraId,
  type Mission,
} from '../data/missions';
import { uiAudio } from '../engine/uiAudio';
import { useGameStore } from '../store/useGameStore';

// ── Screen ───────────────────────────────────────────────────────────────────

export function MissionArchiveScreen() {
  const completedIds = useGameStore((s) => s.completedMissionIds);
  const missionStars = useGameStore((s) => s.missionStars);
  const codexOpen = useGameStore((s) => s.codexOpen);
  const selectMission = useGameStore((s) => s.selectMission);
  const setScreen = useGameStore((s) => s.setScreen);

  const statusOf = (m: Mission): DossierStatus =>
    completedIds.includes(m.id) ? 'complete' : isMissionUnlocked(m, completedIds) ? 'ready' : 'locked';

  const [activeEra, setActiveEra] = useState<EraId>(() => {
    const next = MISSIONS.find((m) => !completedIds.includes(m.id) && isMissionUnlocked(m, completedIds));
    return next ? next.era : ERAS[0].id;
  });
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const counts = useMemo(() => {
    const out = {} as Record<EraId, EraTabCount>;
    for (const era of ERAS) {
      const list = getMissionsByEra(era.id);
      out[era.id] = { total: list.length, complete: list.filter((m) => completedIds.includes(m.id)).length };
    }
    return out;
  }, [completedIds]);

  const era = ERAS.find((e) => e.id === activeEra) ?? ERAS[0];
  const missions = getMissionsByEra(era.id);

  const changeEra = (id: EraId): void => {
    if (id === activeEra) return;
    uiAudio.sfx.click();
    setActiveEra(id);
  };

  // 1 / 2 / 3 jump straight to an era folder.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (codexOpen || launchingId || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.isContentEditable)) return;
      const index = ['1', '2', '3'].indexOf(e.key);
      if (index >= 0) {
        e.preventDefault();
        changeEra(ERAS[index].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codexOpen, launchingId, activeEra]);

  const openMission = (mission: Mission): void => {
    if (launchingId) return;
    selectMission(mission.id);
    setLaunchingId(mission.id);
    timer.current = window.setTimeout(() => setScreen('objectives'), 560);
  };

  return (
    <section className={`mo-screen mo-archive${launchingId ? ' is-launching' : ''}`} aria-labelledby="mo-archive-title">
      <header className="mo-archive__header">
        <div>
          <h1 id="mo-archive-title" className="mo-title">
            Mission Archive
          </h1>
          <p className="mo-lede">Nine real NASA missions. Pick a level to see its objectives.</p>
        </div>
      </header>

      <div className="mo-archive__folder">
        <EraTabs eras={ERAS} active={activeEra} counts={counts} onChange={changeEra} />
        <div
          className="mo-folder"
          role="tabpanel"
          id={eraPanelId(era.id)}
          aria-labelledby={eraTabId(era.id)}
          tabIndex={-1}
        >
          <div className="mo-folder__head">
            <h2 className="mo-folder__title">{era.folderTitle}</h2>
          </div>
          <div className="mo-folder__grid" key={era.id}>
            {missions.map((m, i) => (
              <MissionDossierCard
                key={m.id}
                mission={m}
                status={statusOf(m)}
                stars={missionStars[m.id] ?? 0}
                requirement={getUnlockRequirement(m)}
                index={i}
                launching={launchingId === m.id}
                dimmed={launchingId !== null && launchingId !== m.id}
                onOpen={openMission}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MissionArchiveScreen;
