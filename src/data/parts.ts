/**
 * parts.ts — modular satellite parts (Assembly screen, PRD 6.3 / 7.6).
 *
 * Four slots, three options each. Option 2 in every slot is the default and
 * matches the parts installed in the reference build (mass / power / type).
 * Mass and power for the other options are design values (`source: 'design'`).
 * All gameplay numbers are initial tuning values to be validated in playtests.
 */

export type PartSlot = 'body' | 'antenna' | 'laser' | 'thruster';

/** Order the slots are shown in the Parts panel of the reference build. */
export const PART_SLOTS: readonly PartSlot[] = ['antenna', 'laser', 'body', 'thruster'];

export const PART_SLOT_LABELS: Record<PartSlot, string> = {
  antenna: 'Antenna',
  laser: 'Laser',
  body: 'Body',
  thruster: 'Thruster',
};

/** Short description under each slot title, as in the reference build. */
export const PART_SLOT_DESCRIPTIONS: Record<PartSlot, string> = {
  antenna: 'Deep-space communication array',
  laser: 'Surface mapping & rangefinder',
  body: 'Avionics and instrument housing',
  thruster: 'Precision orbital maneuvering',
};

interface PartBase {
  id: string;
  name: string;
  /** Text shown next to the mass/power readout, e.g. 'X-BAND', 'LiDAR'. */
  typeLabel: string;
  massKg: number;
  powerW: number;
  /** Total stars needed before the part can be chosen (P1, see ENFORCE_PART_UNLOCKS). */
  unlockStars: number;
  /** 'reference' = values shown in the reference build; 'design' = set by design. */
  source: 'reference' | 'design';
}

export interface BodyPart extends PartBase {
  slot: 'body';
  /** Number of asteroid hits the satellite survives. */
  hull: number;
  /** Multiplier applied to thruster speed (heavier hulls are slower). */
  speedMultiplier: number;
}

export interface AntennaPart extends PartBase {
  slot: 'antenna';
  /** Multiplier on the distance at which a scan can start (1 = base range). */
  scanRangeMultiplier: number;
  /** Fractional bonus on scan score (0.1 = +10%). */
  scanScoreBonus: number;
}

export interface LaserPart extends PartBase {
  slot: 'laser';
  /** Typing errors allowed per scan before the quality bonus is lost. */
  freeErrors: number;
  beamColor: string;
}

export interface ThrusterPart extends PartBase {
  slot: 'thruster';
  /** Movement speed in screen heights per second. */
  speed: number;
  trailColor: string;
}

export interface PartBySlot {
  body: BodyPart;
  antenna: AntennaPart;
  laser: LaserPart;
  thruster: ThrusterPart;
}

export type AnyPart = PartBySlot[PartSlot];

/** MVP allows free choice of every option; flip to true for the P1 unlock system. */
export const ENFORCE_PART_UNLOCKS = false;

export const PARTS: { [S in PartSlot]: readonly PartBySlot[S][] } = {
  body: [
    {
      id: 'body-scout', slot: 'body', name: 'Scout', typeLabel: 'FLIGHT CORE',
      massKg: 150, powerW: 70, hull: 3, speedMultiplier: 1.0,
      unlockStars: 0, source: 'design',
    },
    {
      id: 'body-surveyor', slot: 'body', name: 'Surveyor', typeLabel: 'FLIGHT CORE',
      massKg: 185, powerW: 90, hull: 5, speedMultiplier: 0.95,
      unlockStars: 0, source: 'reference',
    },
    {
      id: 'body-bulwark', slot: 'body', name: 'Bulwark', typeLabel: 'FLIGHT CORE',
      massKg: 240, powerW: 110, hull: 7, speedMultiplier: 0.9,
      unlockStars: 10, source: 'design',
    },
  ],
  antenna: [
    {
      id: 'antenna-dish-s', slot: 'antenna', name: 'Dish-S', typeLabel: 'X-BAND',
      massKg: 12, powerW: 25, scanRangeMultiplier: 1.0, scanScoreBonus: 0,
      unlockStars: 0, source: 'design',
    },
    {
      id: 'antenna-dish-m', slot: 'antenna', name: 'Dish-M', typeLabel: 'X-BAND',
      massKg: 18, powerW: 35, scanRangeMultiplier: 1.2, scanScoreBonus: 0.1,
      unlockStars: 0, source: 'reference',
    },
    {
      id: 'antenna-phased-array', slot: 'antenna', name: 'Phased Array', typeLabel: 'KA-BAND',
      massKg: 26, powerW: 55, scanRangeMultiplier: 1.4, scanScoreBonus: 0.2,
      unlockStars: 10, source: 'design',
    },
  ],
  laser: [
    {
      id: 'laser-lidar-1', slot: 'laser', name: 'LiDAR-1', typeLabel: 'LiDAR',
      massKg: 9, powerW: 45, freeErrors: 0, beamColor: '#5fd4ff',
      unlockStars: 0, source: 'design',
    },
    {
      id: 'laser-lidar-2', slot: 'laser', name: 'LiDAR-2', typeLabel: 'LiDAR',
      massKg: 12, powerW: 60, freeErrors: 1, beamColor: '#37e6b0',
      unlockStars: 0, source: 'reference',
    },
    {
      id: 'laser-lidar-3', slot: 'laser', name: 'LiDAR-3', typeLabel: 'LiDAR',
      massKg: 16, powerW: 80, freeErrors: 2, beamColor: '#ffb347',
      unlockStars: 10, source: 'design',
    },
  ],
  thruster: [
    {
      id: 'thruster-cold-gas', slot: 'thruster', name: 'Cold Gas', typeLabel: 'PROPULSION',
      massKg: 28, powerW: 10, speed: 0.4, trailColor: '#9fb7c9',
      unlockStars: 0, source: 'design',
    },
    {
      id: 'thruster-ion', slot: 'thruster', name: 'Ion', typeLabel: 'PROPULSION',
      massKg: 34, powerW: 25, speed: 0.5, trailColor: '#4cc3ff',
      unlockStars: 0, source: 'reference',
    },
    {
      id: 'thruster-plasma', slot: 'thruster', name: 'Plasma', typeLabel: 'PROPULSION',
      massKg: 42, powerW: 40, speed: 0.6, trailColor: '#c58bff',
      unlockStars: 10, source: 'design',
    },
  ],
};

export type SatellitePartIds = { [S in PartSlot]: string };

export interface SatelliteBuild extends SatellitePartIds {
  /** Player-chosen satellite name, 1–16 characters (see validateSatelliteName). */
  name: string;
}

export const DEFAULT_PART_IDS: SatellitePartIds = {
  body: 'body-surveyor',
  antenna: 'antenna-dish-m',
  laser: 'laser-lidar-2',
  thruster: 'thruster-ion',
};

export const MAX_NAME_LENGTH = 16;
const NAME_PATTERN = /^[A-Za-z0-9 -]{1,16}$/;

export function createDefaultBuild(name = 'SAT-I'): SatelliteBuild {
  return { name, ...DEFAULT_PART_IDS };
}

/** Looks up a part by slot and id. */
export function getPart<S extends PartSlot>(slot: S, id: string): PartBySlot[S] | undefined {
  return (PARTS[slot] as readonly PartBySlot[S][]).find((p) => p.id === id);
}

export function isValidPartId(slot: PartSlot, id: unknown): id is string {
  return typeof id === 'string' && getPart(slot, id) !== undefined;
}

/** True when the part may be chosen given the player's total stars. */
export function isPartUnlocked(part: AnyPart, totalStars: number): boolean {
  return !ENFORCE_PART_UNLOCKS || totalStars >= part.unlockStars;
}

export interface NameValidation {
  valid: boolean;
  error?: string;
}

/** FR-ASM-03: 1–16 characters; letters, digits, spaces and hyphens only. */
export function validateSatelliteName(raw: string): NameValidation {
  const name = raw.trim();
  if (name.length === 0) return { valid: false, error: 'Enter a satellite name.' };
  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Use ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  if (!NAME_PATTERN.test(name)) {
    return { valid: false, error: 'Use letters, digits, spaces and hyphens only.' };
  }
  return { valid: true };
}

/** Removes characters the name field does not accept and caps the length. */
export function filterSatelliteNameInput(raw: string): string {
  return raw.replace(/[^A-Za-z0-9 -]/g, '').slice(0, MAX_NAME_LENGTH);
}

/** Repairs an untrusted build (for example from localStorage) into a valid one. */
export function sanitizeBuild(input: unknown, fallbackName: string): SatelliteBuild {
  const src = (typeof input === 'object' && input !== null ? input : {}) as Partial<SatelliteBuild>;
  const name =
    typeof src.name === 'string' && validateSatelliteName(src.name).valid
      ? src.name.trim()
      : fallbackName;
  return {
    name,
    body: isValidPartId('body', src.body) ? src.body : DEFAULT_PART_IDS.body,
    antenna: isValidPartId('antenna', src.antenna) ? src.antenna : DEFAULT_PART_IDS.antenna,
    laser: isValidPartId('laser', src.laser) ? src.laser : DEFAULT_PART_IDS.laser,
    thruster: isValidPartId('thruster', src.thruster) ? src.thruster : DEFAULT_PART_IDS.thruster,
  };
}

export interface ResolvedBuild {
  body: BodyPart;
  antenna: AntennaPart;
  laser: LaserPart;
  thruster: ThrusterPart;
}

export function resolveBuild(build: SatelliteBuild): ResolvedBuild {
  return {
    body: getPart('body', build.body) ?? getPart('body', DEFAULT_PART_IDS.body)!,
    antenna: getPart('antenna', build.antenna) ?? getPart('antenna', DEFAULT_PART_IDS.antenna)!,
    laser: getPart('laser', build.laser) ?? getPart('laser', DEFAULT_PART_IDS.laser)!,
    thruster: getPart('thruster', build.thruster) ?? getPart('thruster', DEFAULT_PART_IDS.thruster)!,
  };
}

export interface BuildStats {
  maxHull: number;
  /** Movement speed in screen heights per second (thruster speed x body multiplier). */
  moveSpeed: number;
  scanRangeMultiplier: number;
  scanScoreBonus: number;
  freeErrors: number;
  totalMassKg: number;
  totalPowerW: number;
  beamColor: string;
  trailColor: string;
}

export function computeBuildStats(build: SatelliteBuild): BuildStats {
  const { body, antenna, laser, thruster } = resolveBuild(build);
  return {
    maxHull: body.hull,
    moveSpeed: thruster.speed * body.speedMultiplier,
    scanRangeMultiplier: antenna.scanRangeMultiplier,
    scanScoreBonus: antenna.scanScoreBonus,
    freeErrors: laser.freeErrors,
    totalMassKg: body.massKg + antenna.massKg + laser.massKg + thruster.massKg,
    totalPowerW: body.powerW + antenna.powerW + laser.powerW + thruster.powerW,
    beamColor: laser.beamColor,
    trailColor: thruster.trailColor,
  };
}

/**
 * Movement speed of the slowest possible build. The spawner uses this to
 * guarantee that a collision-free path always exists (PRD 7.3).
 */
export function slowestPossibleSpeed(): number {
  const slowestThruster = Math.min(...PARTS.thruster.map((t) => t.speed));
  const slowestBody = Math.min(...PARTS.body.map((b) => b.speedMultiplier));
  return slowestThruster * slowestBody;
}

/** Fraction of the Integration Status bar that is filled (0..1). */
export function integrationProgress(build: SatelliteBuild): number {
  const installed = PART_SLOTS.filter((slot) => getPart(slot, build[slot]) !== undefined).length;
  return installed / PART_SLOTS.length;
}
