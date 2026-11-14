/**
 * extents.ts — Measures the outline of a part from its path data.
 *
 * The arena margins and the Assembly preview framing need to know how far each drawn part reaches, so
 * a tall antenna or a wide wing is never pushed off the screen. Rather than keep a table of sizes by
 * hand (which goes stale whenever the art changes), this reads the same path strings that are drawn.
 *
 * It understands the commands the part art uses: M, L, H, V, Z (absolute) and the relative arc `a` in
 * its "full circle from two half-arcs" form. Stroke width is added around stroked shapes.
 */

import type { ShapeDef } from './paths';

export interface Extent {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const TOKEN = /([MLHVZAmlhvzaA])|(-?\d*\.?\d+(?:e-?\d+)?)/g;

function grow(e: Extent, x: number, y: number, pad = 0): void {
  if (x - pad < e.minX) e.minX = x - pad;
  if (x + pad > e.maxX) e.maxX = x + pad;
  if (y - pad < e.minY) e.minY = y - pad;
  if (y + pad > e.maxY) e.maxY = y + pad;
}

/** The bounding box of one path string, padded by `pad` on every side. */
export function pathExtent(d: string, pad = 0): Extent {
  const e: Extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const tokens = d.match(TOKEN) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  const num = (): number => Number(tokens[i++]);
  const isCmd = (t: string | undefined): boolean => t !== undefined && /^[A-Za-z]$/.test(t);

  while (i < tokens.length) {
    if (isCmd(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case 'M':
      case 'L':
        x = num();
        y = num();
        grow(e, x, y, pad);
        if (cmd === 'M') cmd = 'L'; // further pairs after a move are lines
        break;
      case 'H':
        x = num();
        grow(e, x, y, pad);
        break;
      case 'V':
        y = num();
        grow(e, x, y, pad);
        break;
      case 'a': {
        // a rx ry rotation large sweep dx dy. Used in pairs to draw a full circle, so the arc's two
        // endpoints are opposite ends of a diameter.
        i += 5;
        const dx = num();
        const dy = num();
        const cx = x + dx / 2;
        const cy = y + dy / 2;
        const r = Math.hypot(dx, dy) / 2;
        grow(e, cx - r, cy - r, pad);
        grow(e, cx + r, cy + r, pad);
        x += dx;
        y += dy;
        break;
      }
      case 'Z':
      case 'z':
        break;
      default:
        i++; // an unsupported command: skip it rather than loop forever
    }
  }
  return e;
}

/** The bounding box of a whole part. Stroked shapes add half their stroke width. */
export function shapesExtent(shapes: readonly ShapeDef[]): Extent {
  const total: Extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const s of shapes) {
    const pad = s.stroke ? (s.sw ?? 1) / 2 : 0;
    const e = pathExtent(s.d, pad);
    if (!Number.isFinite(e.minX)) continue;
    total.minX = Math.min(total.minX, e.minX);
    total.maxX = Math.max(total.maxX, e.maxX);
    total.minY = Math.min(total.minY, e.minY);
    total.maxY = Math.max(total.maxY, e.maxY);
  }
  return total;
}
