/**
 * backdrop.ts — The deep-space background of the Explore screen: a three-layer parallax starfield.
 *
 *   drawStarfield(ctx, width, height, scroll, t)
 *
 * `scroll` is "seconds of flight" and should advance with GAME time, so the stars slow down with
 * the world during a scan. `t` is real time, used only for the gentle twinkle.
 */

interface Star {
  /** Position as a fraction of the canvas (0..1). */
  x: number;
  y: number;
  /** Depth layer: 0 far, 1 mid, 2 near. */
  z: 0 | 1 | 2;
  /** Radius in px at height 800. */
  size: number;
  twinkle: number;
}

/** Layer speeds in screen heights per second of flight. */
const LAYER_SPEED = [0.012, 0.035, 0.085] as const;
const LAYER_ALPHA = [0.45, 0.7, 0.95] as const;

const STARS: readonly Star[] = (() => {
  let seed = 20211225;
  const rnd = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const out: Star[] = [];
  const counts = [90, 55, 26];
  for (let z = 0 as 0 | 1 | 2; z <= 2; z = (z + 1) as 0 | 1 | 2) {
    for (let i = 0; i < counts[z]; i++) {
      out.push({ x: rnd(), y: rnd(), z, size: 0.5 + z * 0.55 + rnd() * 0.5, twinkle: rnd() * Math.PI * 2 });
    }
    if (z === 2) break;
  }
  return out;
})();

export function drawStarfield(ctx: CanvasRenderingContext2D, width: number, height: number, scroll: number, t: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#02050d');
  sky.addColorStop(1, '#0a1329');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // A faint nebula glow so the background is not flat.
  const glow = ctx.createRadialGradient(width * 0.72, height * 0.3, 0, width * 0.72, height * 0.3, height * 0.9);
  glow.addColorStop(0, 'rgba(79, 140, 255, 0.09)');
  glow.addColorStop(1, 'rgba(79, 140, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const unit = height / 800;
  for (const s of STARS) {
    const drift = scroll * LAYER_SPEED[s.z] * height;
    const x = (((s.x * width - drift) % width) + width) % width;
    const y = s.y * height;
    const tw = 0.75 + 0.25 * Math.sin(t * 1.6 + s.twinkle);
    ctx.globalAlpha = LAYER_ALPHA[s.z] * tw;
    ctx.fillStyle = s.z === 2 ? '#dff4ff' : '#b9cdee';
    ctx.beginPath();
    ctx.arc(x, y, s.size * unit, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
