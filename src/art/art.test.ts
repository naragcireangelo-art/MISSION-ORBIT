/**
 * art.test.ts — Guards the satellite art: every part has art, the outlines are measured correctly,
 * the hitboxes are unchanged, and no build can be pushed partly off-screen by the arena margins.
 */

import { describe, expect, it } from 'vitest';
import { PARTS, type PartSlot } from '../data/parts';
import { arenaBounds } from '../engine/flightPhysics';
import { GAMEPLAY } from '../engine/flightTypes';
import { pathExtent, shapesExtent } from './extents';
import {
  FACETED_ANTENNA_ART,
  FACETED_BODY_ART,
  FACETED_LASER_ART,
  FACETED_THRUSTER_ART,
} from './faceted-paths';
import { BODY_ANCHORS } from './paths';
import { satelliteBounds, satelliteHitbox } from './satellite';

const ids = (slot: PartSlot): string[] => PARTS[slot].map((p) => p.id);

describe('part art', () => {
  it('has art for every part, and no art for a part that does not exist', () => {
    expect(Object.keys(FACETED_BODY_ART).sort()).toEqual(ids('body').sort());
    expect(Object.keys(FACETED_ANTENNA_ART).sort()).toEqual(ids('antenna').sort());
    expect(Object.keys(FACETED_LASER_ART).sort()).toEqual(ids('laser').sort());
    expect(Object.keys(FACETED_THRUSTER_ART).sort()).toEqual(ids('thruster').sort());
    expect(Object.keys(BODY_ANCHORS).sort()).toEqual(ids('body').sort());
  });

  it('keeps the laser lens and thruster ring on the part colours', () => {
    for (const art of Object.values(FACETED_LASER_ART)) {
      expect(art.shapes.some((s) => s.fill === '$beam' || s.stroke === '$beam')).toBe(true);
    }
    for (const art of Object.values(FACETED_THRUSTER_ART)) {
      expect(art.shapes.some((s) => s.fill === '$trail')).toBe(true);
    }
  });

  it('gives Plasma two flames and the other thrusters one', () => {
    expect(FACETED_THRUSTER_ART['thruster-cold-gas'].flames).toHaveLength(1);
    expect(FACETED_THRUSTER_ART['thruster-ion'].flames).toHaveLength(1);
    expect(FACETED_THRUSTER_ART['thruster-plasma'].flames).toHaveLength(2);
  });

  it('measures every outline as a finite box', () => {
    const all = [
      ...Object.values(FACETED_BODY_ART),
      ...Object.values(FACETED_ANTENNA_ART),
      ...Object.values(FACETED_LASER_ART).map((l) => l.shapes),
      ...Object.values(FACETED_THRUSTER_ART).map((t) => t.shapes),
    ];
    for (const shapes of all) {
      const e = shapesExtent(shapes);
      for (const v of [e.minX, e.maxX, e.minY, e.maxY]) expect(Number.isFinite(v)).toBe(true);
      expect(e.maxX).toBeGreaterThan(e.minX);
      expect(e.maxY).toBeGreaterThan(e.minY);
    }
  });
});

describe('outline measuring', () => {
  it('reads lines, relative arcs and stroke padding', () => {
    expect(pathExtent('M-2 -3 L4 5 Z')).toEqual({ minX: -2, maxX: 4, minY: -3, maxY: 5 });
    expect(pathExtent('M0 0 H10 V-4')).toEqual({ minX: 0, maxX: 10, minY: -4, maxY: 0 });
    // Two half-arcs make a circle of radius 2 centred on (0, 0).
    const c = pathExtent('M-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0');
    expect(c.minX).toBeCloseTo(-2);
    expect(c.maxX).toBeCloseTo(2);
    expect(c.minY).toBeCloseTo(-2);
    expect(c.maxY).toBeCloseTo(2);
    expect(shapesExtent([{ d: 'M0 0 L10 0', stroke: '#fff', sw: 2 }]).minY).toBeCloseTo(-1);
  });

  it('matches the numbers on the design sheet', () => {
    expect(shapesExtent(FACETED_BODY_ART['body-scout'])).toMatchObject({ minY: -49.5, maxY: 46, maxX: 34 });
    expect(shapesExtent(FACETED_BODY_ART['body-surveyor'])).toMatchObject({ minY: -61.5, maxY: 58, maxX: 40 });
    expect(shapesExtent(FACETED_BODY_ART['body-bulwark'])).toMatchObject({ minY: -55.5, maxY: 52, minX: -46, maxX: 46 });
    expect(shapesExtent(FACETED_LASER_ART['laser-lidar-3'].shapes).maxY).toBeCloseTo(14, 1);
    expect(shapesExtent(FACETED_ANTENNA_ART['antenna-dish-m']).minY).toBeCloseTo(-47.1, 1);
  });
});

describe('hitboxes and bounds', () => {
  it('keeps the chassis hitboxes the design sheet specifies', () => {
    const expected = { 'body-scout': [34, 18], 'body-surveyor': [40, 22], 'body-bulwark': [46, 31] } as const;
    for (const body of ids('body')) {
      const box = satelliteHitbox({ body, antenna: 'antenna-dish-s', laser: 'laser-lidar-1', thruster: 'thruster-ion' });
      expect([box.halfW, box.halfH]).toEqual(expected[body as keyof typeof expected]);
    }
  });

  it('never lets any of the 81 builds reach past the screen edge at its limits', () => {
    const aspect = 16 / 9;
    let checked = 0;
    for (const body of ids('body'))
      for (const antenna of ids('antenna'))
        for (const laser of ids('laser'))
          for (const thruster of ids('thruster')) {
            const parts = { body, antenna, laser, thruster };
            const b = satelliteBounds(parts, GAMEPLAY.SHIP_UNIT);
            const arena = arenaBounds(aspect, parts);
            const label = `${body}/${antenna}/${laser}/${thruster}`;
            expect(arena.yMin + b.top, `${label} top`).toBeGreaterThan(0);
            expect(arena.yMax + b.bottom, `${label} bottom`).toBeLessThan(1);
            expect(arena.xMin + b.left, `${label} left`).toBeGreaterThan(0);
            expect(arena.yMax, `${label} has room to move`).toBeGreaterThan(arena.yMin + 0.4);
            checked++;
          }
    expect(checked).toBe(81);
  });

  it('accounts for the tall Dish-M antenna on the Surveyor', () => {
    const tall = satelliteBounds({ body: 'body-surveyor', antenna: 'antenna-dish-m', laser: 'laser-lidar-1', thruster: 'thruster-ion' });
    const short = satelliteBounds({ body: 'body-surveyor', antenna: 'antenna-dish-s', laser: 'laser-lidar-1', thruster: 'thruster-ion' });
    expect(tall.top).toBeLessThan(short.top); // reaches higher
    expect(tall.top).toBeCloseTo(-22 - 47.1, 0);
  });
});
