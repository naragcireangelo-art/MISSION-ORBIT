/**
 * sphereOrientation.ts — Free 3D orientation for the interactive planet.
 *
 * The orientation is a 3x3 rotation matrix `m` (row-major) that maps a view-space vector
 * (x right, y up, z toward the viewer) into the planet's own frame (y = its north pole,
 * longitude = atan2(x, z)). Dragging rotates the planet about the screen axes, so it can be
 * spun in any direction.
 */

export type Mat3 = Float64Array;

/** The fixed roll-then-lean pose that PlanetSphere draws by default. */
export function baseOrientation(tilt: number, elevation: number): Mat3 {
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const ce = Math.cos(elevation);
  const se = Math.sin(elevation);
  return Float64Array.of(
    ct, st, 0,
    -st * ce, ct * ce, se,
    st * se, -ct * se, ce,
  );
}

/**
 * Turns the planet in place. `yaw` swings the surface to the right (about the screen Y axis)
 * and `pitch` pulls it down (about the screen X axis), both in radians.
 */
export function rotateOrientation(m: Mat3, yaw: number, pitch: number): void {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  // R = Rx(pitch) · Ry(yaw), moves the surface in view space. The planet-from-view matrix
  // is then m · Rᵀ.
  const r = [
    cy, 0, sy,
    sp * sy, cp, -sp * cy,
    -cp * sy, sp, cp * cy,
  ];
  const a = m.slice();
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      m[i * 3 + j] = a[i * 3] * r[j * 3] + a[i * 3 + 1] * r[j * 3 + 1] + a[i * 3 + 2] * r[j * 3 + 2];
    }
  }
}

/** Removes the rounding drift that builds up after many small turns. */
export function orthonormalize(m: Mat3): void {
  for (let i = 0; i < 3; i++) {
    for (let k = 0; k < i; k++) {
      const dot = m[i * 3] * m[k * 3] + m[i * 3 + 1] * m[k * 3 + 1] + m[i * 3 + 2] * m[k * 3 + 2];
      m[i * 3] -= dot * m[k * 3];
      m[i * 3 + 1] -= dot * m[k * 3 + 1];
      m[i * 3 + 2] -= dot * m[k * 3 + 2];
    }
    const len = Math.hypot(m[i * 3], m[i * 3 + 1], m[i * 3 + 2]) || 1;
    m[i * 3] /= len;
    m[i * 3 + 1] /= len;
    m[i * 3 + 2] /= len;
  }
}

/** Where the planet's north pole points in view space. */
export function poleInView(m: Mat3): [number, number, number] {
  return [m[3], m[4], m[5]];
}

/** Screen-space look of a ring system lying in the planet's equatorial plane. */
export function ringPose(m: Mat3): { angle: number; ratio: number; flip: boolean } {
  const [nx, ny, nz] = poleInView(m);
  return {
    // Canvas rotation of the ring's long axis, which sits perpendicular to the projected pole.
    angle: Math.atan2(nx, ny),
    ratio: Math.abs(nz),
    // Looking from below the equator, the near half of the ring is the upper one.
    flip: nz < 0,
  };
}
