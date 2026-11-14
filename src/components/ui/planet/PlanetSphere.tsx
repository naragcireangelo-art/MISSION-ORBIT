/**
 * PlanetSphere.tsx — A smooth, lit, rotating 3D planet or moon drawn on an HTML5 canvas.
 *
 * The surface comes from a procedural vector texture (planetTextures.ts) that is wrapped around a
 * sphere pixel by pixel, lit from the upper left, with an atmosphere rim, city lights and clouds
 * for Earth, and a full ring system for Saturn.
 *
 *   <PlanetSphere body="earth" size={360} />
 *   <PlanetSphere body="saturn" size={200} fps={24} />
 *
 * Optional `decorator.behind` / `decorator.front` draw extra things (like orbit paths and
 * satellites) so they can pass behind or in front of the planet.
 *
 * Pauses automatically when off-screen or when the tab is hidden, and shows a still frame when
 * the player prefers reduced motion.
 */

import { useEffect, useRef } from 'react';
import {
  smoothstep,
  SPHERE_STYLES,
  type PlanetStyle,
  type PlanetTexture,
  type SphereArtId,
} from './planetTextures';
import { loadPlanetTexture } from './textureLoader';
import { useReducedMotion } from '../hooks';
import {
  baseOrientation,
  orthonormalize,
  ringPose,
  rotateOrientation,
} from './sphereOrientation';

// ── Public types ─────────────────────────────────────────────────────────────

/** Everything a decorator needs to draw around the planet. Units are CSS pixels. */
export interface SphereDrawContext {
  ctx: CanvasRenderingContext2D;
  /** Planet centre inside the canvas. */
  cx: number;
  cy: number;
  /** Planet radius. */
  radius: number;
  /** Seconds since the sphere started. */
  time: number;
  /** Axis roll of this planet (radians). */
  tilt: number;
}

export interface SphereDecorator {
  /** Drawn before the planet (appears behind it). */
  behind?: (d: SphereDrawContext) => void;
  /** Drawn after the planet (appears in front of it). */
  front?: (d: SphereDrawContext) => void;
}

export interface PlanetSphereProps {
  body: SphereArtId;
  /** Planet diameter in CSS pixels. */
  size: number;
  /** Multiplier on the planet's natural spin speed (0 freezes it). */
  spin?: number;
  /** Redraws per second (lower is cheaper). Default 30. */
  fps?: number;
  /** Soft atmosphere halo behind the planet. Default true. */
  glow?: boolean;
  /** Canvas size as a multiple of `size` — raise it when a decorator draws outside the disc. */
  pad?: number;
  decorator?: SphereDecorator;
  /** Starting rotation in radians. */
  startAngle?: number;
  className?: string;
  /** Accessible description. Omit for purely decorative spheres. */
  label?: string;
  /** Lets the player drag (or use the arrow keys) to turn the planet in any direction. */
  interactive?: boolean;
  /** Freeze on the current frame (e.g. while the sphere is being zoomed away). */
  paused?: boolean;
}

// ── Sphere geometry (computed once per size / tilt) ──────────────────────────

const LIGHT = (() => {
  const x = -0.55;
  const y = 0.38;
  const z = 0.74;
  const len = Math.sqrt(x * x + y * y + z * z);
  return { x: x / len, y: y / len, z: z / len };
})();

const INV_TWO_PI = 1 / (Math.PI * 2);
const AMBIENT = 0.05;

interface Geometry {
  size: number;
  count: number;
  /** Byte offset of each covered pixel in the output image. */
  offset: Int32Array;
  /** Longitude of the pixel before the planet's rotation is applied. */
  lon: Float32Array;
  /** Texture v coordinate (0 = north pole). */
  v: Float32Array;
  /** Lighting from the sun, 0..1. */
  shade: Float32Array;
  /** Edge-glow factor, 0..1. */
  rim: Float32Array;
  /** Pixel coverage (antialiasing at the limb), 0..1. */
  cover: Float32Array;
  /** View-space position of each pixel (interactive spheres only). */
  vx?: Float32Array;
  vy?: Float32Array;
  vz?: Float32Array;
  /** Longitude and v recomputed from the live orientation (interactive spheres only). */
  lonLive?: Float32Array;
  vLive?: Float32Array;
}

function buildGeometry(size: number, tilt: number, elevation: number, withView = false): Geometry {
  const half = size / 2;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const ce = Math.cos(elevation);
  const se = Math.sin(elevation);
  const limit = (1 + 1.6 / half) * (1 + 1.6 / half);

  const offset: number[] = [];
  const lon: number[] = [];
  const vv: number[] = [];
  const shade: number[] = [];
  const rim: number[] = [];
  const cover: number[] = [];
  const vxs: number[] = [];
  const vys: number[] = [];
  const vzs: number[] = [];

  for (let py = 0; py < size; py++) {
    const y = -((py + 0.5) - half) / half;
    for (let px = 0; px < size; px++) {
      const x = ((px + 0.5) - half) / half;
      const d2 = x * x + y * y;
      if (d2 > limit) continue;
      const dist = Math.sqrt(d2);
      const z = Math.sqrt(Math.max(0, 1 - d2));
      // Rotate into the planet's frame: roll (tilt), then lean the pole toward the viewer.
      const xr = x * ct + y * st;
      const yr = -x * st + y * ct;
      const yp = yr * ce + z * se;
      const zp = z * ce - yr * se;
      const lat = Math.asin(Math.max(-1, Math.min(1, yp)));
      const dot = x * LIGHT.x + y * LIGHT.y + z * LIGHT.z;

      offset.push((py * size + px) * 4);
      lon.push(Math.atan2(xr, zp));
      vv.push(0.5 - lat / Math.PI);
      shade.push(smoothstep(-0.1, 0.6, dot));
      rim.push(Math.pow(1 - z, 2.6));
      cover.push(Math.max(0, Math.min(1, (1 - dist) * half + 0.5)));
      if (withView) {
        vxs.push(x);
        vys.push(y);
        vzs.push(z);
      }
    }
  }
  return {
    size,
    count: offset.length,
    offset: Int32Array.from(offset),
    lon: Float32Array.from(lon),
    v: Float32Array.from(vv),
    shade: Float32Array.from(shade),
    rim: Float32Array.from(rim),
    cover: Float32Array.from(cover),
    ...(withView
      ? {
          vx: Float32Array.from(vxs),
          vy: Float32Array.from(vys),
          vz: Float32Array.from(vzs),
          lonLive: new Float32Array(offset.length),
          vLive: new Float32Array(offset.length),
        }
      : {}),
  };
}

/** Recomputes each pixel's longitude and v from the planet's current orientation. */
function applyOrientation(geo: Geometry, m: Float64Array): void {
  const { vx, vy, vz, lonLive, vLive } = geo;
  if (!vx || !vy || !vz || !lonLive || !vLive) return;
  for (let i = 0; i < geo.count; i++) {
    const x = vx[i];
    const y = vy[i];
    const z = vz[i];
    const px = m[0] * x + m[1] * y + m[2] * z;
    const py = m[3] * x + m[4] * y + m[5] * z;
    const pz = m[6] * x + m[7] * y + m[8] * z;
    lonLive[i] = Math.atan2(px, pz);
    vLive[i] = 0.5 - Math.asin(Math.max(-1, Math.min(1, py))) / Math.PI;
  }
}

// ── Per-frame sphere shading ─────────────────────────────────────────────────

function shadeSphere(
  out: ImageData,
  geo: Geometry,
  tex: PlanetTexture,
  style: PlanetStyle,
  rotation: number,
  cloudRotation: number,
): void {
  const lonA = geo.lonLive ?? geo.lon;
  const vA = geo.vLive ?? geo.v;
  const d = out.data;
  d.fill(0);
  const W = tex.width;
  const H = tex.height;
  const td = tex.data;
  const lights = tex.lights;
  const clouds = tex.clouds;
  const CW = tex.cloudWidth ?? 0;
  const CH = tex.cloudHeight ?? 0;
  const exposure = style.exposure ?? 1;
  const rimC = style.rimColor;
  const rimK = style.rim;

  for (let i = 0; i < geo.count; i++) {
    let u = (lonA[i] + rotation) * INV_TWO_PI + 0.5;
    u -= Math.floor(u);
    const fx = u * W - 0.5;
    const x0f = Math.floor(fx);
    const tx = fx - x0f;
    const xa = (x0f + W) % W;
    const xb = (xa + 1) % W;
    const fy = vA[i] * (H - 1);
    const y0 = fy | 0;
    const y1 = y0 + 1 < H ? y0 + 1 : H - 1;
    const ty = fy - y0;

    const i00 = (y0 * W + xa) * 4;
    const i10 = (y0 * W + xb) * 4;
    const i01 = (y1 * W + xa) * 4;
    const i11 = (y1 * W + xb) * 4;
    const w00 = (1 - tx) * (1 - ty);
    const w10 = tx * (1 - ty);
    const w01 = (1 - tx) * ty;
    const w11 = tx * ty;

    let r = td[i00] * w00 + td[i10] * w10 + td[i01] * w01 + td[i11] * w11;
    let g = td[i00 + 1] * w00 + td[i10 + 1] * w10 + td[i01 + 1] * w01 + td[i11 + 1] * w11;
    let b = td[i00 + 2] * w00 + td[i10 + 2] * w10 + td[i01 + 2] * w01 + td[i11 + 2] * w11;

    const shade = geo.shade[i];

    // Cloud layer (Earth), spun at its own rate.
    if (clouds) {
      let cu = (lonA[i] + cloudRotation) * INV_TWO_PI + 0.5;
      cu -= Math.floor(cu);
      const cx = Math.min(CW - 1, (cu * CW) | 0);
      const cy = Math.min(CH - 1, (vA[i] * CH) | 0);
      const c = (clouds[cy * CW + cx] / 255) * 0.88;
      r += (246 - r) * c;
      g += (248 - g) * c;
      b += (255 - b) * c;
    }

    const lit = (AMBIENT + (1 - AMBIENT) * shade) * exposure;
    r *= lit;
    g *= lit;
    b *= lit;

    // City lights glow on the night side.
    if (lights) {
      const lx = Math.min(W - 1, (u * W) | 0);
      const ly = Math.min(H - 1, Math.round(vA[i] * (H - 1)));
      const l = lights[ly * W + lx] / 255;
      if (l > 0) {
        const night = 1 - smoothstep(0, 0.22, shade);
        const k = l * night;
        r += 255 * k;
        g += 196 * k;
        b += 110 * k;
      }
    }

    // Atmosphere on the limb, stronger on the lit side.
    if (rimK > 0) {
      const k = rimK * geo.rim[i] * (0.18 + 0.82 * shade);
      r += rimC[0] * k;
      g += rimC[1] * k;
      b += rimC[2] * k;
    }

    const o = geo.offset[i];
    d[o] = r > 255 ? 255 : r;
    d[o + 1] = g > 255 ? 255 : g;
    d[o + 2] = b > 255 ? 255 : b;
    d[o + 3] = geo.cover[i] * 255;
  }
}

// ── Saturn's rings ───────────────────────────────────────────────────────────

/** Opacity and colour of the ring at radius `r` (in planet radii). */
function ringSample(r: number): { a: number; c: [number, number, number] } {
  const grain = 0.82 + 0.18 * Math.sin(r * 97) * Math.sin(r * 41 + 1.3);
  if (r < 1.24 || r > 2.27) return { a: 0, c: [0, 0, 0] };
  if (r < 1.53) return { a: 0.22 * grain, c: [150, 132, 108] }; // C ring
  if (r < 1.95) {
    const k = (r - 1.53) / 0.42; // B ring: brightest
    return { a: (0.7 + 0.25 * Math.sin(k * 9)) * grain, c: [226, 205, 165] };
  }
  if (r < 2.03) return { a: 0.06, c: [150, 135, 110] }; // Cassini Division
  if (r > 2.205 && r < 2.222) return { a: 0.03, c: [190, 170, 140] }; // Encke gap
  return { a: 0.56 * grain, c: [208, 188, 152] }; // A ring
}

function renderRingHalf(
  canvas: HTMLCanvasElement | null,
  box: number,
  dpr: number,
  cx: number,
  cy: number,
  R: number,
  tilt: number,
  ratio: number,
  half: 'back' | 'front',
): HTMLCanvasElement {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = Math.round(box * dpr);
    canvas.height = Math.round(box * dpr);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.beginPath();
  if (half === 'back') ctx.rect(-box, -box, box * 2, box);
  else ctx.rect(-box, 0, box * 2, box);
  ctx.clip();
  ctx.scale(1, ratio);
  const step = 1.1 / R;
  for (let r = 1.24; r < 2.27; r += step) {
    const s = ringSample(r);
    if (s.a <= 0) continue;
    ctx.strokeStyle = `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${s.a})`;
    ctx.lineWidth = step * R * 1.25;
    ctx.beginPath();
    ctx.arc(0, 0, r * R, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  return canvas;
}

// ── Scroll awareness ─────────────────────────────────────────────────────────

// Shading a sphere is main-thread work, so spheres sit still while anything on the page scrolls.
let lastScrollAt = -1e9;
let listeningForScroll = false;

function trackScroll(): void {
  if (listeningForScroll || typeof window === 'undefined') return;
  listeningForScroll = true;
  window.addEventListener(
    'scroll',
    () => {
      lastScrollAt = performance.now();
    },
    { capture: true, passive: true },
  );
}

const SCROLL_QUIET_MS = 150;

// ── Component ────────────────────────────────────────────────────────────────

export function PlanetSphere({
  body,
  size,
  spin = 1,
  fps = 30,
  glow = true,
  pad,
  decorator,
  startAngle = 0,
  className,
  label,
  interactive = false,
  paused = false,
}: PlanetSphereProps) {
  const style = SPHERE_STYLES[body];
  const boxScale = pad ?? (style.rings ? 2.6 : 1);
  const box = Math.round(size * boxScale);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const decoratorRef = useRef<SphereDecorator | undefined>(decorator);
  decoratorRef.current = decorator;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cap the backing store so very large canvases (the Splash Earth) stay fast.
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, 1200 / box));
    canvas.width = Math.round(box * dpr);
    canvas.height = Math.round(box * dpr);

    const S = Math.round(Math.min(460, Math.max(64, size * Math.min(dpr, 1.6))));
    const sphereCanvas = document.createElement('canvas');
    sphereCanvas.width = S;
    sphereCanvas.height = S;
    const sctx = sphereCanvas.getContext('2d');
    if (!sctx) return;
    const image = sctx.createImageData(S, S);

    let cancelled = false;
    let raf = 0;
    let visible = true;
    let geo: Geometry | null = null;
    let tex: PlanetTexture | null = null;
    let ringBack: HTMLCanvasElement | null = null;
    let ringFront: HTMLCanvasElement | null = null;
    const cx = box / 2;
    const cy = box / 2;
    const R = size / 2;
    const speed = style.spin * spin;
    const startedAt = performance.now();
    let last = 0;

    // Interactive state: a free orientation, plus the spin that carries on around the pole.
    const orient = baseOrientation(style.tilt, style.elevation);
    let orientDirty = true;
    let turns = 0;
    let autoAngle = startAngle;
    let dragging = false;
    let resumeAt = 0;
    let velYaw = 0; // rad/s while coasting
    let velPitch = 0;
    let lastFrame = 0;
    let immediate = false;
    let oneShot = 0;

    const turn = (yaw: number, pitch: number): void => {
      rotateOrientation(orient, yaw, pitch);
      if (++turns % 30 === 0) orthonormalize(orient);
      orientDirty = true;
    };

    const draw = (now: number): void => {
      if (!geo || !tex) return;
      const t = (now - startedAt) / 1000;
      const rotation = interactive ? autoAngle : startAngle + t * speed;
      if (interactive && orientDirty) {
        applyOrientation(geo, orient);
        if (style.rings) {
          const pose = ringPose(orient);
          const backHalf = pose.flip ? 'front' : 'back';
          const frontHalf = pose.flip ? 'back' : 'front';
          ringBack = renderRingHalf(ringBack, box, dpr, cx, cy, R, pose.angle, pose.ratio, backHalf);
          ringFront = renderRingHalf(ringFront, box, dpr, cx, cy, R, pose.angle, pose.ratio, frontHalf);
        }
        orientDirty = false;
      }
      shadeSphere(image, geo, tex, style, rotation, rotation * 1.18 + 0.7);
      sctx.putImageData(image, 0, 0);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box, box);
      const dc: SphereDrawContext = { ctx, cx, cy, radius: R, time: t, tilt: style.tilt };
      if (ringBack) ctx.drawImage(ringBack, 0, 0, box, box);
      const dec = decoratorRef.current;
      if (dec?.behind) {
        ctx.save();
        dec.behind(dc);
        ctx.restore();
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sphereCanvas, cx - R, cy - R, R * 2, R * 2);
      if (ringFront) ctx.drawImage(ringFront, 0, 0, box, box);
      if (dec?.front) {
        ctx.save();
        dec.front(dc);
        ctx.restore();
      }
    };

    /** Advances inertia and the resumed auto-spin by the time since the last frame. */
    const step = (now: number): void => {
      const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
      lastFrame = now;
      if (dt <= 0 || dragging) return;
      if (velYaw !== 0 || velPitch !== 0) {
        turn(velYaw * dt, velPitch * dt);
        const decay = Math.exp(-dt * 3.2);
        velYaw *= decay;
        velPitch *= decay;
        if (Math.abs(velYaw) < 0.02 && Math.abs(velPitch) < 0.02) velYaw = velPitch = 0;
      }
      const ease = Math.min(1, Math.max(0, (now - resumeAt) / 1500));
      autoAngle += speed * ease * dt;
    };

    const frame = (now: number): void => {
      if (cancelled) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || pausedRef.current) return;
      if (!immediate && (now - last < 1000 / fps || now - lastScrollAt < SCROLL_QUIET_MS)) return;
      immediate = false;
      last = now;
      if (interactive) step(now);
      draw(now);
    };

    /** Reduced-motion spheres have no loop, so a drag paints itself once per frame. */
    const paintOnce = (): void => {
      if (!reduced) {
        immediate = true;
        return;
      }
      if (oneShot) return;
      oneShot = requestAnimationFrame(() => {
        oneShot = 0;
        draw(performance.now());
      });
    };

    trackScroll();

    // Build the texture a moment after mount so the first paint is never blocked.
    const start = (loaded: PlanetTexture | null): void => {
      if (cancelled || !loaded) return;
      tex = loaded;
      geo = buildGeometry(S, style.tilt, style.elevation, interactive);
      if (style.rings && !interactive) {
        const ratio = Math.abs(Math.sin(style.elevation));
        ringBack = renderRingHalf(null, box, dpr, cx, cy, R, style.tilt, ratio, 'back');
        ringFront = renderRingHalf(null, box, dpr, cx, cy, R, style.tilt, ratio, 'front');
      }
      draw(performance.now());
      wrap.setAttribute('data-ready', 'true');
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    // Textures missing from the cache are built one per task, so a screen full of planets
    // doesn't freeze while they all appear at once.
    const timer = window.setTimeout(() => {
      if (!cancelled) void loadPlanetTexture(body).then(start);
    }, 0);

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((entries) => {
            for (const e of entries) visible = e.isIntersecting;
          })
        : null;
    observer?.observe(wrap);

    // ── Drag, inertia and keyboard ──────────────────────────────────────────
    let pointerId = -1;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let vx = 0; // px/ms, smoothed
    let vy = 0;

    const resetView = (): void => {
      orient.set(baseOrientation(style.tilt, style.elevation));
      velYaw = velPitch = 0;
      orientDirty = true;
    };
    const onDown = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = e.timeStamp;
      vx = vy = 0;
      velYaw = velPitch = 0;
      wrap.setPointerCapture(e.pointerId);
      wrap.classList.add('is-dragging');
      e.preventDefault();
    };
    const onMove = (e: PointerEvent): void => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dtMs = Math.max(1, e.timeStamp - lastT);
      vx = vx * 0.5 + (dx / dtMs) * 0.5;
      vy = vy * 0.5 + (dy / dtMs) * 0.5;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = e.timeStamp;
      turn(dx / R, dy / R);
      paintOnce();
    };
    const onUp = (e: PointerEvent): void => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      wrap.classList.remove('is-dragging');
      if (wrap.hasPointerCapture(e.pointerId)) wrap.releasePointerCapture(e.pointerId);
      const fresh = e.timeStamp - lastT < 80;
      const limit = 12;
      if (!reduced && fresh) {
        velYaw = Math.max(-limit, Math.min(limit, (vx * 1000) / R));
        velPitch = Math.max(-limit, Math.min(limit, (vy * 1000) / R));
      }
      resumeAt = performance.now() + 1200;
    };
    const onKey = (e: KeyboardEvent): void => {
      const nudge = 0.14;
      if (e.key === 'ArrowLeft') turn(-nudge, 0);
      else if (e.key === 'ArrowRight') turn(nudge, 0);
      else if (e.key === 'ArrowUp') turn(0, -nudge);
      else if (e.key === 'ArrowDown') turn(0, nudge);
      else if (e.key === 'Home') resetView();
      else return;
      e.preventDefault();
      e.stopPropagation();
      resumeAt = performance.now() + 1200;
      paintOnce();
    };
    const onDouble = (): void => {
      resetView();
      paintOnce();
    };

    if (interactive) {
      wrap.addEventListener('pointerdown', onDown);
      wrap.addEventListener('pointermove', onMove);
      wrap.addEventListener('pointerup', onUp);
      wrap.addEventListener('pointercancel', onUp);
      wrap.addEventListener('keydown', onKey);
      wrap.addEventListener('dblclick', onDouble);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(oneShot);
      observer?.disconnect();
      if (interactive) {
        wrap.removeEventListener('pointerdown', onDown);
        wrap.removeEventListener('pointermove', onMove);
        wrap.removeEventListener('pointerup', onUp);
        wrap.removeEventListener('pointercancel', onUp);
        wrap.removeEventListener('keydown', onKey);
        wrap.removeEventListener('dblclick', onDouble);
        wrap.classList.remove('is-dragging');
      }
    };
  }, [body, size, box, spin, fps, startAngle, reduced, style, interactive]);

  const glowShadow = glow
    ? `0 0 ${Math.round(size * 0.1)}px ${Math.round(size * 0.015)}px rgba(${style.glow},0.34), 0 0 ${Math.round(size * 0.38)}px rgba(${style.glow},0.16)`
    : 'none';

  return (
    <div
      ref={wrapRef}
      className={`mo-sphere${interactive ? ' mo-sphere--interactive' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label ? (interactive ? `${label}. Drag or use the arrow keys to rotate.` : label) : undefined}
      aria-hidden={label ? undefined : true}
      tabIndex={interactive ? 0 : undefined}
    >
      {glow && <span className="mo-sphere__glow" style={{ boxShadow: glowShadow }} />}
      <canvas
        ref={canvasRef}
        className="mo-sphere__canvas"
        style={{ width: box, height: box }}
      />
    </div>
  );
}

export default PlanetSphere;
