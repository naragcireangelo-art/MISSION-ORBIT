/**
 * BodyPortrait.tsx — One component that draws any celestial target.
 * Spheres (planets and moons) go to PlanetSphere; the Webb mirror, Carina Nebula and
 * Stephan's Quintet go to DeepSkyArt.
 */

import type { BodyArtId } from '../../../data/codexEntries';
import { DeepSkyArt } from './DeepSkyArt';
import { PlanetSphere, type SphereDecorator } from './PlanetSphere';
import { isSphereArt } from './planetTextures';

export interface BodyPortraitProps {
  art: BodyArtId;
  /** Diameter / width in CSS pixels. */
  size: number;
  spin?: number;
  fps?: number;
  glow?: boolean;
  decorator?: SphereDecorator;
  className?: string;
  label?: string;
  /** Let the player drag to rotate (planets and moons only). */
  interactive?: boolean;
}

export function BodyPortrait({ art, size, spin, fps, glow, decorator, className, label, interactive }: BodyPortraitProps) {
  if (isSphereArt(art)) {
    return (
      <PlanetSphere
        body={art}
        size={size}
        spin={spin}
        fps={fps}
        glow={glow}
        decorator={decorator}
        className={className}
        label={label}
        interactive={interactive}
      />
    );
  }
  return <DeepSkyArt art={art} size={size} className={className} label={label} />;
}

export default BodyPortrait;
