/**
 * flightTypes.ts — The shared contract for gameplay: world units, tuning numbers and event types.
 *
 * WORLD UNITS. The play area is 1.0 tall and `aspect` wide (a 16:9 window is 1.78 wide). The
 * renderer multiplies by the canvas height; nothing in the simulation knows about pixels.
 * x grows to the right, y grows downwards (canvas axes). Speeds are world units per second, which
 * is why part speeds in data/parts.ts are "screen heights per second".
 *
 * Every number that shapes how the game feels lives in GAMEPLAY below, so tuning is one file.
 */

export const GAMEPLAY = {
  /** World height per art unit. A Surveyor body (80 units) is 0.128 of the screen height. */
  SHIP_UNIT: 0.0016,
  /** Ship may roam between these fractions of the world width. */
  SHIP_X_MIN: 0.08,
  SHIP_X_MAX: 0.38,
  SHIP_START_X: 0.2,
  /** Seconds the ship takes to reach ~63% of a new steering velocity. Smaller = snappier. */
  SHIP_SMOOTH_S: 0.09,
  /** Collision box is this fraction of the drawn chassis, so grazing the art is not a hit. */
  HITBOX_FORGIVE: 0.85,
  /** Extra distance around the hit box that counts as a near miss (world units). */
  NEAR_MISS_BAND: 0.035,
  /** Seconds of invulnerability after a hit. */
  INVULN_S: 1.5,
  /** DSN signal drop on a hit, and how fast it climbs back toward hull / maxHull. */
  SIGNAL_HIT_DIP: 0.25,
  SIGNAL_RECOVER_PER_S: 0.12,

  /** Distance (as a fraction of world width) at which a base antenna starts a scan. */
  BASE_SCAN_RANGE: 0.62,
  /** Where the scanned body parks on screen, as a fraction of world width. */
  TARGET_PARK_X: 0.68,
  /** Target drift speed as a fraction of the asteroid speed, and its speed when leaving. */
  TARGET_APPROACH_SPEED: 0.5,
  TARGET_EXIT_SPEED: 0.35,
  /** Real seconds to hold on the final scan (toast visible) before Mission Complete. */
  COMPLETE_DELAY_S: 1.7,
  /** Real seconds between hull 0 and the Signal Lost screen (time to see the hit). */
  LOSS_DELAY_S: 0.9,

  /** Asteroid radii (world units). */
  ROCK_SMALL: 0.03,
  ROCK_MEDIUM: 0.05,
  ROCK_LARGE: 0.075,
  /** Half-height of the guaranteed free lane = ship half-height + this. */
  LANE_PADDING: 0.075,
  /** Fraction of the ship's slowest travel between waves the free lane may shift. */
  LANE_SHIFT_FRACTION: 0.45,
} as const;

// ── State shapes ─────────────────────────────────────────────────────────────

export interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Visible radius in world units. */
  r: number;
  rot: number;
  spin: number;
  /** Index into the art's shape list. */
  shape: number;
  /** Already counted as a near miss. */
  grazed: boolean;
  /** Already damaged the ship (it can still drift through). */
  hit: boolean;
}

export interface ShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Chassis collision half-size in world units (already forgiving). */
  halfW: number;
  halfH: number;
  /** Seconds of invulnerability left. */
  invuln: number;
}

export type TargetState = 'incoming' | 'scanning' | 'leaving';

export interface TargetBody {
  /** Body id from celestialBodies.ts, e.g. 'titan'. */
  id: string;
  /** Display and typed name, e.g. 'Titan'. */
  name: string;
  x: number;
  y: number;
  /** Diameter in world units. */
  size: number;
  state: TargetState;
  /** The scan has been requested from the router; don't ask again. */
  triggered: boolean;
}

export type RunStatus = 'flying' | 'finishing' | 'dying' | 'complete' | 'lost';

export type SimEvent =
  | { type: 'targetSpawned'; id: string }
  | { type: 'scanTrigger'; id: string; name: string }
  | { type: 'hit'; hull: number; maxHull: number }
  | { type: 'nearMiss'; pan: number }
  | { type: 'hullCritical' }
  | { type: 'complete' }
  | { type: 'lost'; cause: string };

export interface FlightInput {
  /** Steering from InputRouter.getMovement(): each axis -1..1, zero while movement is locked. */
  move: { x: number; y: number };
  /** Router phase. The sim pauses spawning and damage during SCAN. */
  phase: 'APPROACH' | 'SCAN' | 'RESUME';
}

/** Totals the Outcome screens need (matches FlightStats in useOutcomeStore). */
export interface RunStats {
  hull: number;
  maxHull: number;
  hullHits: number;
  nearMisses: number;
  asteroidsDodged: number;
  flightSeconds: number;
}
