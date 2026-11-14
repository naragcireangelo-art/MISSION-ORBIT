/**
 * flightSim.test.ts — Headless checks that the game is fair and the rules hold.
 *
 * The big one: a bot that can only press up / down / nothing (like a keyboard) flies the
 * SLOWEST possible build through every difficulty tier. If it cannot get through, the spawner is
 * breaking its "always a way through" promise. The bot sees only the visible asteroids, never the
 * spawner's secret lane.
 *
 * Run with `npm test`.
 */

import { describe, expect, it } from 'vitest';
import { MISSIONS, type MissionData, type Tier } from '../data/missions';
import { computeBuildStats, createDefaultBuild, type SatelliteBuild } from '../data/parts';
import { circleHitsShip } from './flightPhysics';
import { FlightSim } from './flightSim';
import type { FlightInput } from './flightTypes';

const DT = 1 / 60;
const ASPECT = 16 / 9;

function makeSim(build: SatelliteBuild, tier: Tier, seed: number, mission: MissionData = MISSIONS[5]): FlightSim {
  const m: MissionData = { ...mission, tier };
  return new FlightSim({
    mission: m,
    parts: { body: build.body, antenna: build.antenna, laser: build.laser, thruster: build.thruster },
    stats: computeBuildStats(build),
    aspect: ASPECT,
    seed,
  });
}

/** Heaviest body, weakest thruster and antenna: the hardest ship to fly. */
const SLOWEST: SatelliteBuild = {
  ...createDefaultBuild('TEST'),
  body: 'body-bulwark',
  thruster: 'thruster-cold-gas',
  antenna: 'antenna-dish-s',
  laser: 'laser-lidar-1',
};

/** Picks up / down / stay by checking which target heights are reachable without being hit. */
function botSteer(sim: FlightSim): number {
  const ship = sim.ship;
  const vmax = sim.stats.moveSpeed;
  const HORIZON = 1.5;
  const STEP = 1 / 20;
  const MARGIN = 0.018;
  let best = ship.y;
  let bestScore = -Infinity;

  for (let cy = 0.14; cy <= 0.86; cy += 0.02) {
    const dir = Math.sign(cy - ship.y);
    let safeFor = HORIZON;
    for (let t = 0; t <= HORIZON; t += STEP) {
      const travelled = Math.min(Math.abs(cy - ship.y), vmax * 0.85 * t);
      const probe = { ...ship, y: ship.y + dir * travelled };
      let hit = false;
      for (const a of sim.asteroids) {
        if (circleHitsShip(probe, a.x + a.vx * t, a.y + a.vy * t, a.r * 0.85, MARGIN)) {
          hit = true;
          break;
        }
      }
      if (hit) {
        safeFor = t;
        break;
      }
    }
    // Prefer paths that stay safe longest; among equals, the smallest move.
    const score = safeFor * 10 - Math.abs(cy - ship.y);
    if (score > bestScore) {
      bestScore = score;
      best = cy;
    }
  }
  const delta = best - ship.y;
  return Math.abs(delta) < 0.012 ? 0 : Math.sign(delta);
}

interface RunResult {
  status: string;
  hits: number;
  scanned: number;
  seconds: number;
  nearMisses: number;
}

/** Flies a whole mission. Scans take 3 real seconds of typing, at quarter speed. */
function flyMission(sim: FlightSim, maxSeconds = 600): RunResult {
  let phase: FlightInput['phase'] = 'APPROACH';
  let phaseTimer = 0;
  let steer = 0;
  for (let i = 0; i < Math.floor(maxSeconds / DT); i++) {
    const scale = phase === 'SCAN' ? 0.25 : 1;
    if (i % 3 === 0) steer = botSteer(sim); // a human reacts every ~50 ms, not every frame
    const move = { x: 0, y: phase === 'SCAN' ? 0 : steer };
    const events = sim.step(DT * scale, DT, { move, phase });
    for (const e of events) {
      if (e.type === 'scanTrigger') {
        phase = 'SCAN';
        phaseTimer = 3;
      }
    }
    if (phase === 'SCAN') {
      phaseTimer -= DT;
      if (phaseTimer <= 0) {
        sim.notifyScanComplete();
        phase = 'RESUME';
        phaseTimer = 0.6;
      }
    } else if (phase === 'RESUME') {
      phaseTimer -= DT;
      if (phaseTimer <= 0) phase = 'APPROACH';
    }
    if (sim.status === 'complete' || sim.status === 'lost') break;
  }
  return {
    status: sim.status,
    hits: sim.hullHits,
    scanned: sim.scanned.length,
    seconds: sim.flightSeconds,
    nearMisses: sim.nearMisses,
  };
}

describe('fairness', { timeout: 120_000 }, () => {
  for (const tier of [1, 2, 3, 4] as Tier[]) {
    it(`the slowest build can finish a tier ${tier} mission`, () => {
      const results: RunResult[] = [];
      for (let seed = 1; seed <= 4; seed++) results.push(flyMission(makeSim(SLOWEST, tier, seed)));
      for (const r of results) {
        expect(r.status).toBe('complete');
        expect(r.scanned).toBe(MISSIONS[5].targetIds.length);
      }
      // The bot is not perfect, but it should rarely be hit; if it often is, the field is unfair.
      const totalHits = results.reduce((s, r) => s + r.hits, 0);
      expect(totalHits).toBeLessThanOrEqual(results.length);
    });
  }
});

describe('rules', { timeout: 60_000 }, () => {
  it('is deterministic for a given seed', () => {
    const a = flyMission(makeSim(SLOWEST, 2, 7));
    const b = flyMission(makeSim(SLOWEST, 2, 7));
    expect(a).toEqual(b);
  });

  it('does not damage the ship during a scan', () => {
    const sim = makeSim(SLOWEST, 4, 3);
    // Park a rock right on the ship, then scan: no hit may happen.
    sim.asteroids.push({ id: 999, x: sim.ship.x, y: sim.ship.y, vx: 0, vy: 0, r: 0.08, rot: 0, spin: 0, shape: 0, grazed: false, hit: false });
    sim.step(DT, DT, { move: { x: 0, y: 0 }, phase: 'SCAN' });
    expect(sim.hull).toBe(sim.maxHull);
  });

  it('removes one hull per hit, then grants invulnerability', () => {
    const sim = makeSim(SLOWEST, 1, 1);
    sim.asteroids.push({ id: 1, x: sim.ship.x, y: sim.ship.y, vx: 0, vy: 0, r: 0.06, rot: 0, spin: 0, shape: 0, grazed: false, hit: false });
    const first = sim.step(DT, DT, { move: { x: 0, y: 0 }, phase: 'APPROACH' });
    expect(first.some((e) => e.type === 'hit')).toBe(true);
    expect(sim.hull).toBe(sim.maxHull - 1);
    sim.asteroids.push({ id: 2, x: sim.ship.x, y: sim.ship.y, vx: 0, vy: 0, r: 0.06, rot: 0, spin: 0, shape: 0, grazed: false, hit: false });
    sim.step(DT, DT, { move: { x: 0, y: 0 }, phase: 'APPROACH' });
    expect(sim.hull).toBe(sim.maxHull - 1);
  });

  it('loses when hull reaches zero', () => {
    const sim = makeSim(SLOWEST, 1, 1);
    let lost = false;
    for (let i = 0; i < 20 * 60 && !lost; i++) {
      // Keep dropping a rock on the ship the moment invulnerability ends.
      if (sim.ship.invuln <= 0) {
        sim.asteroids.push({ id: 100 + i, x: sim.ship.x, y: sim.ship.y, vx: 0, vy: 0, r: 0.06, rot: 0, spin: 0, shape: 0, grazed: false, hit: false });
      }
      lost = sim.step(DT, DT, { move: { x: 0, y: 0 }, phase: 'APPROACH' }).some((e) => e.type === 'lost');
    }
    expect(lost).toBe(true);
    expect(sim.status).toBe('lost');
  });

  it('asks for a scan once a target is in range, and never before the segment time', () => {
    const sim = makeSim(SLOWEST, 1, 1);
    let triggerAt = -1;
    for (let i = 0; i < 90 * 60 && triggerAt < 0; i++) {
      const events = sim.step(DT, DT, { move: { x: 0, y: 0 }, phase: 'APPROACH' });
      sim.hull = sim.maxHull; // ignore damage; only timing matters here
      if (events.some((e) => e.type === 'scanTrigger')) triggerAt = i * DT;
    }
    expect(triggerAt).toBeGreaterThan(sim.mission.segmentSeconds);
  });
});

describe('every real mission', { timeout: 300_000 }, () => {
  const DEFAULT = createDefaultBuild('TEST');
  for (const mission of MISSIONS) {
    it(`${mission.code} ${mission.spacecraft} can be finished by the slowest and the default build`, () => {
      for (const [label, build] of [['slowest', SLOWEST], ['default', DEFAULT]] as const) {
        const r = flyMission(makeSim(build, mission.tier, 11, mission));
        expect(r.status, `${mission.code} ${label}`).toBe('complete');
        expect(r.scanned, `${mission.code} ${label}`).toBe(mission.targetIds.length);
        // The bot is human-ish, not perfect: a couple of hits is fine, a pile of them is not.
        expect(r.hits, `${mission.code} ${label} hits`).toBeLessThanOrEqual(2);
      }
    });
  }
});
