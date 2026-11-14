/**
 * asteroids.ts — Draws and measures the vector asteroids.
 *
 *   drawAsteroid(ctx, shapeIndex, { x, y, r, rot })
 *   asteroidHitRadius(shapeIndex, r)      use this in collision tests
 *
 * Five outlines (ASTEROID_SHAPES) cover the field; pick one per rock with
 * `shapeIndex = Math.floor(rng() * ASTEROID_SHAPE_COUNT)` when spawning. `r` is the rock's
 * radius in pixels, so spawner sizes map straight onto what the player sees.
 */

import { ASTEROID_SHAPES, PALETTE } from './paths';

export const ASTEROID_SHAPE_COUNT = ASTEROID_SHAPES.length;

export interface DrawAsteroidOptions {
  x: number;
  y: number;
  /** Radius in pixels. */
  r: number;
  /** Rotation in radians (spin it over time for a tumbling rock). */
  rot?: number;
  /** 0..1 opacity. */
  alpha?: number;
  /** Warm rim on the edge that "hit" the ship, for a collision flash. */
  highlight?: boolean;
}

const pathCache = new Map<string, Path2D>();

function pathFor(d: string): Path2D {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

function shapeAt(index: number) {
  const n = ASTEROID_SHAPE_COUNT;
  return ASTEROID_SHAPES[((Math.floor(index) % n) + n) % n];
}

export function drawAsteroid(ctx: CanvasRenderingContext2D, shapeIndex: number, opts: DrawAsteroidOptions): void {
  const { x, y, r, rot = 0, alpha = 1, highlight = false } = opts;
  const shape = shapeAt(shapeIndex);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(r, r);
  ctx.globalAlpha *= alpha;

  const path = pathFor(shape.d);
  // Light from the upper left: lit side, then body, then the dark side.
  const grad = ctx.createLinearGradient(-0.8, -0.8, 0.8, 0.8);
  grad.addColorStop(0, PALETTE.rockLight);
  grad.addColorStop(0.5, PALETTE.rock);
  grad.addColorStop(1, PALETTE.rockShade);
  ctx.fillStyle = grad;
  ctx.fill(path);

  // Craters: a dark pit with a light lip on its lower edge.
  for (const [cx, cy, cr] of shape.craters) {
    ctx.fillStyle = 'rgba(30, 24, 20, 0.45)';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(210, 195, 180, 0.35)';
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }

  ctx.lineJoin = 'round';
  ctx.strokeStyle = highlight ? PALETTE.accent : 'rgba(20, 16, 14, 0.85)';
  ctx.lineWidth = highlight ? 0.07 : 0.045;
  ctx.stroke(path);

  ctx.restore();
}

/** Collision radius in pixels for a rock of visible radius `r`. */
export function asteroidHitRadius(shapeIndex: number, r: number): number {
  return shapeAt(shapeIndex).hit * r;
}
