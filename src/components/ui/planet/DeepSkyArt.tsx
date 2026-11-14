/**
 * DeepSkyArt.tsx — Vector pictures for the targets that are not spheres:
 *   webb     the James Webb Space Telescope's gold, 18-segment hexagonal mirror (animated SVG)
 *   carina   the Carina Nebula's "Cosmic Cliffs" (procedural, drawn once on a canvas)
 *   stephan  Stephan's Quintet galaxy group (procedural, drawn once on a canvas)
 */

import { useEffect, useId, useRef } from 'react';
import type { CSSProperties } from 'react';

export type DeepSkyId = 'webb' | 'carina' | 'stephan';

export interface DeepSkyArtProps {
  art: DeepSkyId;
  /** Width and height in CSS pixels. */
  size: number;
  className?: string;
  label?: string;
}

// ── Webb mirror ──────────────────────────────────────────────────────────────

/** Axial hex coordinates of the 18 segments: the ring at distance 1 (6) and distance 2 (12). */
function webbSegments(): { q: number; r: number }[] {
  const out: { q: number; r: number }[] = [];
  for (const k of [1, 2]) {
    for (let q = -k; q <= k; q++) {
      for (let r = Math.max(-k, -q - k); r <= Math.min(k, -q + k); r++) {
        if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) === k) out.push({ q, r });
      }
    }
  }
  return out;
}

function hexPoints(cx: number, cy: number, radius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + radius * Math.cos(a)).toFixed(2)},${(cy + radius * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function WebbMirror({ size, className, label }: Omit<DeepSkyArtProps, 'art'>) {
  const uid = useId().replace(/:/g, '');
  const segments = webbSegments();
  const R = 17.5; // hexagon circumradius in a 200×200 viewBox
  const gap = 1.4;
  const centers = segments.map(({ q, r }) => ({
    x: 100 + R * Math.sqrt(3) * (q + r / 2),
    y: 100 + R * 1.5 * r,
  }));

  return (
    <svg
      className={`mo-webb${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.32" />
          <stop offset="55%" stopColor="#ffb347" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff0b8" />
          <stop offset="45%" stopColor="#f2b84b" />
          <stop offset="100%" stopColor="#b8741c" />
        </linearGradient>
        <linearGradient id={`${uid}-glint`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          {centers.map((c, i) => (
            <polygon key={i} points={hexPoints(c.x, c.y, R - gap)} />
          ))}
        </clipPath>
      </defs>

      <circle cx="100" cy="100" r="98" fill={`url(#${uid}-halo)`} />

      {/* Tripod struts holding the secondary mirror */}
      <g className="mo-webb__struts" stroke="#8d9bb8" strokeWidth="1.4" strokeLinecap="round" opacity="0.8">
        <line x1="100" y1="100" x2="100" y2="2" />
        <line x1="100" y1="100" x2="15" y2="149" />
        <line x1="100" y1="100" x2="185" y2="149" />
      </g>

      {/* 18 gold-coated beryllium segments */}
      {centers.map((c, i) => (
        <g
          key={i}
          className="mo-webb__seg"
          style={{ animationDelay: `${0.15 + i * 0.07}s`, transformOrigin: `${c.x}px ${c.y}px` } as CSSProperties}
        >
          <polygon
            points={hexPoints(c.x, c.y, R - gap)}
            fill={`url(#${uid}-gold)`}
            stroke="#fff3c4"
            strokeOpacity="0.55"
            strokeWidth="0.8"
          />
          <polygon points={hexPoints(c.x, c.y, (R - gap) * 0.62)} fill="#fff" opacity={0.07 + (i % 3) * 0.03} />
        </g>
      ))}

      {/* A slow glint that sweeps across the mirror */}
      <g clipPath={`url(#${uid}-clip)`}>
        <rect className="mo-webb__glint" x="-60" y="0" width="60" height="200" fill={`url(#${uid}-glint)`} />
      </g>

      {/* Secondary mirror */}
      <circle cx="100" cy="100" r="4.2" fill="#2a3552" stroke="#c7d2ee" strokeWidth="1" />
    </svg>
  );
}

// ── Canvas pictures ──────────────────────────────────────────────────────────

function hash(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function vnoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm2(x: number, y: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(x * f, y * f, seed + o * 13);
    total += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / total;
}

function rand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A Webb-style star: bright core with long diffraction spikes. */
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, spikes: boolean): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color.replace(/[\d.]+\)$/, '0.55)'));
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
  ctx.fill();
  if (!spikes) return;
  const len = radius * 9;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4; // four crossing lines = an 8-point spike pattern
    const long = i % 2 === 0 ? len : len * 0.55;
    const grad = ctx.createLinearGradient(x - Math.cos(a) * long, y - Math.sin(a) * long, x + Math.cos(a) * long, y + Math.sin(a) * long);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * long, y - Math.sin(a) * long);
    ctx.lineTo(x + Math.cos(a) * long, y + Math.sin(a) * long);
    ctx.stroke();
  }
}

function paintCarina(ctx: CanvasRenderingContext2D, N: number): void {
  const img = ctx.createImageData(N, N);
  const d = img.data;
  for (let py = 0; py < N; py++) {
    const y = py / N;
    for (let px = 0; px < N; px++) {
      const x = px / N;
      // The jagged "cliff" edge where the glowing cloud wall meets the open gas above it.
      const ridge = 0.52 + (fbm2(x * 4.5, 0.5, 5, 7) - 0.5) * 0.34 + (fbm2(x * 14, 3.1, 3, 21) - 0.5) * 0.06;
      const dist = y - ridge;
      let r: number;
      let g: number;
      let b: number;
      if (dist > 0) {
        // Dusty cliff face: dark rust with bright amber edges.
        const tex = fbm2(x * 9, y * 9, 5, 31);
        const edge = Math.exp(-dist * 22);
        r = 28 + tex * 120 + edge * 210;
        g = 14 + tex * 52 + edge * 120;
        b = 12 + tex * 28 + edge * 36;
        const shade = Math.max(0.25, 1 - dist * 1.1);
        r *= shade;
        g *= shade;
        b *= shade;
      } else {
        // Glowing gas above the ridge: deep blue to teal, warmed near the cliff.
        const tex = fbm2(x * 5, y * 6, 5, 43);
        const wisp = fbm2(x * 12 + 5, y * 14, 4, 57);
        const near = Math.exp(dist * 7);
        r = 6 + tex * 40 + near * 120;
        g = 12 + tex * 90 + wisp * 36 + near * 60;
        b = 36 + tex * 140 + wisp * 50 + near * 30;
      }
      const i = (py * N + px) * 4;
      d[i] = Math.min(255, r);
      d[i + 1] = Math.min(255, g);
      d[i + 2] = Math.min(255, b);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const rnd = rand(4242);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * N;
    const y = rnd() * N * 0.58;
    drawStar(ctx, x, y, 0.5 + rnd() * 0.9, rnd() > 0.7 ? 'rgba(255,214,170,1)' : 'rgba(200,225,255,1)', false);
  }
  for (const [sx, sy, sr] of [
    [0.22, 0.16, 2.4],
    [0.74, 0.3, 2.8],
    [0.5, 0.08, 2],
    [0.88, 0.12, 1.8],
  ] as const) {
    drawStar(ctx, sx * N, sy * N, sr, 'rgba(255,248,230,1)', true);
  }
}

function paintGalaxy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  angle: number,
  squash: number,
  armColor: [number, number, number],
  coreColor: [number, number, number],
  seed: number,
  arms: number,
): void {
  const rnd = rand(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1, squash);
  ctx.globalCompositeOperation = 'lighter';
  // Diffuse halo
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.25);
  halo.addColorStop(0, `rgba(${armColor.join(',')},0.28)`);
  halo.addColorStop(1, `rgba(${armColor.join(',')},0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.25, 0, Math.PI * 2);
  ctx.fill();
  // Spiral arms as scattered points along logarithmic spirals
  const count = Math.round(radius * 34);
  for (let i = 0; i < count; i++) {
    const t = Math.pow(rnd(), 0.8);
    const arm = Math.floor(rnd() * arms);
    const theta = t * 4.2 + (arm * Math.PI * 2) / arms + (rnd() - 0.5) * 0.5;
    const rr = radius * (0.1 + t * 0.9);
    const px = Math.cos(theta) * rr + (rnd() - 0.5) * radius * 0.12;
    const py = Math.sin(theta) * rr + (rnd() - 0.5) * radius * 0.12;
    const a = 0.1 + rnd() * 0.3;
    const c = rnd() > 0.82 ? [255, 240, 220] : armColor;
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    ctx.beginPath();
    ctx.arc(px, py, 0.4 + rnd() * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bright core
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.34);
  core.addColorStop(0, 'rgba(255,255,245,0.95)');
  core.addColorStop(0.3, `rgba(${coreColor.join(',')},0.7)`);
  core.addColorStop(1, `rgba(${coreColor.join(',')},0)`);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintStephan(ctx: CanvasRenderingContext2D, N: number): void {
  ctx.fillStyle = '#03050c';
  ctx.fillRect(0, 0, N, N);
  // Faint background haze
  const img = ctx.getImageData(0, 0, N, N);
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const n = fbm2((px / N) * 4, (py / N) * 4, 4, 63);
      const i = (py * N + px) * 4;
      img.data[i] = 3 + n * 14;
      img.data[i + 1] = 5 + n * 16;
      img.data[i + 2] = 12 + n * 30;
    }
  }
  ctx.putImageData(img, 0, 0);

  const rnd = rand(777);
  for (let i = 0; i < 110; i++) {
    drawStar(ctx, rnd() * N, rnd() * N, 0.4 + rnd() * 0.7, 'rgba(210,225,255,1)', false);
  }
  // The foreground spiral (NGC 7320) and the group's galaxies
  paintGalaxy(ctx, N * 0.3, N * 0.7, N * 0.2, -0.5, 0.62, [120, 170, 255], [255, 220, 160], 5, 2);
  paintGalaxy(ctx, N * 0.68, N * 0.3, N * 0.2, 0.7, 0.55, [255, 190, 130], [255, 235, 190], 9, 2);
  paintGalaxy(ctx, N * 0.5, N * 0.5, N * 0.11, 0.2, 0.9, [255, 215, 170], [255, 240, 210], 13, 2);
  paintGalaxy(ctx, N * 0.4, N * 0.38, N * 0.09, 1.1, 0.8, [255, 200, 160], [255, 240, 210], 17, 3);
  paintGalaxy(ctx, N * 0.78, N * 0.62, N * 0.07, -0.3, 0.7, [255, 205, 160], [255, 235, 200], 21, 2);
  drawStar(ctx, N * 0.12, N * 0.2, 2.2, 'rgba(255,248,230,1)', true);
  drawStar(ctx, N * 0.86, N * 0.84, 1.9, 'rgba(255,248,230,1)', true);
}

function CanvasArt({ art, size, className, label }: DeepSkyArtProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const N = Math.min(320, Math.max(160, Math.round(size * Math.min(window.devicePixelRatio || 1, 1.5))));
    canvas.width = N;
    canvas.height = N;
    if (art === 'carina') paintCarina(ctx, N);
    else paintStephan(ctx, N);
  }, [art, size]);
  return (
    <canvas
      ref={ref}
      className={`mo-deepsky mo-deepsky--${art}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export function DeepSkyArt({ art, size, className, label }: DeepSkyArtProps) {
  if (art === 'webb') return <WebbMirror size={size} className={className} label={label} />;
  return <CanvasArt art={art} size={size} className={className} label={label} />;
}

export default DeepSkyArt;
