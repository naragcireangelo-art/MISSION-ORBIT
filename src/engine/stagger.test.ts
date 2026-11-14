import { describe, expect, it } from 'vitest';
import { NO_STAGGER, STAGGER_SECONDS, computeStagger } from './stagger';

const values = (age: number, power = 1): number[] => Object.values(computeStagger(age, power));

describe('hit stagger', () => {
  it('is exactly zero before the hit and once it is over', () => {
    expect(computeStagger(-1)).toBe(NO_STAGGER);
    expect(computeStagger(Number.NaN)).toBe(NO_STAGGER);
    expect(computeStagger(STAGGER_SECONDS)).toBe(NO_STAGGER);
    expect(computeStagger(5)).toBe(NO_STAGGER);
  });

  it('shoves the ship back (to the left) and then lets it recover', () => {
    const early = computeStagger(0.07).shipX;
    expect(early).toBeLessThan(-0.5);
    // By the end it has come most of the way back.
    expect(Math.abs(computeStagger(STAGGER_SECONDS - 0.02).shipX)).toBeLessThan(0.05);
  });

  it('shoves the ship rather than teleporting it: the ship starts at rest', () => {
    const s = computeStagger(0);
    for (const v of [s.shipX, s.shipY, s.rot]) expect(Math.abs(v)).toBeLessThan(0.01);
  });

  it('jolts the screen at the instant of impact', () => {
    const s = computeStagger(0);
    expect(Math.hypot(s.shakeX, s.shakeY)).toBeGreaterThan(0.5);
  });

  it('decays: the second half is calmer than the first', () => {
    const peak = (from: number, to: number): number => {
      let m = 0;
      for (let a = from; a < to; a += 0.005) m = Math.max(m, ...values(a).map(Math.abs));
      return m;
    };
    expect(peak(STAGGER_SECONDS / 2, STAGGER_SECONDS)).toBeLessThan(peak(0, STAGGER_SECONDS / 2));
  });

  it('stays within a sane range and scales with power', () => {
    let normalMax = 0;
    let heavyMax = 0;
    for (let a = 0; a < STAGGER_SECONDS; a += 0.005) {
      normalMax = Math.max(normalMax, ...values(a, 1).map(Math.abs));
      heavyMax = Math.max(heavyMax, ...values(a, 1.6).map(Math.abs));
    }
    expect(normalMax).toBeLessThan(2);
    expect(heavyMax).toBeGreaterThan(normalMax * 1.5);
    expect(heavyMax).toBeLessThan(3.5);
  });

  it('is deterministic', () => {
    expect(computeStagger(0.2, 1.6)).toEqual(computeStagger(0.2, 1.6));
  });
});
