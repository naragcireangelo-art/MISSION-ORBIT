/**
 * HistoricalDiscoveryCard.tsx — "Historical Discovery Unlocked" card for the Mission Complete screen.
 * Content comes from missions.ts (`discoveryFact`, launch metadata and NASA `sources`).
 */

import '../../styles/outcome.css';
import { formatLaunchDate, type MissionData } from '../../data/missions';
import { IconExternal } from '../ui/icons';
import { BodyPortrait } from '../ui/planet/BodyPortrait';
import { bodyArt } from '../flight/bodyLookup';

export interface HistoricalDiscoveryCardProps {
  mission: MissionData;
}

export function HistoricalDiscoveryCard({ mission }: HistoricalDiscoveryCardProps) {
  const art = bodyArt(mission.briefingTarget.bodyId);
  return (
    <article className="mo-discovery" aria-labelledby="mo-discovery-title">
      <div className="mo-discovery__shine" aria-hidden="true" />
      <header className="mo-discovery__head">
        <p className="mo-discovery__eyebrow">
          <span className="mo-discovery__seal" aria-hidden="true" />
          Historical discovery unlocked
        </p>
        <h2 id="mo-discovery-title" className="mo-discovery__title">
          {mission.spacecraft}
        </h2>
        <p className="mo-discovery__launch mo-mono">
          {formatLaunchDate(mission.launchDateISO)} · {mission.launchTimeUTC} UTC
          <br />
          {mission.launchVehicle} · {mission.launchSite}
        </p>
      </header>

      {art && (
        <div className="mo-discovery__art" aria-hidden="true">
          <BodyPortrait art={art} size={art === 'saturn' ? 64 : 110} fps={24} />
        </div>
      )}

      <blockquote className="mo-discovery__fact">{mission.discoveryFact}</blockquote>

      {mission.sources.length > 0 && (
        <footer className="mo-discovery__sources">
          <span className="mo-discovery__src-label">NASA archive</span>
          <ul>
            {mission.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.label} <IconExternal size={11} />
                </a>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}

export default HistoricalDiscoveryCard;
