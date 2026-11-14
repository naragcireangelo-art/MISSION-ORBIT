import { describe, expect, it } from 'vitest';
import {
  baseOrientation,
  orthonormalize,
  poleInView,
  ringPose,
  rotateOrientation,
  type Mat3,
} from './sphereOrientation';

const apply = (m: Mat3, v: [number, number, number]): [number, number, number] => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

describe('sphereOrientation', () => {
  it('matches the fixed tilt and elevation used before dragging existed', () => {
    const tilt = -0.38;
    const elevation = 0.3;
    const m = baseOrientation(tilt, elevation);
    const [x, y, z] = [0.3, -0.4, Math.sqrt(1 - 0.09 - 0.16)];
    const xr = x * Math.cos(tilt) + y * Math.sin(tilt);
    const yr = -x * Math.sin(tilt) + y * Math.cos(tilt);
    const expected = [xr, yr * Math.cos(elevation) + z * Math.sin(elevation), z * Math.cos(elevation) - yr * Math.sin(elevation)];
    const got = apply(m, [x, y, z]);
    got.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 9));
  });

  it('carries the surface to the right when dragged right', () => {
    const m = baseOrientation(0.2, 0.1);
    const before = apply(m, [0, 0, 1]);
    const theta = 0.4;
    rotateOrientation(m, theta, 0);
    const moved = apply(m, [Math.sin(theta), 0, Math.cos(theta)]);
    moved.forEach((v, i) => expect(v).toBeCloseTo(before[i], 9));
  });

  it('carries the surface down when dragged down', () => {
    const m = baseOrientation(0, 0);
    const before = apply(m, [0, 0, 1]);
    const phi = 0.3;
    rotateOrientation(m, 0, phi);
    const moved = apply(m, [0, -Math.sin(phi), Math.cos(phi)]);
    moved.forEach((v, i) => expect(v).toBeCloseTo(before[i], 9));
  });

  it('undoes a drag with the opposite drag', () => {
    const m = baseOrientation(-0.32, 0.46);
    const start = m.slice();
    rotateOrientation(m, 0.7, 0);
    rotateOrientation(m, -0.7, 0);
    start.forEach((v, i) => expect(m[i]).toBeCloseTo(v, 9));
  });

  it('stays a proper rotation after many mixed drags', () => {
    const m = baseOrientation(0.1, 0.2);
    for (let i = 0; i < 2000; i++) {
      rotateOrientation(m, Math.sin(i) * 0.05, Math.cos(i * 1.7) * 0.05);
      if (i % 30 === 0) orthonormalize(m);
    }
    orthonormalize(m);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dot = m[i * 3] * m[j * 3] + m[i * 3 + 1] * m[j * 3 + 1] + m[i * 3 + 2] * m[j * 3 + 2];
        expect(dot).toBeCloseTo(i === j ? 1 : 0, 9);
      }
    }
    const det =
      m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
    expect(det).toBeCloseTo(1, 9);
  });

  it('tracks the pole and ring look from the matrix', () => {
    const m = baseOrientation(0, 0.5);
    const [, ny, nz] = poleInView(m);
    expect(ny).toBeCloseTo(Math.cos(0.5), 9);
    expect(nz).toBeCloseTo(Math.sin(0.5), 9);
    const pose = ringPose(m);
    expect(pose.ratio).toBeCloseTo(Math.sin(0.5), 9);
    expect(pose.flip).toBe(false);
    expect(ringPose(baseOrientation(0, -0.5)).flip).toBe(true);
  });
});
