/**
 * MissionDossierCard.tsx — One mission file in the archive: code stamp, spinning target body,
 * title, spacecraft, target-region tag, exact NASA launch date badge, vehicle and pad,
 * the scan-target route, and lock / ready / complete status with earned stars.
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getBody } from '../../data/celestialBodies';
import { getCodexEntry } from '../../data/codexEntries';
import { formatLaunchDate, type MissionData as Mission } from '../../data/missions';
import { uiAudio } from '../../engine/uiAudio';
import { IconArrowRight, IconCheck, IconLock, IconStar } from '../ui/icons';
import { BodyPortrait } from '../ui/planet/BodyPortrait';
import { LaunchDateBadge } from './LaunchDateBadge';

export type DossierStatus = 'locked' | 'ready' | 'complete';

export interface MissionDossierCardProps {
  mission: Mission;
  status: DossierStatus;
  /** Stars earned (0–3), shown on completed missions. */
  stars?: number;
  /** The mission that has to be finished first (for the locked message). */
  requirement?: Mission;
  /** Position in the grid, used to stagger the entrance animation. */
  index?: number;
  /** This card has been chosen and the screen is launching into Assembly. */
  launching?: boolean;
  /** Another card has been chosen; fade this one back. */
  dimmed?: boolean;
  onOpen: (mission: Mission) => void;
}

const STATUS_LABEL: Record<DossierStatus, string> = {
  locked: 'LOCKED',
  ready: 'READY',
  complete: 'COMPLETE',
};

export function MissionDossierCard({
  mission,
  status,
  stars = 0,
  requirement,
  index = 0,
  launching = false,
  dimmed = false,
  onOpen,
}: MissionDossierCardProps) {
  const [denied, setDenied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const art = getCodexEntry(getBody(mission.briefingTarget.bodyId)?.scanName)?.art;
  const locked = status === 'locked';
  const hint = locked && requirement ? `Complete ${requirement.code} (${requirement.spacecraft}) first` : '';

  const handleClick = (): void => {
    if (locked) {
      uiAudio.sfx.denied();
      setDenied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDenied(false), 520);
      return;
    }
    uiAudio.sfx.confirm();
    onOpen(mission);
  };

  const cls = [
    'mo-dossier',
    `is-${status}`,
    denied ? 'is-denied' : '',
    launching ? 'is-launching' : '',
    dimmed ? 'is-dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cls}
      style={{ '--mo-i': index } as CSSProperties}
      aria-disabled={locked}
      aria-label={`${mission.code}, ${mission.folderTitle}, ${mission.spacecraft}. Launched ${formatLaunchDate(mission.launchDateISO)}. ${
        locked ? `Locked. ${hint}.` : status === 'complete' ? `Complete, ${stars} of 3 stars.` : 'Ready.'
      }`}
      onClick={handleClick}
      onMouseEnter={() => {
        if (!locked) uiAudio.sfx.hover();
      }}
    >
      <span className="mo-corner mo-corner--tl" />
      <span className="mo-corner mo-corner--tr" />
      <span className="mo-corner mo-corner--bl" />
      <span className="mo-corner mo-corner--br" />

      <span className="mo-dossier__head">
        <span className="mo-tag mo-tag--mono">{mission.code}</span>
        {status !== 'ready' && (
          <span className={`mo-statuschip is-${status}`}>
            {status === 'locked' && <IconLock size={12} />}
            {status === 'complete' && <IconCheck size={12} />}
            {STATUS_LABEL[status]}
          </span>
        )}
      </span>

      <span className="mo-dossier__body">
        <span className="mo-dossier__art" aria-hidden="true">
          {art ? <BodyPortrait art={art} size={art === 'saturn' ? 58 : 88} fps={20} spin={status === 'locked' ? 0.35 : 1} /> : null}
        </span>
        <span className="mo-dossier__titles">
          <span className="mo-dossier__title">{mission.folderTitle}</span>
          <span className="mo-dossier__craft">{mission.spacecraft.toUpperCase()}</span>
        </span>
        <LaunchDateBadge mission={mission} compact />
      </span>

      <span className="mo-dossier__tagline">{mission.regionTag}</span>

      <span className="mo-dossier__objectives">
        {mission.targetIds.length} {mission.targetIds.length === 1 ? 'objective' : 'objectives'}
      </span>

      <span className="mo-dossier__foot">
        <span className="mo-dossier__stars" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <IconStar key={n} size={15} filled={status === 'complete' && n <= stars} />
          ))}
        </span>
        <span className="mo-dossier__cta">
          {locked ? (
            <>
              <IconLock size={13} /> {hint ? hint.toUpperCase() : 'LOCKED'}
            </>
          ) : (
            <>
              {status === 'complete' ? 'REPLAY' : 'VIEW OBJECTIVES'} <IconArrowRight size={14} />
            </>
          )}
        </span>
      </span>
    </button>
  );
}

export default MissionDossierCard;
