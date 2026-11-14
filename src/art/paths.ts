/**
 * paths.ts — SVG path data for every satellite part. Pure data, no drawing code.
 *
 * All coordinates are in "satellite units" with the satellite's centre at (0, 0) and its nose
 * pointing right (+x), the way it flies in Explore. One unit is one CSS pixel at scale 1, so a
 * Surveyor body is about 80 x 44 px.
 *
 * Each part is drawn relative to a mount point on the body (see BODY_ANCHORS):
 *   thruster  at the rear, pointing left     antenna  on top, pointing up
 *   laser     under the nose, pointing right
 *
 * Colours: use a `PALETTE` value, or one of the tokens below that the drawer swaps for the part's
 * own colour: `'$beam'` (the laser's beamColor) and `'$trail'` (the thruster's trailColor).
 */

export const PALETTE = {
  hull: '#cfd9ea',
  hullShade: '#8fa3c6',
  dark: '#17233d',
  panel: '#2c4f9c',
  panelLine: '#6fa0ff',
  gold: '#e0b04a',
  accent: '#6ff3ff',
  rock: '#7d6f64',
  rockShade: '#51463f',
  rockLight: '#a8998c',
} as const;

export type ColorToken = '$beam' | '$trail';

export interface ShapeDef {
  /** SVG path data. */
  d: string;
  fill?: string;
  stroke?: string;
  /** Stroke width in satellite units (default 1). */
  sw?: number;
  opacity?: number;
}

export interface Anchor {
  x: number;
  y: number;
}

/** Where the other parts attach to each body, plus the body's size for hitbox maths. */
export interface BodyAnchors {
  rear: Anchor;
  antenna: Anchor;
  laser: Anchor;
  /** Half width and half height of the chassis (panels not included). */
  halfW: number;
  halfH: number;
}

export interface FlameDef {
  /** Where the flame starts (the nozzle exit), relative to the thruster mount. */
  x: number;
  y: number;
  /** Flame width at the nozzle and its length at full thrust. */
  w: number;
  len: number;
}

export interface ThrusterArt {
  shapes: readonly ShapeDef[];
  flames: readonly FlameDef[];
}

export interface LaserArt {
  shapes: readonly ShapeDef[];
  /** Muzzle position relative to the laser mount; the beam starts here. */
  tip: Anchor;
}

const H = PALETTE.hull;
const HS = PALETTE.hullShade;
const D = PALETTE.dark;

// ── Bodies ───────────────────────────────────────────────────────────────────

export const BODY_ART: Record<string, readonly ShapeDef[]> = {
  'body-scout': [
    // solar wings (behind the chassis)
    { d: 'M-20 -18 L-8 -18 L-2 -46 L-26 -46 Z', fill: PALETTE.panel, stroke: PALETTE.panelLine, sw: 1 },
    { d: 'M-20 18 L-8 18 L-2 46 L-26 46 Z', fill: PALETTE.panel, stroke: PALETTE.panelLine, sw: 1 },
    { d: 'M-23 -32 L-5 -32 M-24.5 -39 L-3.5 -39 M-23 32 L-5 32 M-24.5 39 L-3.5 39', stroke: PALETTE.panelLine, sw: 0.7, opacity: 0.7 },
    // chassis
    { d: 'M-34 -12 Q-34 -18 -28 -18 L22 -18 L34 -6 L34 6 L22 18 L-28 18 Q-34 18 -34 12 Z', fill: H, stroke: D, sw: 1.5 },
    { d: 'M-30 -3 L32 -3 L32 3 L-30 3 Z', fill: PALETTE.gold, opacity: 0.85 },
    { d: 'M4 -13 H18 a2 2 0 0 1 2 2 V-6 H2 V-11 a2 2 0 0 1 2 -2 Z', fill: PALETTE.accent, opacity: 0.8 },
    { d: 'M-34 6 H20', stroke: HS, sw: 0.8 },
  ],
  'body-surveyor': [
    { d: 'M-26 -22 L-8 -22 L0 -58 L-34 -58 Z', fill: PALETTE.panel, stroke: PALETTE.panelLine, sw: 1 },
    { d: 'M-26 22 L-8 22 L0 58 L-34 58 Z', fill: PALETTE.panel, stroke: PALETTE.panelLine, sw: 1 },
    { d: 'M-30 -34 L-4 -34 M-32 -46 L-2 -46 M-30 34 L-4 34 M-32 46 L-2 46', stroke: PALETTE.panelLine, sw: 0.7, opacity: 0.7 },
    { d: 'M-40 -14 L-34 -22 L24 -22 L40 -8 L40 8 L24 22 L-34 22 L-40 14 Z', fill: H, stroke: D, sw: 1.5 },
    { d: 'M-38 -4 L38 -4 L38 4 L-38 4 Z', fill: PALETTE.gold, opacity: 0.85 },
    { d: 'M2 -17 H12 a2 2 0 0 1 2 2 V-8 H0 V-15 a2 2 0 0 1 2 -2 Z M18 -17 H26 L31 -11 V-8 H18 Z', fill: PALETTE.accent, opacity: 0.8 },
    { d: 'M-30 -12 H18 M-30 12 H18', stroke: HS, sw: 0.8 },
    { d: 'M-34 -22 V22', stroke: HS, sw: 0.8 },
  ],
  'body-bulwark': [
    { d: 'M-34 -31 L-14 -31 L-10 -52 L-38 -52 Z', fill: PALETTE.panel, stroke: PALETTE.panelLine, sw: 1 },
    { d: 'M-34 31 L-14 31 L-10 52 L-38 52 Z', fill: PALETTE.panel, stroke: PALETTE.panelLine, sw: 1 },
    { d: 'M-36 -41 L-12 -41 M-36 41 L-12 41', stroke: PALETTE.panelLine, sw: 0.7, opacity: 0.7 },
    { d: 'M-46 -16 L-38 -26 L28 -26 L44 -10 L44 10 L28 26 L-38 26 L-46 16 Z', fill: H, stroke: D, sw: 1.5 },
    { d: 'M-30 -26 L20 -26 L26 -31 L-24 -31 Z M-30 26 L20 26 L26 31 L-24 31 Z', fill: HS, stroke: D, sw: 1 },
    { d: 'M-44 -4 L42 -4 L42 4 L-44 4 Z', fill: PALETTE.gold, opacity: 0.85 },
    { d: 'M4 -20 H18 L24 -14 V-8 H4 Z', fill: PALETTE.accent, opacity: 0.8 },
    { d: 'M-36 -14 H10 M-36 14 H10 M-24 -26 V26', stroke: HS, sw: 0.9 },
  ],
};

export const BODY_ANCHORS: Record<string, BodyAnchors> = {
  'body-scout': {
    rear: { x: -34, y: 0 }, antenna: { x: 14, y: -18 }, laser: { x: 14, y: 18 }, halfW: 34, halfH: 18,
  },
  'body-surveyor': {
    rear: { x: -40, y: 0 }, antenna: { x: 14, y: -22 }, laser: { x: 16, y: 22 }, halfW: 40, halfH: 22,
  },
  'body-bulwark': {
    rear: { x: -46, y: 0 }, antenna: { x: 12, y: -31 }, laser: { x: 14, y: 31 }, halfW: 46, halfH: 31,
  },
};

// ── Antennas (origin = mount point, pointing up) ─────────────────────────────

export const ANTENNA_ART: Record<string, readonly ShapeDef[]> = {
  'antenna-dish-s': [
    { d: 'M-1.5 0 H1.5 V-14 H-1.5 Z', fill: HS },
    { d: 'M-12 -22 Q0 -10 12 -22 Q0 -18 -12 -22 Z', fill: H, stroke: D, sw: 1 },
    { d: 'M0 -17 L0 -29', stroke: PALETTE.accent, sw: 1.2 },
    { d: 'M-2 -29 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0', fill: PALETTE.accent },
  ],
  'antenna-dish-m': [
    { d: 'M-2 0 H2 V-18 H-2 Z', fill: HS },
    { d: 'M-17 -28 Q0 -12 17 -28 Q0 -22 -17 -28 Z', fill: H, stroke: D, sw: 1.2 },
    { d: 'M-17 -28 Q0 -22 17 -28', stroke: HS, sw: 1 },
    { d: 'M0 -21 L0 -37', stroke: PALETTE.accent, sw: 1.4 },
    { d: 'M-2.5 -37 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0', fill: PALETTE.accent },
  ],
  'antenna-phased-array': [
    { d: 'M-2 0 H2 V-12 H-2 Z', fill: HS },
    { d: 'M-18 -28 L18 -28 L18 -12 L-18 -12 Z', fill: D, stroke: H, sw: 1.2 },
    { d: 'M-12 -28 V-12 M-6 -28 V-12 M0 -28 V-12 M6 -28 V-12 M12 -28 V-12 M-18 -20 H18', stroke: PALETTE.accent, sw: 0.7, opacity: 0.7 },
    { d: 'M-15 -25 h2 v2 h-2z M-3 -25 h2 v2 h-2z M9 -25 h2 v2 h-2z M-9 -17 h2 v2 h-2z M3 -17 h2 v2 h-2z M15 -17 h2 v2 h-2z', fill: PALETTE.accent },
  ],
};

// ── Lasers (origin = mount point under the nose) ─────────────────────────────

export const LASER_ART: Record<string, LaserArt> = {
  'laser-lidar-1': {
    shapes: [
      { d: 'M-5 0 H5 V8 H-5 Z', fill: HS, stroke: D, sw: 1 },
      { d: 'M5 3 H15 V7 H5 Z', fill: H, stroke: D, sw: 1 },
      { d: 'M15 3.2 H16.5 V6.8 H15 Z', fill: '$beam' },
    ],
    tip: { x: 16.5, y: 5 },
  },
  'laser-lidar-2': {
    shapes: [
      { d: 'M-6 0 H6 V7 H-6 Z', fill: HS, stroke: D, sw: 1 },
      { d: 'M-5 7 a5 5 0 0 0 10 0 Z', fill: H, stroke: D, sw: 1 },
      { d: 'M5 5 H18 V9 H5 Z', fill: H, stroke: D, sw: 1 },
      { d: 'M18 5.2 H19.5 V8.8 H18 Z', fill: '$beam' },
      { d: 'M-1 7 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0', fill: '$beam' },
    ],
    tip: { x: 19.5, y: 7 },
  },
  'laser-lidar-3': {
    shapes: [
      { d: 'M-7 0 H7 V8 H-7 Z', fill: HS, stroke: D, sw: 1 },
      { d: 'M-6 8 a6 6 0 0 0 12 0 Z', fill: H, stroke: D, sw: 1 },
      { d: 'M6 3 H20 V7 H6 Z M6 9 H20 V13 H6 Z', fill: H, stroke: D, sw: 1 },
      { d: 'M20 3.2 H21.5 V6.8 H20 Z M20 9.2 H21.5 V12.8 H20 Z', fill: '$beam' },
      { d: 'M-4 8 H4', stroke: '$beam', sw: 1.2 },
    ],
    tip: { x: 21.5, y: 8 },
  },
};

// ── Thrusters (origin = rear mount, pointing left) ───────────────────────────

export const THRUSTER_ART: Record<string, ThrusterArt> = {
  'thruster-cold-gas': {
    shapes: [
      { d: 'M0 -6 L-8 -8 L-8 8 L0 6 Z', fill: HS, stroke: D, sw: 1 },
      { d: 'M-8 -4 L-14 -6 L-14 6 L-8 4 Z', fill: H, stroke: D, sw: 1 },
      { d: 'M-4 -7 V7', stroke: D, sw: 0.8 },
    ],
    flames: [{ x: -14, y: 0, w: 9, len: 16 }],
  },
  'thruster-ion': {
    shapes: [
      { d: 'M0 -8 H-8 V8 H0 Z', fill: HS, stroke: D, sw: 1 },
      { d: 'M-8 -8 L-20 -12 L-20 12 L-8 8 Z', fill: H, stroke: D, sw: 1.2 },
      { d: 'M-20 -12 V12', stroke: '$trail', sw: 1.6 },
      { d: 'M-4 -8 V8', stroke: D, sw: 0.8 },
    ],
    flames: [{ x: -20, y: 0, w: 15, len: 28 }],
  },
  'thruster-plasma': {
    shapes: [
      { d: 'M0 -16 H-6 V16 H0 Z', fill: HS, stroke: D, sw: 1 },
      { d: 'M-6 -16 L-18 -19 L-18 -5 L-6 -8 Z', fill: H, stroke: D, sw: 1.2 },
      { d: 'M-6 16 L-18 19 L-18 5 L-6 8 Z', fill: H, stroke: D, sw: 1.2 },
      { d: 'M-18 -19 V-5 M-18 5 V19', stroke: '$trail', sw: 1.6 },
    ],
    flames: [
      { x: -18, y: -12, w: 11, len: 30 },
      { x: -18, y: 12, w: 11, len: 30 },
    ],
  },
};

// ── Asteroids ────────────────────────────────────────────────────────────────

/**
 * Hand-drawn rock outlines, each inside a unit circle (max radius about 1) so `r` pixels is
 * also a safe hit radius. `hit` is the radius, as a fraction of `r`, that Vinea's collision
 * code should use: slightly inside the visible edge so near-misses feel fair.
 */
export interface AsteroidShape {
  id: string;
  /** Outline as radius/angle points in a unit circle; scaled by r at draw time. */
  d: string;
  /** Crater positions (x, y, radius) in the same unit space. */
  craters: readonly (readonly [number, number, number])[];
  hit: number;
}

export const ASTEROID_SHAPES: readonly AsteroidShape[] = [
  {
    id: 'rock-a',
    d: 'M-0.9 -0.15 L-0.55 -0.7 L0.05 -0.95 L0.7 -0.6 L0.95 0.05 L0.6 0.75 L-0.1 0.92 L-0.7 0.6 Z',
    craters: [[-0.25, -0.2, 0.2], [0.35, 0.3, 0.14], [0.1, -0.55, 0.09]],
    hit: 0.82,
  },
  {
    id: 'rock-b',
    d: 'M-0.95 0.1 L-0.6 -0.55 L-0.05 -0.85 L0.55 -0.8 L0.98 -0.1 L0.7 0.55 L0.15 0.9 L-0.5 0.75 Z',
    craters: [[0.2, -0.25, 0.22], [-0.4, 0.2, 0.13], [0.5, 0.35, 0.1]],
    hit: 0.84,
  },
  {
    id: 'rock-c',
    d: 'M-0.8 -0.5 L-0.2 -0.9 L0.5 -0.75 L0.95 -0.2 L0.85 0.5 L0.3 0.9 L-0.45 0.8 L-0.95 0.15 Z',
    craters: [[-0.3, 0.05, 0.18], [0.4, -0.15, 0.12], [0.05, 0.55, 0.1]],
    hit: 0.8,
  },
  {
    id: 'rock-d',
    d: 'M-0.7 -0.7 L0.1 -0.95 L0.8 -0.45 L0.9 0.3 L0.4 0.85 L-0.35 0.9 L-0.9 0.35 L-0.95 -0.3 Z',
    craters: [[0.05, -0.1, 0.24], [-0.5, 0.35, 0.12], [0.5, 0.45, 0.09]],
    hit: 0.83,
  },
  {
    id: 'rock-e',
    d: 'M-1 0 L-0.5 -0.6 L0.2 -0.65 L0.9 -0.3 L0.8 0.4 L0.2 0.75 L-0.55 0.6 Z',
    craters: [[-0.1, -0.1, 0.17], [0.45, 0.05, 0.12]],
    hit: 0.8,
  },
];
