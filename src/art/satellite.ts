/**
 * satellite.ts — Draws the player's satellite on any Canvas 2D context.
 *
 *   drawSatellite(ctx, parts, { x, y, scale, t, thrust, beam })
 *
 * It is a plain function of `ctx` and numbers: no React, no store, no engine. The Assembly
 * preview and the Explore canvas layer both call it, so the ship looks identical in both.
 * The satellite faces right (+x). `x`/`y` is the centre of the body, in the same pixel space
 * as the ctx's current transform (CSS pixels once GameLoop has applied its DPR scale).
 *
 *   loop.addLayer('satellite', ({ ctx }) => drawSatellite(ctx, parts, { x, y, t, thrust }), 30);
 */

import {
  DEFAULT_PART_IDS,
  getPart,
  type PartSlot,
  type SatellitePartIds,
} from '../data/parts';
import {
  ANTENNA_ART,
  BODY_ANCHORS,
  BODY_ART,
  LASER_ART,
  PALETTE,
  THRUSTER_ART,
  type Anchor,
  type ShapeDef,
} from './paths';

export interface DrawSatelliteOptions {
  /** Centre of the body. Defaults to (0, 0). */
  x?: number;
  y?: number;
  /** Size multiplier (default 1 = a Surveyor body is about 80 px wide). */
  scale?: number;
  /** Clock in seconds, drives the flame flicker and the beam pulse. */
  t?: number;
  /** Engine output 0..1 (default 0.6). 0 = engine off. */
  thrust?: number;
  /** Draw the laser's rangefinder beam (use during a scan). */
  beam?: boolean;
  /** Tilt in radians, e.g. a few degrees while climbing or diving. */
  rotation?: number;
  /** 0..1 overall opacity; use a flicker of this for invulnerability frames. */
  alpha?: number;
}

export type SatelliteParts = Pick<SatellitePartIds, PartSlot>;

const pathCache = new Map<string, Path2D>();

function pathFor(d: string): Path2D {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

function resolveColor(color: string | undefined, beam: string, trail: string): string | undefined {
  if (color === '$beam') return beam;
  if (color === '$trail') return trail;
  return color;
}

function drawShapes(ctx: CanvasRenderingContext2D, shapes: readonly ShapeDef[], beam: string, trail: string): void {
  for (const s of shapes) {
    const path = pathFor(s.d);
    ctx.globalAlpha *= s.opacity ?? 1;
    const fill = resolveColor(s.fill, beam, trail);
    const stroke = resolveColor(s.stroke, beam, trail);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill(path);
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = s.sw ?? 1;
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    }
    ctx.globalAlpha /= s.opacity ?? 1;
  }
}

function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function drawFlame(
  ctx: CanvasRenderingContext2D,
  at: Anchor,
  w: number,
  len: number,
  color: string,
  thrust: number,
  t: number,
): void {
  if (thrust <= 0.02) return;
  const flicker = 0.86 + 0.14 * Math.sin(t * 38 + at.y * 0.7) + 0.05 * Math.sin(t * 91);
  const L = len * thrust * flicker;
  const halfW = (w / 2) * (0.7 + 0.3 * thrust);
  const grad = ctx.createLinearGradient(at.x, 0, at.x - L, 0);
  grad.addColorStop(0, withAlpha(color, 0.95));
  grad.addColorStop(0.5, withAlpha(color, 0.45));
  grad.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(at.x, at.y - halfW);
  ctx.quadraticCurveTo(at.x - L * 0.55, at.y - halfW * 0.8, at.x - L, at.y);
  ctx.quadraticCurveTo(at.x - L * 0.55, at.y + halfW * 0.8, at.x, at.y + halfW);
  ctx.closePath();
  ctx.fill();
  // hot white core
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(at.x, at.y - halfW * 0.4);
  ctx.lineTo(at.x - L * 0.32, at.y);
  ctx.lineTo(at.x, at.y + halfW * 0.4);
  ctx.closePath();
  ctx.fill();
}

/** Resolves ids to the art keys actually used, falling back to the default part. */
function artIds(parts: SatelliteParts): SatellitePartIds {
  const pick = (slot: PartSlot): string => (getPart(slot, parts[slot]) ? parts[slot] : DEFAULT_PART_IDS[slot]);
  return { body: pick('body'), antenna: pick('antenna'), laser: pick('laser'), thruster: pick('thruster') };
}

export function drawSatellite(
  ctx: CanvasRenderingContext2D,
  parts: SatelliteParts,
  opts: DrawSatelliteOptions = {},
): void {
  const { x = 0, y = 0, scale = 1, t = 0, thrust = 0.6, beam = false, rotation = 0, alpha = 1 } = opts;
  const ids = artIds(parts);
  const body = BODY_ART[ids.body];
  const anchors = BODY_ANCHORS[ids.body];
  const antenna = ANTENNA_ART[ids.antenna];
  const laser = LASER_ART[ids.laser];
  const thruster = THRUSTER_ART[ids.thruster];
  const laserPart = getPart('laser', ids.laser);
  const thrusterPart = getPart('thruster', ids.thruster);
  const beamColor = laserPart?.beamColor ?? PALETTE.accent;
  const trailColor = thrusterPart?.trailColor ?? PALETTE.accent;

  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= alpha;

  // Thruster and its flame sit behind the body.
  ctx.save();
  ctx.translate(anchors.rear.x, anchors.rear.y);
  ctx.globalCompositeOperation = 'lighter';
  for (const f of thruster.flames) drawFlame(ctx, { x: f.x, y: f.y }, f.w, f.len, trailColor, thrust, t);
  ctx.globalCompositeOperation = 'source-over';
  drawShapes(ctx, thruster.shapes, beamColor, trailColor);
  ctx.restore();

  drawShapes(ctx, body, beamColor, trailColor);

  ctx.save();
  ctx.translate(anchors.antenna.x, anchors.antenna.y);
  drawShapes(ctx, antenna, beamColor, trailColor);
  ctx.restore();

  ctx.save();
  ctx.translate(anchors.laser.x, anchors.laser.y);
  drawShapes(ctx, laser.shapes, beamColor, trailColor);
  if (beam) {
    const pulse = 0.55 + 0.3 * Math.sin(t * 9);
    ctx.strokeStyle = withAlpha(beamColor, pulse);
    ctx.lineWidth = 1.6;
    ctx.setLineDash([7, 6]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath();
    ctx.moveTo(laser.tip.x, laser.tip.y);
    ctx.lineTo(laser.tip.x + 150, laser.tip.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  ctx.restore();
}

/**
 * Collision box of the build, in pixels at `scale`: the chassis only (the solar wings and
 * antenna are left out on purpose so near-misses feel fair). Centred on the draw position.
 */
export function satelliteHitbox(parts: SatelliteParts, scale = 1): { halfW: number; halfH: number } {
  const a = BODY_ANCHORS[artIds(parts).body];
  return { halfW: a.halfW * scale, halfH: a.halfH * scale };
}

/** Rough full extent of the drawing (wings, antenna and flame included), for layout. */
export function satelliteBounds(parts: SatelliteParts, scale = 1): { left: number; right: number; top: number; bottom: number } {
  const ids = artIds(parts);
  const a = BODY_ANCHORS[ids.body];
  const flameLen = Math.max(...THRUSTER_ART[ids.thruster].flames.map((f) => Math.abs(f.x) + f.len));
  return {
    left: -(Math.abs(a.rear.x) + flameLen) * scale,
    right: (a.halfW + 6) * scale,
    top: -(a.halfH + 38) * scale,
    bottom: (a.halfH + 38) * scale,
  };
}
