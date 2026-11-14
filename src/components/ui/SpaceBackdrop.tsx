/**
 * SpaceBackdrop.tsx — Full-viewport animated deep-space canvas.
 *
 *   • 3D parallax starfield with twinkling, colour variety and mouse parallax
 *   • Hyperspace "warp" streaks: `initialWarp` for the arrival, `mode="warp"` for the jump
 *   • Optional drifting vector asteroids and occasional shooting stars
 *
 * Draws on a transparent canvas, so the nebula glow comes from the CSS behind it
 * (`.mo-backdrop` in missionControl.css).
 */

import { useEffect, useRef } from 'react';
import { useReducedMotion } from './hooks';

export interface SpaceBackdropProps {
  /** `idle` drifts calmly; `warp` accelerates into hyperspace streaks. */
  mode?: 'idle' | 'warp';
  /** Start at warp speed and slow to a drift (the arrival animation). */
  initialWarp?: boolean;
  /** Drifting vector asteroids. */
  asteroids?: boolean;
  /** Star count multiplier (1 = about 650 stars on a 1080p screen). */
  density?: number;
  /** Stars shift slightly with the mouse. */
  parallax?: boolean;
  className?: string;
}

interface Star {
  x: number;
  y: number;
  z: number;
  /** 0 white-blue, 1 warm, 2 cyan */
  tint: number;
  phase: number;
  twinkle: number;
}

interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  depth: number;
  shape: number[];
  craters: { a: number; d: number; r: number }[];
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const TINTS: [number, number, number][] = [
  [205, 225, 255],
  [255, 232, 196],
  [150, 240, 255],
];

function makeRock(w: number, h: number, scatter: boolean): Rock {
  const depth = 0.35 + Math.random() * 0.65;
  const n = 9 + Math.floor(Math.random() * 4);
  const shape: number[] = [];
  for (let i = 0; i < n; i++) shape.push(0.72 + Math.random() * 0.42);
  const craters = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => ({
    a: Math.random() * Math.PI * 2,
    d: Math.random() * 0.5,
    r: 0.1 + Math.random() * 0.16,
  }));
  const size = (14 + Math.random() * 40) * depth;
  return {
    x: scatter ? Math.random() * w : -size * 2 - Math.random() * w * 0.4,
    y: Math.random() * h,
    vx: 10 + Math.random() * 26 * depth,
    vy: (Math.random() - 0.5) * 8,
    size,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.6,
    depth,
    shape,
    craters,
  };
}

function drawRock(ctx: CanvasRenderingContext2D, r: Rock, blur: number): void {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.rot);
  ctx.globalAlpha = 0.45 + r.depth * 0.55 - blur * 0.2;
  const n = r.shape.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = r.size * r.shape[i];
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(-r.size, -r.size, r.size, r.size);
  g.addColorStop(0, '#4b566f');
  g.addColorStop(0.55, '#262d3f');
  g.addColorStop(1, '#10141f');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(150,200,255,0.4)';
  ctx.stroke();
  // craters
  ctx.fillStyle = 'rgba(8,10,18,0.55)';
  for (const c of r.craters) {
    ctx.beginPath();
    ctx.arc(Math.cos(c.a) * c.d * r.size, Math.sin(c.a) * c.d * r.size, c.r * r.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function SpaceBackdrop({
  mode = 'idle',
  initialWarp = false,
  asteroids = false,
  density = 1,
  parallax = true,
  className,
}: SpaceBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let rocks: Rock[] = [];
    const meteors: Meteor[] = [];
    let speed = initialWarp && !reduced ? 4.6 : 0.012;
    let mouseX = 0;
    let mouseY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let raf = 0;
    let last = performance.now();
    let nextMeteor = last + 3500 + Math.random() * 4000;
    let cancelled = false;

    const resize = (): void => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const count = Math.round(((w * h) / 3200) * density);
      stars = Array.from({ length: count }, () => ({
        x: (Math.random() * 2 - 1) * 1.3,
        y: (Math.random() * 2 - 1) * 1.3,
        z: 0.04 + Math.random() * 0.96,
        tint: Math.random() < 0.08 ? 2 : Math.random() < 0.2 ? 1 : 0,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.6 + Math.random() * 2.2,
      }));
      rocks = asteroids ? Array.from({ length: 9 }, () => makeRock(w, h, true)) : [];
    };

    const onMouse = (e: MouseEvent): void => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    };

    const render = (now: number, animate: boolean): void => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const warping = modeRef.current === 'warp';
      if (animate) {
        const target = warping ? 7 : 0.012;
        const k = warping ? 2.6 : 1.5;
        speed += (target - speed) * (1 - Math.exp(-dt * k));
        smoothX += (mouseX - smoothX) * (1 - Math.exp(-dt * 3));
        smoothY += (mouseY - smoothY) * (1 - Math.exp(-dt * 3));
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const focal = Math.max(w, h) * 0.34;
      const t = now / 1000;
      const streaking = speed > 0.35;

      for (const s of stars) {
        if (animate) {
          s.z -= speed * dt;
          if (s.z <= 0.03) {
            s.x = (Math.random() * 2 - 1) * 1.3;
            s.y = (Math.random() * 2 - 1) * 1.3;
            s.z = 1;
          }
        }
        const depth = 1 - s.z;
        const ox = parallax ? -smoothX * 34 * depth : 0;
        const oy = parallax ? -smoothY * 34 * depth : 0;
        const px = cx + (s.x / s.z) * focal + ox;
        const py = cy + (s.y / s.z) * focal + oy;
        if (px < -40 || px > w + 40 || py < -40 || py > h + 40) {
          if (animate && speed > 0.2) s.z = 1;
          continue;
        }
        const c = TINTS[s.tint];
        const twinkle = 0.72 + 0.28 * Math.sin(t * s.twinkle + s.phase);
        const fade = Math.min(1, depth * 6);
        const alpha = Math.min(1, (0.25 + depth * 0.85) * twinkle * fade);
        if (streaking) {
          const pz = Math.min(1.4, s.z + speed * 0.045);
          const qx = cx + (s.x / pz) * focal + ox;
          const qy = cy + (s.y / pz) * focal + oy;
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
          ctx.lineWidth = 0.6 + depth * 1.9;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          ctx.lineTo(px, py);
          ctx.stroke();
        } else {
          const r = 0.35 + depth * 1.35;
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
          if (r > 1.35 && alpha > 0.7) {
            ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.18})`;
            ctx.beginPath();
            ctx.arc(px, py, r * 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Drifting asteroids
      if (asteroids) {
        const warpBoost = speed > 0.35 ? speed * 220 : 0;
        for (let i = 0; i < rocks.length; i++) {
          const r = rocks[i];
          if (animate) {
            r.x += (r.vx + warpBoost * r.depth) * dt;
            r.y += r.vy * dt;
            r.rot += r.vr * dt;
            if (r.x - r.size * 1.6 > w + 40 || r.y < -120 || r.y > h + 120) {
              rocks[i] = makeRock(w, h, false);
              continue;
            }
          }
          drawRock(ctx, r, speed > 0.35 ? 1 : 0);
        }
      }

      // Shooting stars
      if (animate && !streaking && now > nextMeteor) {
        nextMeteor = now + 5000 + Math.random() * 6000;
        meteors.push({
          x: Math.random() * w * 0.8,
          y: Math.random() * h * 0.45,
          vx: 520 + Math.random() * 260,
          vy: 220 + Math.random() * 140,
          life: 1,
        });
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        if (animate) {
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.life -= dt * 1.6;
        }
        if (m.life <= 0) {
          meteors.splice(i, 1);
          continue;
        }
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.16, m.y - m.vy * 0.16);
        g.addColorStop(0, `rgba(255,255,255,${m.life})`);
        g.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 0.16, m.y - m.vy * 0.16);
        ctx.stroke();
      }
    };

    const loop = (now: number): void => {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) {
        last = now;
        return;
      }
      render(now, true);
    };

    resize();
    window.addEventListener('resize', resize);
    if (parallax) window.addEventListener('mousemove', onMouse, { passive: true });

    if (reduced) {
      render(performance.now(), false);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, [asteroids, density, parallax, initialWarp, reduced]);

  return <canvas ref={canvasRef} className={`mo-backdrop__canvas${className ? ` ${className}` : ''}`} aria-hidden="true" />;
}

export default SpaceBackdrop;
