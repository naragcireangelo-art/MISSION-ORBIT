/**
 * flightPhysics.ts — Ship movement, bounds and collision tests. Pure functions on plain data.
 *
 *   stepShip(ship, move, maxSpeed, dt, bounds)    smooth velocity, integrate, clamp to the arena
 *   circleHitsBox(...)                            circle vs the ship's rectangular chassis
 *
 * No DOM, no React, no timers: everything is driven by the `dt` it is given, so slow-mo scales
 * motion automatically and tests can run it headlessly.
 */

import { satelliteBounds, satelliteHitbox, type SatelliteParts } from '../art/satellite';
import { GAMEPLAY, type ShipState } from './flightTypes';

export interface ArenaBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** Where the ship may roam. The drawn wings and antenna must stay on screen, not just the chassis. */
export function arenaBounds(aspect: number, parts: SatelliteParts): ArenaBounds {
  const b = satelliteBounds(parts, GAMEPLAY.SHIP_UNIT);
  const margin = Math.abs(b.top) + 0.012;
  return {
    xMin: Math.max(aspect * GAMEPLAY.SHIP_X_MIN, Math.abs(b.left) + 0.02),
    xMax: aspect * GAMEPLAY.SHIP_X_MAX,
    yMin: margin,
    yMax: 1 - margin,
  };
}

export function createShip(aspect: number, parts: SatelliteParts): ShipState {
  const box = satelliteHitbox(parts, GAMEPLAY.SHIP_UNIT);
  const bounds = arenaBounds(aspect, parts);
  return {
    x: Math.max(bounds.xMin, aspect * GAMEPLAY.SHIP_START_X),
    y: 0.5,
    vx: 0,
    vy: 0,
    halfW: box.halfW * GAMEPLAY.HITBOX_FORGIVE,
    halfH: box.halfH * GAMEPLAY.HITBOX_FORGIVE,
    invuln: 0,
  };
}

export function stepShip(
  ship: ShipState,
  move: { x: number; y: number },
  maxSpeed: number,
  dt: number,
  bounds: ArenaBounds,
): void {
  // Ease toward the wanted velocity so steering feels weighty but responsive.
  const blend = 1 - Math.exp(-dt / GAMEPLAY.SHIP_SMOOTH_S);
  ship.vx += (move.x * maxSpeed - ship.vx) * blend;
  ship.vy += (move.y * maxSpeed - ship.vy) * blend;

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  if (ship.x < bounds.xMin) {
    ship.x = bounds.xMin;
    ship.vx = Math.max(0, ship.vx);
  } else if (ship.x > bounds.xMax) {
    ship.x = bounds.xMax;
    ship.vx = Math.min(0, ship.vx);
  }
  if (ship.y < bounds.yMin) {
    ship.y = bounds.yMin;
    ship.vy = Math.max(0, ship.vy);
  } else if (ship.y > bounds.yMax) {
    ship.y = bounds.yMax;
    ship.vy = Math.min(0, ship.vy);
  }
}

/** True when a circle overlaps the ship's chassis box, grown by `expand` on every side. */
export function circleHitsShip(ship: ShipState, cx: number, cy: number, r: number, expand = 0): boolean {
  const nx = Math.max(ship.x - ship.halfW - expand, Math.min(cx, ship.x + ship.halfW + expand));
  const ny = Math.max(ship.y - ship.halfH - expand, Math.min(cy, ship.y + ship.halfH + expand));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}
