/**
 * spawner.ts — Procedural asteroid waves that always leave a way through.
 *
 * Asteroids enter from the right edge in "waves" (one pattern each). Every wave keeps a free
 * lane open, and the lane only moves a limited distance from one wave to the next: no more than
 * the SLOWEST possible ship (heaviest body + weakest thruster) can cover in the time between
 * waves. So any build can survive every level; faster builds just have an easier time.
 *
 * Difficulty comes from the mission's tier (data/missions.ts TIER_CONFIG), scaled up a little
 * with each target by `rampFactor`. Everything random goes through the seeded `Rng`, so the same
 * seed always produces the same field (handy for tests and for Retry).
 */

import { ASTEROID_SHAPE_COUNT } from '../art/asteroids';
import type { TierConfig } from '../data/missions';
import { GAMEPLAY, type Asteroid } from './flightTypes';

// ── Seeded random numbers ────────────────────────────────────────────────────

export type Rng = () => number;

/** Small, fast, good-enough generator (mulberry32). Returns numbers in [0, 1). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Configuration ────────────────────────────────────────────────────────────

export interface SpawnContext {
  tier: TierConfig;
  /** 1 at the first target, rising to 1 + DIFFICULTY_RAMP at the last. */
  rampFactor: number;
  /** World width (aspect ratio). */
  worldW: number;
  /** Chassis half-size of the player's ship (world units). */
  shipHalfW: number;
  shipHalfH: number;
  /** Speed of the slowest possible build, in world units per second. */
  slowestSpeed: number;
}

/** Seconds an asteroid takes to cross the screen, at this ramp. */
export function crossingSeconds(ctx: SpawnContext): number {
  return ctx.tier.crossingTimeS / ctx.rampFactor;
}

/** Asteroid speed in world units per second. */
export function asteroidSpeed(ctx: SpawnContext): number {
  return ctx.worldW / crossingSeconds(ctx);
}

interface RockSpec {
  y: number;
  r: number;
  /** Extra distance behind the wave's leading edge (makes columns and streams). */
  xOffset?: number;
  vy?: number;
  spin?: number;
}

// ── Spawner ──────────────────────────────────────────────────────────────────

export class Spawner {
  private rng: Rng;
  private nextId = 1;
  private timer = 0;
  /** Centre of the guaranteed free lane. */
  private lane = 0.5;

  constructor(seed: number) {
    this.rng = createRng(seed);
    this.timer = 0.6; // a short breather before the first wave
  }

  /** Current lane centre (exposed for tests and debugging overlays). */
  getLane(): number {
    return this.lane;
  }

  /** Back to the start of a level; the same seed gives the same first waves. */
  reset(seed: number): void {
    this.rng = createRng(seed);
    this.nextId = 1;
    this.timer = 0.6;
    this.lane = 0.5;
  }

  /**
   * Advance by `dt` game seconds. Returns the asteroids that spawned this step (usually none).
   * `onScreen` is the current asteroid count, used to respect the tier's cap.
   */
  update(dt: number, ctx: SpawnContext, onScreen: number): Asteroid[] {
    this.timer -= dt;
    if (this.timer > 0) return [];

    const interval = ctx.tier.spawnIntervalS / ctx.rampFactor;
    const cap = Math.max(ctx.tier.maxAsteroids, 6);
    if (onScreen >= cap) {
      this.timer = 0.15; // try again shortly
      return [];
    }
    this.timer += interval;

    const gap = ctx.shipHalfH + GAMEPLAY.LANE_PADDING;
    this.moveLane(interval, gap, ctx);

    const pattern = this.pickPattern(ctx.tier.patterns);
    const specs = this.build(pattern, gap).slice(0, Math.max(1, cap - onScreen));
    const speed = asteroidSpeed(ctx);
    return specs.map((s) => this.toAsteroid(s, speed, ctx.worldW));
  }

  // ── Lane ───────────────────────────────────────────────────────────────────

  private moveLane(interval: number, gap: number, ctx: SpawnContext): void {
    // A column of rocks takes `passTime` to sweep past the ship; the ship can only relocate in the
    // time left over, plus the slack inside the lane itself (the lane is wider than the ship).
    const passTime = (2 * GAMEPLAY.ROCK_LARGE + 2 * ctx.shipHalfW) / asteroidSpeed(ctx);
    const freeTime = Math.max(0, interval - passTime);
    const slack = (gap - ctx.shipHalfH) * 0.6;
    const maxShift = ctx.slowestSpeed * freeTime * GAMEPLAY.LANE_SHIFT_FRACTION * 1.6 + slack;
    const shift = (this.rng() * 2 - 1) * maxShift;
    const lo = gap + 0.04;
    const hi = 1 - gap - 0.04;
    this.lane = Math.min(hi, Math.max(lo, this.lane + shift));
  }

  /** True when a rock centred at `y` with radius `r` stays out of the free lane. */
  private clearOfLane(y: number, r: number, gap: number): boolean {
    return Math.abs(y - this.lane) >= gap + r;
  }

  private pickPattern(patterns: readonly string[]): string {
    return patterns[Math.floor(this.rng() * patterns.length)] ?? 'single';
  }

  // ── Patterns ───────────────────────────────────────────────────────────────

  private build(pattern: string, gap: number): RockSpec[] {
    switch (pattern) {
      case 'pair':
        return this.pinch(gap, GAMEPLAY.ROCK_MEDIUM);
      case 'wide-gap':
        return this.pinch(gap + 0.1, GAMEPLAY.ROCK_MEDIUM);
      case 'cluster-gap':
        return this.column(gap, GAMEPLAY.ROCK_MEDIUM, 0);
      case 'rotating-belt':
        return this.column(gap, GAMEPLAY.ROCK_SMALL + 0.012, 2.2);
      case 'diagonal-stream':
        return this.stream(gap);
      case 'storm-wave':
        return this.storm(gap);
      case 'mixed-sizes':
        return this.mixed(gap);
      default:
        return this.single(gap);
    }
  }

  /** One rock somewhere outside the lane. */
  private single(gap: number): RockSpec[] {
    const r = GAMEPLAY.ROCK_MEDIUM;
    for (let i = 0; i < 16; i++) {
      const y = r + this.rng() * (1 - 2 * r);
      if (this.clearOfLane(y, r, gap)) return [{ y, r, spin: this.spin(1) }];
    }
    return [];
  }

  /** A rock above and one below the lane, squeezing it to `gap`. */
  private pinch(gap: number, r: number): RockSpec[] {
    const out: RockSpec[] = [];
    const top = this.lane - gap - r - this.rng() * 0.06;
    const bottom = this.lane + gap + r + this.rng() * 0.06;
    if (top >= r) out.push({ y: top, r, spin: this.spin(1) });
    if (bottom <= 1 - r) out.push({ y: bottom, r, spin: this.spin(1) });
    return out;
  }

  /** A full-height column of rocks with the free lane left open. */
  private column(gap: number, r: number, spin: number): RockSpec[] {
    const out: RockSpec[] = [];
    const step = r * 2.1;
    for (let y = r + this.rng() * 0.02; y <= 1 - r; y += step) {
      if (this.clearOfLane(y, r, gap)) out.push({ y, r, spin: this.spin(spin || 1) });
    }
    return out;
  }

  /** Three rocks in a line, drifting away from the lane so they never enter it. */
  private stream(gap: number): RockSpec[] {
    const r = GAMEPLAY.ROCK_SMALL + 0.01;
    const above = this.lane - gap - r - 0.05 > r + 0.06;
    const below = this.lane + gap + r + 0.05 < 1 - r - 0.06;
    const up = above && (!below || this.rng() < 0.5);
    if (!up && !below) return this.single(gap);
    const y0 = up ? this.lane - gap - r - 0.05 - this.rng() * 0.06 : this.lane + gap + r + 0.05 + this.rng() * 0.06;
    const vy = (up ? -1 : 1) * 0.045;
    return [0, 1, 2].map((i) => ({ y: y0, r, xOffset: i * 0.24, vy, spin: this.spin(1.4) }));
  }

  /** Two quick columns of small rocks. */
  private storm(gap: number): RockSpec[] {
    const out: RockSpec[] = [];
    const r = GAMEPLAY.ROCK_SMALL;
    for (let col = 0; col < 2; col++) {
      let placed = 0;
      for (let i = 0; i < 12 && placed < 3; i++) {
        const y = r + this.rng() * (1 - 2 * r);
        if (this.clearOfLane(y, r, gap)) {
          out.push({ y, r, xOffset: col * 0.34, spin: this.spin(2) });
          placed++;
        }
      }
    }
    return out;
  }

  /** A pinch of mixed-size rocks plus a stray. */
  private mixed(gap: number): RockSpec[] {
    const sizes = [GAMEPLAY.ROCK_SMALL, GAMEPLAY.ROCK_MEDIUM, GAMEPLAY.ROCK_LARGE];
    const r1 = sizes[Math.floor(this.rng() * 3)];
    const r2 = sizes[Math.floor(this.rng() * 3)];
    const out: RockSpec[] = [];
    const top = this.lane - gap - r1 - this.rng() * 0.05;
    const bottom = this.lane + gap + r2 + this.rng() * 0.05;
    if (top >= r1) out.push({ y: top, r: r1, spin: this.spin(1) });
    if (bottom <= 1 - r2) out.push({ y: bottom, r: r2, spin: this.spin(1) });
    return out.concat(this.single(gap).map((s) => ({ ...s, xOffset: 0.3 })));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private spin(scale: number): number {
    return (this.rng() * 2 - 1) * 1.2 * scale;
  }

  private toAsteroid(s: RockSpec, speed: number, worldW: number): Asteroid {
    return {
      id: this.nextId++,
      x: worldW + s.r + (s.xOffset ?? 0),
      y: s.y,
      vx: -speed,
      vy: s.vy ?? 0,
      r: s.r,
      rot: this.rng() * Math.PI * 2,
      spin: s.spin ?? 0,
      shape: Math.floor(this.rng() * ASTEROID_SHAPE_COUNT),
      grazed: false,
      hit: false,
    };
  }
}
