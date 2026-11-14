/**
 * flightSim.ts — The rules of a Mission Orbit flight, with no DOM, React or canvas in it.
 *
 *   const sim = new FlightSim({ mission, parts, stats, aspect, seed });
 *   loop.addSystem('sim', (step) => {
 *     const events = sim.step(step.dt, step.realDt, { move: router.getMovement(), phase: router.getPhase() });
 *     // react to events: scanTrigger -> router.beginScan(name), hit -> sound, complete -> report ...
 *   }, 20);
 *   router.on('scanComplete', () => sim.notifyScanComplete());
 *
 * One flight is a series of segments, one per target:
 *   1. APPROACH   dodge waves of asteroids for `mission.segmentSeconds`
 *   2. the target body drifts in from the right
 *   3. when it is inside the antenna's range, a `scanTrigger` event fires (the screen calls
 *      router.beginScan): time slows, spawning stops, the ship is untouchable, movement is locked
 *   4. the player types the name; `notifyScanComplete()` sends the body away and the next segment
 *      begins. After the last target the run finishes with a `complete` event.
 * Hull 0 ends the run with a `lost` event.
 *
 * `dt` is game time (already slowed during scans); `realDt` ignores slow-mo. All numbers that
 * shape difficulty are in flightTypes.ts and data/missions.ts.
 */

import { asteroidHitRadius } from '../art/asteroids';
import type { SatelliteParts } from '../art/satellite';
import { getBody } from '../data/celestialBodies';
import { DIFFICULTY_RAMP, getTierConfig, type MissionData } from '../data/missions';
import { slowestPossibleSpeed, type BuildStats } from '../data/parts';
import { arenaBounds, circleHitsShip, createShip, stepShip, type ArenaBounds } from './flightPhysics';
import {
  GAMEPLAY,
  type Asteroid,
  type FlightInput,
  type RunStats,
  type RunStatus,
  type ShipState,
  type SimEvent,
  type TargetBody,
} from './flightTypes';
import { asteroidSpeed, createRng, Spawner, type Rng, type SpawnContext } from './spawner';

export interface FlightSimOptions {
  mission: MissionData;
  parts: SatelliteParts;
  stats: BuildStats;
  /** World width: canvas width / canvas height. */
  aspect: number;
  seed: number;
}

export class FlightSim {
  readonly mission: MissionData;
  readonly parts: SatelliteParts;
  readonly stats: BuildStats;

  aspect: number;
  ship: ShipState;
  asteroids: Asteroid[] = [];
  target: TargetBody | null = null;

  hull: number;
  readonly maxHull: number;
  /** DSN signal strength 0..1: dips on a hit, recovers toward hull / maxHull. */
  signal = 1;
  status: RunStatus = 'flying';
  /** Body ids scanned so far, in order. */
  scanned: string[] = [];
  hullHits = 0;
  nearMisses = 0;
  asteroidsDodged = 0;
  flightSeconds = 0;

  private spawner: Spawner;
  private rng: Rng;
  private bounds: ArenaBounds;
  private seed: number;
  private segmentTimer = 0;
  private endTimer = 0;
  private lossCause = '';
  private criticalSent = false;

  constructor(opts: FlightSimOptions) {
    this.mission = opts.mission;
    this.parts = opts.parts;
    this.stats = opts.stats;
    this.aspect = opts.aspect;
    this.seed = opts.seed;
    this.maxHull = opts.stats.maxHull;
    this.hull = this.maxHull;
    this.bounds = arenaBounds(this.aspect, this.parts);
    this.ship = createShip(this.aspect, this.parts);
    this.spawner = new Spawner(opts.seed);
    this.rng = createRng(opts.seed ^ 0x9e3779b9);
  }

  /** Restart the same level from the beginning (Retry). */
  reset(seed = this.seed): void {
    this.seed = seed;
    this.bounds = arenaBounds(this.aspect, this.parts);
    this.ship = createShip(this.aspect, this.parts);
    this.asteroids = [];
    this.target = null;
    this.hull = this.maxHull;
    this.signal = 1;
    this.status = 'flying';
    this.scanned = [];
    this.hullHits = 0;
    this.nearMisses = 0;
    this.asteroidsDodged = 0;
    this.flightSeconds = 0;
    this.segmentTimer = 0;
    this.endTimer = 0;
    this.criticalSent = false;
    this.spawner.reset(seed);
    this.rng = createRng(seed ^ 0x9e3779b9);
  }

  /** Window resized: keep the arena matching the new shape. */
  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.bounds = arenaBounds(aspect, this.parts);
  }

  getRunStats(): RunStats {
    return {
      hull: this.hull,
      maxHull: this.maxHull,
      hullHits: this.hullHits,
      nearMisses: this.nearMisses,
      asteroidsDodged: this.asteroidsDodged,
      flightSeconds: this.flightSeconds,
    };
  }

  /** The next body to scan, or undefined once everything is done. */
  nextTargetId(): string | undefined {
    return this.mission.targetIds[this.scanned.length];
  }

  /** Call when the router reports the name was typed. */
  notifyScanComplete(): void {
    const t = this.target;
    if (!t || t.state !== 'scanning') return;
    this.scanned.push(t.id);
    t.state = 'leaving';
    if (this.scanned.length >= this.mission.targetIds.length) {
      this.status = 'finishing';
      this.endTimer = GAMEPLAY.COMPLETE_DELAY_S;
    }
  }

  // ── The step ───────────────────────────────────────────────────────────────

  step(dt: number, realDt: number, input: FlightInput): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.status === 'complete' || this.status === 'lost') return events;
    this.flightSeconds += realDt;

    const scanning = input.phase === 'SCAN';
    const ctx = this.spawnContext();

    // Ship: steering is ignored once the run is ending, and the router already zeroes it in a scan.
    const steer = this.status === 'flying' && !scanning ? input.move : { x: 0, y: 0 };
    stepShip(this.ship, steer, this.stats.moveSpeed, dt, this.bounds);
    this.ship.invuln = Math.max(0, this.ship.invuln - dt);

    // DSN signal climbs back toward the hull-based ceiling.
    const ceiling = this.maxHull > 0 ? this.hull / this.maxHull : 0;
    if (this.signal < ceiling) this.signal = Math.min(ceiling, this.signal + GAMEPLAY.SIGNAL_RECOVER_PER_S * dt);
    else this.signal = Math.min(this.signal, ceiling);

    if (this.status === 'flying') {
      this.stepTarget(dt, realDt, input, ctx, events);
      if (!scanning) {
        const fresh = this.spawner.update(dt, ctx, this.asteroids.length);
        if (fresh.length) this.asteroids.push(...fresh);
      }
    }
    this.stepAsteroids(dt, scanning, events);
    this.stepEnd(realDt, events);
    return events;
  }

  // ── Targets ────────────────────────────────────────────────────────────────

  private spawnContext(): SpawnContext {
    const n = this.mission.targetIds.length;
    const i = Math.min(this.scanned.length, Math.max(0, n - 1));
    return {
      tier: getTierConfig(this.mission),
      rampFactor: 1 + DIFFICULTY_RAMP * (n > 1 ? i / (n - 1) : 0),
      worldW: this.aspect,
      shipHalfH: this.ship.halfH,
      slowestSpeed: slowestPossibleSpeed(),
    };
  }

  private stepTarget(dt: number, realDt: number, input: FlightInput, ctx: SpawnContext, events: SimEvent[]): void {
    const speed = asteroidSpeed(ctx);

    if (!this.target) {
      const nextId = this.nextTargetId();
      if (!nextId) return;
      if (input.phase !== 'SCAN') this.segmentTimer += dt;
      if (this.segmentTimer >= this.mission.segmentSeconds) {
        this.target = this.makeTarget(nextId);
        events.push({ type: 'targetSpawned', id: nextId });
      }
      return;
    }

    const t = this.target;
    if (t.state === 'incoming') {
      t.x -= speed * GAMEPLAY.TARGET_APPROACH_SPEED * dt;
      if (!t.triggered && input.phase === 'APPROACH') {
        // A bigger antenna starts the scan earlier, but never before the body is on screen.
        const range = GAMEPLAY.BASE_SCAN_RANGE * this.aspect * this.stats.scanRangeMultiplier;
        const farthest = this.aspect + t.size * 0.25 - this.ship.x;
        if (t.x - this.ship.x <= Math.min(range, farthest)) {
          t.triggered = true;
          t.state = 'scanning';
          events.push({ type: 'scanTrigger', id: t.id, name: t.name });
        }
      }
    } else if (t.state === 'scanning') {
      // Glide to the parking spot using real time so it is visible even in slow motion.
      const park = this.aspect * GAMEPLAY.TARGET_PARK_X;
      t.x += (park - t.x) * (1 - Math.exp(-realDt * 2.2));
    } else {
      t.x -= (speed * GAMEPLAY.TARGET_EXIT_SPEED + 0.12) * dt;
      if (t.x < -t.size) {
        this.target = null;
        this.segmentTimer = 0;
      }
    }
  }

  private makeTarget(id: string): TargetBody {
    const body = getBody(id);
    const size = Math.min(0.66, Math.max(0.16, (body?.visualRadius ?? 0.5) * 0.6));
    return {
      id,
      name: body?.name ?? id,
      x: this.aspect + size / 2 + 0.05,
      y: 0.3 + this.rng() * 0.3,
      size,
      state: 'incoming',
      triggered: false,
    };
  }

  // ── Asteroids and damage ───────────────────────────────────────────────────

  private stepAsteroids(dt: number, scanning: boolean, events: SimEvent[]): void {
    const ship = this.ship;
    const vulnerable = this.status === 'flying' && !scanning && ship.invuln <= 0;
    const alive: Asteroid[] = [];

    for (const a of this.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.spin * dt;

      if (a.x < -a.r - 0.1 || a.y < -0.3 || a.y > 1.3) {
        if (!a.hit) this.asteroidsDodged++;
        continue;
      }

      if (vulnerable && !a.hit) {
        const hitR = asteroidHitRadius(a.shape, a.r);
        if (circleHitsShip(ship, a.x, a.y, hitR)) {
          this.takeHit(a, events);
        } else if (!a.grazed && circleHitsShip(ship, a.x, a.y, hitR, GAMEPLAY.NEAR_MISS_BAND)) {
          a.grazed = true;
          this.nearMisses++;
          events.push({ type: 'nearMiss', pan: Math.max(-1, Math.min(1, (a.x / this.aspect) * 2 - 1)) });
        }
      }
      alive.push(a);
    }
    this.asteroids = alive;
  }

  private takeHit(a: Asteroid, events: SimEvent[]): void {
    a.hit = true;
    this.hull = Math.max(0, this.hull - 1);
    this.hullHits++;
    this.ship.invuln = GAMEPLAY.INVULN_S;
    this.signal = Math.max(0, this.signal - GAMEPLAY.SIGNAL_HIT_DIP);
    events.push({ type: 'hit', hull: this.hull, maxHull: this.maxHull });

    if (this.hull <= 0) {
      const next = getBody(this.nextTargetId() ?? '')?.name ?? 'the target';
      this.lossCause = `A tumbling asteroid struck the bus on approach to ${next}. The high-gain antenna lost its lock on Earth.`;
      this.status = 'dying';
      this.endTimer = GAMEPLAY.LOSS_DELAY_S;
    } else if (this.hull === 1 && this.maxHull > 1 && !this.criticalSent) {
      this.criticalSent = true;
      events.push({ type: 'hullCritical' });
    }
  }

  // ── Ending ─────────────────────────────────────────────────────────────────

  private stepEnd(realDt: number, events: SimEvent[]): void {
    if (this.status !== 'finishing' && this.status !== 'dying') return;
    this.endTimer -= realDt;
    if (this.endTimer > 0) return;
    if (this.status === 'finishing') {
      this.status = 'complete';
      events.push({ type: 'complete' });
    } else {
      this.status = 'lost';
      events.push({ type: 'lost', cause: this.lossCause });
    }
  }
}
