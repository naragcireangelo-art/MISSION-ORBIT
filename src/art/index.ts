/**
 * art/ — One import for all vector artwork.
 *
 *   Satellite   drawSatellite, satelliteHitbox, satelliteBounds    
 *   Asteroids   drawAsteroid, asteroidHitRadius, ASTEROID_SHAPE_COUNT
 *   Planets     BodyPortrait / PlanetSphere / DeepSkyArt             (React components, built by Jaz)
 *
 * Everything under `drawX` is a plain function of a Canvas 2D context, so Explore can call it
 * from `loop.addLayer(...)` and the Assembly preview can call it from a React effect.
 */

export { drawSatellite, satelliteBounds, satelliteHitbox } from './satellite';
export type { DrawSatelliteOptions, SatelliteParts } from './satellite';
export { ASTEROID_SHAPE_COUNT, asteroidHitRadius, drawAsteroid } from './asteroids';
export type { DrawAsteroidOptions } from './asteroids';
export { PALETTE } from './paths';
export { drawStarfield } from './backdrop';

export { BodyPortrait } from '../components/ui/planet/BodyPortrait';
export { PlanetSphere } from '../components/ui/planet/PlanetSphere';
export { DeepSkyArt } from '../components/ui/planet/DeepSkyArt';
