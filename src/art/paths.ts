/**
 * paths.ts — Shared art types, the palette, each body's mount points, and the asteroid outlines.
 *
 * The satellite part art itself is in faceted-paths.ts, in the same format. All coordinates are in
 * "satellite units" with the satellite's centre at (0, 0) and its nose pointing right (+x), the way it
 * flies in Explore. One unit is one CSS pixel at scale 1, so a Surveyor body is about 80 x 44 px.
 *
 * Each part is drawn relative to a mount point on the body (see BODY_ANCHORS):
 *   thruster  at the rear, pointing left     antenna  on top, pointing up
 *   laser     under the nose, pointing right
 *
 * Colours: use a literal colour, or one of the tokens below that the drawer swaps for the part's own
 * colour: `'$beam'` (the laser's beamColor) and `'$trail'` (the thruster's trailColor).
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

// ── Mount points ─────────────────────────────────────────────────────────────

/** Where the other parts attach to each body, and the chassis size used for the hitbox. */
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
