/**
 * stagger.ts — The "hit reaction": how the ship reels and the screen shakes after an asteroid strikes.
 *
 * This is purely visual. It never touches the simulation (collisions, hull, invulnerability), so the
 * fairness guarantees are unaffected. `computeStagger(age, power)` returns offsets in plain units
 * (about -2..2); the Explore screen scales them to pixels.
 *
 *   ship   a quick knock-back that eases out, plus a jitter and a rotational wobble that die away
 *   shake  a short screen shake that settles faster than the ship
 *
 * `age` is real seconds since the hit; after STAGGER_SECONDS everything is exactly zero.
 * `power` is 1 for a normal hit and larger for the hit that destroys the ship.
 */

export const STAGGER_SECONDS = 0.6;

/** The knock-back snaps in over this long (so the ship is shoved, not teleported). */
const SNAP_SECONDS = 0.07;

export interface Stagger {
  /** Ship offset: negative x is knocked back (left), in stagger units. */
  shipX: number;
  shipY: number;
  /** Ship tilt, in stagger units (the screen scales it to radians). */
  rot: number;
  /** Screen shake offsets, in stagger units. */
  shakeX: number;
  shakeY: number;
}

export const NO_STAGGER: Stagger = Object.freeze({ shipX: 0, shipY: 0, rot: 0, shakeX: 0, shakeY: 0 });

export function computeStagger(age: number, power = 1): Stagger {
  if (!(age >= 0) || age >= STAGGER_SECONDS) return NO_STAGGER;

  const k = 1 - age / STAGGER_SECONDS; // 1 at the hit, 0 when it is over
  const settle = k * k;
  const snap = Math.sin(Math.min(age / SNAP_SECONDS, 1) * (Math.PI / 2));
  const recoil = -snap * k * k;

  // The ship's jitter eases in with the knock-back, so it is shoved rather than teleported. The screen
  // shake below starts at once: an impact should jolt the view.
  return {
    shipX: power * (recoil * 1.5 + Math.sin(age * 62) * 0.55 * settle * snap),
    shipY: power * Math.cos(age * 51) * 0.8 * settle * snap,
    rot: power * Math.sin(age * 40 + 0.9) * 0.9 * settle * snap,
    shakeX: power * Math.sin(age * 83) * k * k * k,
    shakeY: power * Math.cos(age * 71 + 0.5) * k * k * k,
  };
}
