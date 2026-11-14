/**
 * planetTextures.ts — Procedural surface textures + render styles for every sphere in the game.
 *
 * Every texture is an equirectangular (longitude × latitude) image generated in code from vector
 * shapes (Path2D polygons), gradients and seeded noise — no image files. PlanetSphere wraps one of
 * these around a rotating, lit 3D sphere.
 *
 * This file has no dependencies except the BodyArtId type.
 */

import type { BodyArtId } from '../../../data/codexEntries';

// ── Public types ─────────────────────────────────────────────────────────────

/** Bodies that are drawn as a lit, rotating sphere (everything except the deep-sky pictures). */
export type SphereArtId = Exclude<BodyArtId, 'webb' | 'carina' | 'stephan'>;

export interface PlanetTexture {
  width: number;
  height: number;
  /** RGBA, row-major, row 0 = north pole. */
  data: Uint8ClampedArray;
  /** Optional 0–255 city-light map (Earth) shown on the night side. */
  lights?: Uint8ClampedArray;
  /** Optional 0–255 cloud-cover map (Earth), drawn above the surface and spun separately. */
  clouds?: Uint8ClampedArray;
  cloudWidth?: number;
  cloudHeight?: number;
}

export interface PlanetStyle {
  /** Roll of the spin axis in the image plane (radians). */
  tilt: number;
  /** How far the north pole leans toward the viewer (radians). Also sets the ring opening. */
  elevation: number;
  /** Default spin in radians per second. */
  spin: number;
  /** Atmosphere glow color as "r,g,b". */
  glow: string;
  /** Strength of the bright limb (0–1). */
  rim: number;
  rimColor: [number, number, number];
  /** Draws Saturn-style rings. */
  rings?: boolean;
  /** Extra brightness on the lit side (1 = normal). */
  exposure?: number;
}

export const SPHERE_STYLES: Record<SphereArtId, PlanetStyle> = {
  mercury: { tilt: 0.1, elevation: 0.05, spin: 0.09, glow: '170,160,150', rim: 0.1, rimColor: [190, 180, 170] },
  venus: { tilt: 0.05, elevation: 0.08, spin: 0.05, glow: '255,214,140', rim: 0.55, rimColor: [255, 226, 160] },
  earth: { tilt: -0.38, elevation: 0.3, spin: 0.14, glow: '90,170,255', rim: 0.8, rimColor: [110, 180, 255] },
  mars: { tilt: -0.3, elevation: 0.12, spin: 0.11, glow: '255,130,80', rim: 0.28, rimColor: [255, 150, 110] },
  phobos: { tilt: 0.2, elevation: 0.0, spin: 0.16, glow: '160,150,140', rim: 0.05, rimColor: [170, 160, 150] },
  deimos: { tilt: -0.2, elevation: 0.0, spin: 0.12, glow: '160,150,140', rim: 0.05, rimColor: [170, 160, 150] },
  jupiter: { tilt: 0.04, elevation: 0.05, spin: 0.2, glow: '255,190,140', rim: 0.25, rimColor: [255, 215, 170] },
  io: { tilt: 0.12, elevation: 0.1, spin: 0.14, glow: '255,230,120', rim: 0.18, rimColor: [255, 235, 140] },
  europa: { tilt: -0.1, elevation: 0.1, spin: 0.1, glow: '220,230,245', rim: 0.14, rimColor: [230, 240, 255] },
  ganymede: { tilt: 0.15, elevation: 0.08, spin: 0.1, glow: '180,170,160', rim: 0.08, rimColor: [190, 180, 170] },
  saturn: { tilt: -0.32, elevation: 0.46, spin: 0.18, glow: '240,215,150', rim: 0.25, rimColor: [250, 225, 170], rings: true },
  titan: { tilt: 0.0, elevation: 0.1, spin: 0.08, glow: '255,170,70', rim: 0.7, rimColor: [255, 180, 80] },
  enceladus: { tilt: 0.1, elevation: -0.45, spin: 0.11, glow: '200,235,255', rim: 0.2, rimColor: [215, 240, 255] },
  rhea: { tilt: -0.1, elevation: 0.05, spin: 0.1, glow: '190,185,180', rim: 0.08, rimColor: [200, 195, 190] },
  mimas: { tilt: 0.0, elevation: 0.0, spin: 0.09, glow: '190,190,190', rim: 0.06, rimColor: [200, 200, 200] },
  iapetus: { tilt: 0.15, elevation: 0.05, spin: 0.1, glow: '200,195,185', rim: 0.08, rimColor: [210, 205, 195] },
  dione: { tilt: -0.12, elevation: 0.05, spin: 0.1, glow: '200,200,195', rim: 0.08, rimColor: [210, 210, 205] },
  tethys: { tilt: 0.08, elevation: 0.05, spin: 0.09, glow: '210,210,205', rim: 0.08, rimColor: [220, 220, 215] },
  uranus: { tilt: 1.42, elevation: 0.1, spin: 0.13, glow: '150,230,235', rim: 0.45, rimColor: [170, 240, 245] },
  neptune: { tilt: 0.18, elevation: 0.12, spin: 0.15, glow: '80,130,255', rim: 0.55, rimColor: [100, 150, 255] },
  triton: { tilt: 0.0, elevation: -0.3, spin: 0.1, glow: '230,200,200', rim: 0.12, rimColor: [240, 215, 210] },
  pluto: { tilt: -0.2, elevation: 0.18, spin: 0.08, glow: '230,200,170', rim: 0.15, rimColor: [240, 215, 190] },
  charon: { tilt: 0.1, elevation: 0.15, spin: 0.08, glow: '180,175,170', rim: 0.08, rimColor: [190, 185, 180] },
  wasp39b: { tilt: 0.05, elevation: 0.05, spin: 0.22, glow: '255,120,60', rim: 0.85, rimColor: [255, 140, 70], exposure: 1.15 },
};

export function isSphereArt(art: BodyArtId): art is SphereArtId {
  return art !== 'webb' && art !== 'carina' && art !== 'stephan';
}

// ── Small helpers ────────────────────────────────────────────────────────────

type RGB = [number, number, number];

function hex(c: string): RGB {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

function rgba(c: RGB, a = 1): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
}

/** Deterministic random numbers (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Value noise that wraps horizontally (x in 0..1, y in 0..1, fx must be a whole number). */
function noise(x: number, y: number, fx: number, fy: number, seed: number): number {
  const X = x * fx;
  const Y = y * fy;
  const x0 = Math.floor(X);
  const y0 = Math.floor(Y);
  const tx = X - x0;
  const ty = Y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const xa = ((x0 % fx) + fx) % fx;
  const xb = (xa + 1) % fx;
  const a = hash2(xa, y0, seed);
  const b = hash2(xb, y0, seed);
  const c = hash2(xa, y0 + 1, seed);
  const d = hash2(xb, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Fractal noise, 0..1, wraps horizontally. */
function fbm(x: number, y: number, fx: number, fy: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x, y, fx * f, fy * f, seed + o * 17);
    total += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / total;
}

/**
 * A canvas for drawing a texture. Inside a Web Worker there is no `document`, so an OffscreenCanvas is
 * used; the 2D calls in this file are the same on both, so it is typed as the DOM canvas.
 */
function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = (
    typeof document === 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas')
  ) as HTMLCanvasElement;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
}

/** Paint every pixel from a function of (u, v) where u,v are 0..1 across the texture. */
function paintPixels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fn: (u: number, v: number, x: number, y: number) => RGB,
): void {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  let i = 0;
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const c = fn((x + 0.5) / w, v, x, y);
      d[i++] = c[0];
      d[i++] = c[1];
      d[i++] = c[2];
      d[i++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Draw a shape twice so it wraps across the left/right texture edge. */
function wrapped(w: number, x: number, r: number, draw: (px: number) => void): void {
  draw(x);
  if (x - r < 0) draw(x + w);
  if (x + r > w) draw(x - w);
}

interface CraterOptions {
  count: number;
  minR: number;
  maxR: number;
  /** 0..1 darkness of the crater floor. */
  dark: number;
  /** 0..1 brightness of the crater rim. */
  rim: number;
  seed: number;
  /** Colour of the dark floor. */
  floor?: RGB;
  /** Colour of the rim highlight. */
  rimColor?: RGB;
}

/** Scatter circular craters (corrected for the stretching of an equirectangular map near the poles). */
function drawCraters(ctx: CanvasRenderingContext2D, w: number, h: number, o: CraterOptions): void {
  const rand = rng(o.seed);
  const floor = o.floor ?? [20, 18, 16];
  const rimC = o.rimColor ?? [255, 250, 240];
  for (let i = 0; i < o.count; i++) {
    const u = rand();
    const lat = Math.asin(2 * rand() - 1);
    const x = u * w;
    const y = (0.5 - lat / Math.PI) * h;
    const r = o.minR + (o.maxR - o.minR) * Math.pow(rand(), 2.6);
    const stretch = 1 / Math.max(0.22, Math.cos(lat));
    wrapped(w, x, r * stretch, (px) => {
      ctx.save();
      ctx.translate(px, y);
      ctx.scale(stretch, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, rgba(floor, o.dark * 0.8));
      g.addColorStop(0.7, rgba(floor, o.dark * 0.45));
      g.addColorStop(0.88, rgba(rimC, o.rim * 0.55));
      g.addColorStop(1, rgba(rimC, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}

/** One big crater (used for Herschel on Mimas, Stickney on Phobos, Odysseus on Tethys). */
function drawBigCrater(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
  v: number,
  radiusPx: number,
  floorColor: RGB,
  rimColor: RGB,
): void {
  const lat = (0.5 - v) * Math.PI;
  const stretch = 1 / Math.max(0.3, Math.cos(lat));
  wrapped(w, u * w, radiusPx * stretch, (px) => {
    ctx.save();
    ctx.translate(px, v * h);
    ctx.scale(stretch, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusPx);
    g.addColorStop(0, rgba(mix(floorColor, rimColor, 0.25), 0.95));
    g.addColorStop(0.15, rgba(floorColor, 0.95));
    g.addColorStop(0.78, rgba(floorColor, 0.85));
    g.addColorStop(0.9, rgba(rimColor, 0.95));
    g.addColorStop(1, rgba(rimColor, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, radiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/** Colour ramp lookup. */
function ramp(stops: [number, RGB][], t: number): RGB {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return stops[stops.length - 1][1];
}

/** Mean-preserving box blur of a single-channel map, wrapping left/right. */
function boxBlur(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  const tmp = new Float32Array(w * h);
  const out = new Uint8ClampedArray(w * h);
  const span = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + ((k + w) % w)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / span;
      sum += src[row + ((x + r + 1) % w)] - src[row + ((x - r + w) % w)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / span;
      const add = Math.min(h - 1, y + r + 1);
      const sub = Math.max(0, y - r);
      sum += tmp[add * w + x] - tmp[sub * w + x];
    }
  }
  return out;
}

function finish(canvas: HTMLCanvasElement): PlanetTexture {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: img.data };
}

// ── Earth ────────────────────────────────────────────────────────────────────

/** Simplified coastlines as [longitude, latitude] polygons. */
type Poly = [number, number][];

const EARTH_LAND: Poly[] = [
  // North America
  [[-168,66],[-162,70],[-156,71.3],[-141,69.7],[-128,70],[-115,68.5],[-105,68],[-95,72],[-85,69],[-82,66],[-88,64],[-94,60],[-93,57],[-85,55],[-80,52],[-79,57],[-77,62],[-72,61],[-65,60],[-61,56],[-57,52],[-60,49],[-66,48],[-64,45.5],[-70,43.5],[-70,41.7],[-74,40.5],[-76,38],[-76,35],[-81,31],[-80,26],[-81,25.2],[-83,29],[-85,30],[-89,30],[-92,29.5],[-97,27.5],[-97.5,22],[-96,19],[-94,18],[-91,18.5],[-90,21],[-87,21.5],[-88,16],[-84,15.5],[-83.5,11],[-81.5,8.8],[-79,9.5],[-77.5,8.5],[-80,7.5],[-82.5,8.3],[-85.5,10],[-87.5,13],[-92,14.5],[-96,15.8],[-101,17.5],[-105.5,20],[-109,25],[-112.5,30],[-114.8,31.5],[-117,32.5],[-120.5,34.5],[-122.5,37.5],[-124,40.5],[-124.5,43],[-124,46.5],[-123,48.5],[-125,50],[-128,52],[-131,55],[-135,58],[-140,59.8],[-146,60.5],[-150,59.5],[-154,57.5],[-158,56.5],[-162,55],[-165,54.5],[-160,58.5],[-162,60.5],[-165,62.5],[-166,64.5]],
  // South America
  [[-77.5,8.5],[-75.5,10.5],[-72,12],[-70,11.5],[-64,10.5],[-60,8.5],[-57,6],[-52,5],[-50,1.5],[-48,-1],[-44,-2.5],[-40,-3],[-35,-5.5],[-35,-9],[-37,-12],[-39,-15],[-39.5,-19],[-41,-22],[-44,-23],[-48,-25.5],[-48.5,-28],[-51,-31],[-53.5,-34],[-57,-35],[-57,-37.5],[-62,-39],[-65,-41],[-64.5,-43],[-67,-46],[-66,-48],[-69,-51],[-68.5,-53],[-71,-54.5],[-74,-52],[-75,-48],[-73.5,-42],[-73.5,-37],[-71.5,-32],[-71.5,-28],[-70.5,-23],[-70.2,-18.5],[-76,-14],[-79,-9],[-81,-5],[-80,-2],[-80.5,0.5],[-78.5,2.5],[-77.5,6]],
  // Greenland
  [[-73,78],[-68,80.5],[-55,82],[-35,83.5],[-20,82],[-18,78],[-20,74],[-22,70],[-30,68],[-40,65],[-44,60],[-48,61],[-52,65],[-54,69],[-58,75],[-66,76]],
  // Eurasia
  [[-9,37],[-9,43],[-2,43.5],[-1.5,46],[-4.5,48],[-1.5,49.5],[2,51],[4.5,53],[8.5,57],[8,58.5],[5,59],[5,62],[10,64],[14,67],[19,70],[26,71],[31,70],[40,67.5],[44,68.5],[54,68.5],[60,69],[68,69],[70,73],[80,73.5],[87,75],[100,77],[105,77.5],[113,74],[125,73],[131,71],[140,72.5],[150,71.5],[160,70],[170,70],[180,69],[180,65],[170,61],[164,60],[160,54.5],[156.7,51],[155,58],[148,59.5],[142,59],[137,54],[140,53],[141,49.5],[140,46],[135,43.5],[131,42.5],[129.5,41],[129.4,37],[129,35],[126.5,34.5],[126.5,37],[125,39.5],[121.5,39],[122,40.5],[118,39],[119,37],[122.5,37],[120,35],[121.5,32],[121.5,30],[119,25.5],[116.5,22.8],[111,21.5],[108,21.5],[106.5,19],[109,15],[109,12],[105,8.5],[104.8,10.5],[103,10.5],[100.5,13.5],[99.5,10],[100.5,7],[103.5,5],[104,1.5],[102,2.5],[100.5,4.5],[98.5,8],[98,13],[97,17],[94,16],[94.5,19],[92,21],[90,22],[87,21],[85,19.5],[82,16.5],[80,14],[80,10],[77.5,8],[76,10.5],[74.5,15],[72.8,20],[72.5,22.5],[69,22.5],[67,24.8],[62,25],[57,25.8],[57,27.5],[54,26.5],[50.5,29.5],[48.5,30],[50,26],[51.5,24.5],[54,24],[56.5,26],[56.8,24.5],[59.8,22.5],[58,19],[55,17],[52,16],[45,13],[43,13.2],[42.7,16],[39,21],[35.5,27.5],[34.5,29.5],[34.8,31],[35.5,33.5],[36,36],[32,36.5],[30,36.3],[27,37],[26.5,39.5],[26,40.5],[23.5,40.2],[22.8,38.5],[22.5,36.5],[21,37.5],[21,39],[19.5,40.5],[19.3,42],[16,43.5],[13.5,45.5],[12.3,45],[12.5,44],[14,42],[16,41.8],[18.5,40.1],[16.5,38.5],[15.7,38],[16,39.8],[15.5,40.2],[14,40.8],[12,41.5],[10.5,43],[8.8,44.4],[7.3,43.8],[4.5,43.4],[3.2,43],[3.2,41.8],[0.8,41],[-0.3,39.5],[-0.5,38.2],[-2,36.8],[-5.3,36.1],[-6.3,36.8]],
  // Chukotka (across the date line)
  [[-180,68.5],[-175,67.5],[-170,66],[-173,64.5],[-180,65]],
  // Africa
  [[-5.5,36],[-2,35.2],[3,36.8],[10,37.2],[11,35],[10,33.5],[15,32.3],[20,32.5],[20,31],[25,31.8],[30,31.3],[32.5,31.2],[34.5,29.5],[33,28],[32.5,26],[35,23],[37,19.5],[39,15.5],[43,12.7],[44.5,10.5],[51,11.8],[51,10.5],[48,6],[44,1.5],[41,-1.8],[39,-5],[39.5,-8],[40.5,-11],[40.5,-15],[36,-19],[35.5,-23],[32.5,-26],[32.8,-28.8],[30,-31.5],[27,-33.8],[22,-34.2],[18.5,-34.2],[18,-32],[15.5,-27.5],[14.5,-22.5],[12,-17.5],[13.5,-12],[13,-9],[12,-5.5],[9,-1],[9.8,3.5],[7.5,4.5],[4.5,6.2],[1,6],[-2,4.8],[-7,4.4],[-9,5],[-13,8.5],[-15.5,11.5],[-17,14.7],[-16.5,19],[-16,22],[-13,27.5],[-10,30],[-9.5,32.5],[-6.8,34]],
  // Madagascar
  [[49.5,-12],[50.5,-15.5],[49.5,-18.5],[47.5,-24.5],[45,-25.5],[43.5,-23],[44,-19],[45,-16],[47.5,-14.5]],
  // Australia, Tasmania, New Zealand
  [[114,-22],[114,-26],[115,-34],[118,-35],[123,-34],[129,-31.5],[132,-32],[135.5,-34.8],[138,-35.5],[140,-38],[144,-38.5],[148,-37.8],[150,-37],[151,-34],[153,-30],[153,-26],[150,-22.5],[146,-19],[145.5,-15],[143.5,-14],[142.5,-10.8],[141.5,-13],[141.5,-17],[139,-17.5],[136.5,-15.5],[136.8,-12.2],[132,-11.3],[130,-12.5],[129.5,-15],[127,-14],[125,-15.5],[122.5,-17],[121,-19.5],[117,-20.5]],
  [[145,-41],[148.2,-41],[147,-43.6],[145.5,-42.8]],
  [[173,-35],[175.5,-37],[178,-37.7],[176,-39.5],[174.8,-41.3],[173.5,-39.5],[174.5,-37]],
  [[172.7,-40.5],[174.3,-41.7],[171.5,-44.5],[170.5,-46],[167,-46],[168,-44],[171,-42.8]],
  // Indonesia, Philippines, Japan and other islands
  [[95.3,5.5],[98,4],[104,-1.5],[106,-3.5],[105.8,-5.8],[102,-4],[98.5,0.5]],
  [[105.5,-6.5],[108,-6.5],[114.5,-7.8],[114.5,-8.7],[108,-7.9],[105.5,-6.8]],
  [[109,1.5],[111,1.8],[114,4.5],[117,7],[119,5],[117.5,1.5],[116.5,-2.5],[115.5,-3.8],[111,-3],[110,-1.8]],
  [[119,-5.5],[120.5,-3],[119.8,0.5],[121.5,1.2],[125,1.5],[123,0],[122.5,-2],[123.3,-5],[121,-4.5],[120.5,-5.5]],
  [[131,-0.8],[135,-3.3],[138,-1.7],[141,-2.6],[146,-5.2],[148,-6],[150.5,-10.5],[147.5,-10],[143,-9],[141,-9.1],[138,-8.2],[137.5,-5.5],[133,-4],[132,-2.8]],
  [[120.3,18.5],[122.3,18.4],[122,16],[124,13],[122,13.8],[120.7,14.5],[120,16.2]],
  [[122,7],[125.5,9.7],[126.5,7.5],[125.5,5.8],[123.5,7.5]],
  [[130.8,33.8],[132,35.5],[136,36],[139.7,38],[140,40.5],[141.5,41.4],[142,39.5],[141,36],[139.8,35],[137,34.6],[135,33.5],[133,34]],
  [[140,42],[141,45.4],[145.4,43.3],[143.3,42],[141,42.4]],
  [[129.7,33],[131.9,33.5],[131.5,31],[130.2,31.2]],
  [[79.8,9.5],[81.8,7.5],[81,6],[80,6.5]],
  [[120.2,23],[121.5,25.2],[122,24.5],[120.9,22]],
  [[-5.5,50],[1.5,51],[1.8,52.8],[-0.5,54.5],[-2,57.5],[-3,58.6],[-5,58.5],[-6,56.5],[-5,55],[-3,54],[-4.5,53],[-5,51.7]],
  [[-10,51.7],[-6,52],[-6,54.5],[-8,55.3],[-10,54],[-9.8,52.5]],
  [[-24,65.5],[-22,66.4],[-16,66.5],[-13.5,65],[-18,63.4],[-22.5,63.8]],
  [[-85,22],[-82,23.2],[-77,21.8],[-74.2,20.2],[-77.5,19.9],[-80,21.7]],
  [[-74.5,18.4],[-72.5,19.9],[-69,19.5],[-68.4,18.5],[-71.5,17.8]],
  [[-59,47.7],[-53,46.7],[-52.8,49.5],[-55.5,51.5],[-58.5,50.8]],
  [[-80,73.5],[-72,71.5],[-68,70],[-62,67],[-64,64.5],[-68,62.5],[-74,64.5],[-78,64.5],[-73,67.5],[-82,69.5],[-90,72.8]],
  [[-117,70],[-105,73],[-101,70.5],[-105,68.5],[-114,69]],
  [[-125,72],[-117,74],[-118,71.5]],
  [[-90,76.5],[-78,76.5],[-62,81.5],[-80,83],[-92,81]],
  [[11,78.5],[16,80.5],[26,80],[20,77.5]],
  [[52.5,71.5],[55,73.5],[68,77],[60,75],[56,70.8]],
  // Antarctica
  [[-180,-90],[-180,-80],[-165,-78],[-150,-77],[-130,-73.5],[-100,-73.5],[-75,-73],[-72,-72],[-67,-69],[-62,-66.5],[-58,-63.5],[-62,-65],[-64,-69],[-67,-72],[-78,-76],[-60,-78],[-45,-78.5],[-30,-73],[-10,-71],[10,-69.5],[30,-69.5],[50,-67],[70,-67.5],[90,-66],[110,-66.5],[130,-66],[150,-69],[165,-71.5],[170,-77.5],[180,-78],[180,-90]],
];

/** Seas that are cut back out of the land (Black Sea, Caspian Sea). */
const EARTH_SEAS: Poly[] = [
  [[28,41.2],[28,43.5],[30,45.5],[33,45.5],[35,45],[37.5,47],[39,45],[41.5,42.2],[41.5,41.5],[38,41],[35,42],[31,41.2]],
  [[47,45],[49,46.5],[53,46],[53.5,42],[53,40],[54,37],[50.5,37],[49,38.5],[49,40.5],[47.5,43]],
];

function polyPath(polys: Poly[], w: number, h: number): Path2D {
  const p = new Path2D();
  for (const poly of polys) {
    poly.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * w;
      const y = ((90 - lat) / 180) * h;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    });
    p.closePath();
  }
  return p;
}

function buildEarth(): PlanetTexture {
  const W = 1024;
  const H = 512;
  // 1. Land mask from vector polygons.
  const m = makeCanvas(W, H);
  m.ctx.fillStyle = '#000';
  m.ctx.fillRect(0, 0, W, H);
  m.ctx.fillStyle = '#fff';
  m.ctx.lineJoin = 'round';
  m.ctx.fill(polyPath(EARTH_LAND, W, H));
  m.ctx.fillStyle = '#000';
  m.ctx.fill(polyPath(EARTH_SEAS, W, H));
  const maskRGBA = m.ctx.getImageData(0, 0, W, H).data;
  const rawMask = new Uint8ClampedArray(W * H);
  for (let i = 0; i < W * H; i++) rawMask[i] = maskRGBA[i * 4];
  const land = boxBlur(rawMask, W, H, 1);
  const shelf = boxBlur(rawMask, W, H, 6);

  // 2. Colour the surface.
  const t = makeCanvas(W, H);
  const oceanDeep: RGB = [6, 24, 70];
  const oceanMid: RGB = [14, 64, 128];
  const shelfColor: RGB = [32, 132, 168];
  const forest: RGB = [44, 100, 52];
  const grass: RGB = [86, 124, 60];
  const desert: RGB = [196, 164, 104];
  const rock: RGB = [120, 96, 72];
  const ice: RGB = [238, 244, 250];
  paintPixels(t.ctx, W, H, (u, v, x, y) => {
    const lat = (0.5 - v) * 180;
    const a = Math.abs(lat);
    const idx = y * W + x;
    const l = land[idx] / 255;
    const sh = shelf[idx] / 255;
    const n1 = fbm(u, v, 8, 4, 4, 11);
    // Ocean: deeper far from land, brighter shelf near coasts.
    let ocean = mix(oceanDeep, oceanMid, clamp01(0.35 + n1 * 0.6));
    ocean = mix(ocean, shelfColor, smoothstep(0.1, 0.6, sh) * 0.7);
    // Polar sea ice.
    const seaIce = smoothstep(68, 78, a + (n1 - 0.5) * 8);
    ocean = mix(ocean, ice, seaIce * 0.85);
    // Land biome.
    const n2 = fbm(u, v, 12, 6, 4, 29);
    const dryness = smoothstep(0.38, 0.62, n2 + (a > 12 && a < 36 ? 0.18 : -0.08));
    let ground = mix(forest, grass, smoothstep(0.35, 0.7, n1));
    ground = mix(ground, desert, dryness);
    ground = mix(ground, rock, smoothstep(0.62, 0.8, n2) * 0.5);
    const polar = smoothstep(60, 72, a + (n2 - 0.5) * 10);
    const isGreenland = lat > 58 && u > 0.29 && u < 0.4;
    const iceAmount = isGreenland ? 0.95 : a > 62 ? polar : 0;
    ground = mix(ground, ice, iceAmount);
    return mix(ocean, ground, smoothstep(0.35, 0.65, l));
  });
  const tex = finish(t.canvas);

  // 3. City lights on land (night side).
  const lights = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    const lat = Math.abs((0.5 - v) * 180);
    if (lat > 66) continue;
    for (let x = 0; x < W; x++) {
      const l = land[y * W + x] / 255;
      if (l < 0.6) continue;
      const u = (x + 0.5) / W;
      const cluster = smoothstep(0.58, 0.82, fbm(u, v, 14, 7, 4, 53));
      const dots = noise(u, v, 256, 128, 71) > 0.72 ? 1 : 0;
      const glow = smoothstep(0.7, 0.9, fbm(u, v, 40, 20, 2, 83));
      lights[y * W + x] = Math.round(255 * clamp01(cluster * (0.35 * dots + 0.75 * glow) * 1.4));
    }
  }
  tex.lights = boxBlur(lights, W, H, 1);

  // 4. Clouds.
  const CW = 512;
  const CH = 256;
  const clouds = new Uint8ClampedArray(CW * CH);
  for (let y = 0; y < CH; y++) {
    const v = (y + 0.5) / CH;
    const lat = Math.abs((0.5 - v) * 180);
    const bandBoost = 0.1 * Math.cos((lat / 90) * Math.PI * 2.0);
    for (let x = 0; x < CW; x++) {
      const u = (x + 0.5) / CW;
      const warp = fbm(u, v, 6, 3, 3, 91) * 0.06;
      const n = fbm(u + warp, v, 7, 5, 5, 97) + bandBoost;
      clouds[y * CW + x] = Math.round(255 * smoothstep(0.58, 0.8, n));
    }
  }
  tex.clouds = clouds;
  tex.cloudWidth = CW;
  tex.cloudHeight = CH;
  return tex;
}

// ── Rocky / icy worlds ───────────────────────────────────────────────────────

interface RockyOptions {
  a: RGB;
  b: RGB;
  seed: number;
  /** Noise scale (cells across the texture width). */
  scale?: number;
  contrast?: number;
  craters?: Partial<CraterOptions>;
  decorate?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Override the per-pixel colour (receives the base noise value). */
  pixel?: (u: number, v: number, n: number, base: RGB) => RGB;
}

function buildRocky(o: RockyOptions, w = 512, h = 256): PlanetTexture {
  const { canvas, ctx } = makeCanvas(w, h);
  const scale = o.scale ?? 8;
  const contrast = o.contrast ?? 1;
  paintPixels(ctx, w, h, (u, v) => {
    const n = fbm(u, v, scale, Math.max(2, scale / 2), 5, o.seed);
    const c = mix(o.a, o.b, clamp01(0.5 + (n - 0.5) * contrast));
    return o.pixel ? o.pixel(u, v, n, c) : c;
  });
  if (o.craters) {
    drawCraters(ctx, w, h, {
      count: 200,
      minR: 1.5,
      maxR: 9,
      dark: 0.45,
      rim: 0.3,
      seed: o.seed + 5,
      ...o.craters,
    });
  }
  if (o.decorate) o.decorate(ctx, w, h);
  return finish(canvas);
}

/** Random wandering lines (Europa's cracks, Dione's wisps, Ithaca Chasma). */
function drawLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number,
  color: string,
  width: number,
  length: number,
  seed: number,
  wander: number,
  bounds: { v0: number; v1: number; u0: number; u1: number } = { v0: 0.1, v1: 0.9, u0: 0, u1: 1 },
): void {
  const rand = rng(seed);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    let x = (bounds.u0 + rand() * (bounds.u1 - bounds.u0)) * w;
    let y = (bounds.v0 + rand() * (bounds.v1 - bounds.v0)) * h;
    let ang = rand() * Math.PI * 2;
    ctx.lineWidth = width * (0.5 + rand());
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = Math.round(length * (0.5 + rand()));
    for (let s = 0; s < steps; s++) {
      ang += (rand() - 0.5) * wander;
      x += Math.cos(ang) * 3;
      y += Math.sin(ang) * 1.6;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

const bandedStops = (c: RGB[]): [number, RGB][] => c.map((col, i) => [i / (c.length - 1), col]);

interface BandedOptions {
  colors: RGB[];
  seed: number;
  /** How strongly noise bends the bands. */
  turbulence: number;
  /** Number of bands across the globe. */
  bands: number;
  /** Cloud streak noise (0..1). */
  streak: number;
  decorate?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

function buildBanded(o: BandedOptions, w = 512, h = 256): PlanetTexture {
  const { canvas, ctx } = makeCanvas(w, h);
  const stops = bandedStops(o.colors);
  paintPixels(ctx, w, h, (u, v) => {
    const warp = (fbm(u, v, 6, 6, 4, o.seed) - 0.5) * o.turbulence;
    const fine = fbm(u, v, 24, 3, 3, o.seed + 9);
    const bandPos = v + warp * (0.4 + 0.6 * Math.sin(v * Math.PI * o.bands));
    const t = 0.5 + 0.5 * Math.sin(bandPos * Math.PI * o.bands * 2 + o.seed);
    const c = ramp(stops, clamp01(t * 0.85 + (fine - 0.5) * o.streak + 0.07));
    // Polar darkening.
    const pol = smoothstep(0.78, 1, Math.abs(v - 0.5) * 2);
    return mix(c, mix(c, [30, 30, 40], 0.3), pol);
  });
  if (o.decorate) o.decorate(ctx, w, h);
  return finish(canvas);
}

function drawEllipseSpot(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
  v: number,
  rx: number,
  ry: number,
  inner: RGB,
  outer: RGB,
  alpha: number,
): void {
  wrapped(w, u * w, rx, (px) => {
    ctx.save();
    ctx.translate(px, v * h);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba(inner, alpha));
    g.addColorStop(0.65, rgba(mix(inner, outer, 0.5), alpha * 0.9));
    g.addColorStop(0.92, rgba(outer, alpha * 0.8));
    g.addColorStop(1, rgba(outer, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ── Recipes ──────────────────────────────────────────────────────────────────

function buildTexture(id: SphereArtId): PlanetTexture {
  switch (id) {
    case 'earth':
      return buildEarth();

    case 'mercury':
      return buildRocky({
        a: hex('#6d675f'),
        b: hex('#a39c91'),
        seed: 101,
        scale: 10,
        contrast: 1.5,
        craters: { count: 360, minR: 1.2, maxR: 11, dark: 0.4, rim: 0.45 },
        decorate: (ctx, w, h) => {
          // A few bright rayed craters.
          const rand = rng(777);
          for (let i = 0; i < 7; i++) {
            const x = rand() * w;
            const y = (0.2 + rand() * 0.6) * h;
            wrapped(w, x, 22, (px) => {
              const g = ctx.createRadialGradient(px, y, 0, px, y, 20);
              g.addColorStop(0, 'rgba(240,235,225,0.75)');
              g.addColorStop(1, 'rgba(240,235,225,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(px, y, 20, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        },
      });

    case 'venus': {
      const c1 = hex('#b98a3e');
      const c2 = hex('#f3deaa');
      const c3 = hex('#d9a95a');
      return buildRocky({
        a: c1,
        b: c2,
        seed: 202,
        scale: 4,
        pixel: (u, v, _n, _base) => {
          const swirl = fbm(u + fbm(u, v, 3, 3, 3, 5) * 0.12, v, 3, 9, 5, 203);
          const streak = fbm(u, v, 2, 14, 3, 207);
          const c = mix(mix(c1, c2, swirl), c3, streak * 0.45);
          return mix(c, [255, 245, 215], smoothstep(0.62, 0.9, swirl) * 0.35);
        },
      });
    }

    case 'mars': {
      const rust = hex('#b5532e');
      const dust = hex('#d98a54');
      const dark = hex('#5a3626');
      const cap = hex('#f4f4f2');
      return buildRocky({
        a: rust,
        b: dust,
        seed: 303,
        scale: 8,
        contrast: 1.4,
        craters: { count: 140, minR: 1.2, maxR: 8, dark: 0.3, rim: 0.2, floor: [60, 30, 20] },
        pixel: (u, v, n, base) => {
          const maria = smoothstep(0.52, 0.66, fbm(u, v, 5, 3, 4, 311));
          let c = mix(base, dark, maria * 0.75);
          c = mix(c, mix(dust, rust, n), 0.1);
          const lat = Math.abs(v - 0.5) * 2;
          const capEdge = 0.86 + (fbm(u, v, 14, 6, 3, 317) - 0.5) * 0.08;
          return mix(c, cap, smoothstep(capEdge, capEdge + 0.04, lat));
        },
        decorate: (ctx, w, h) => {
          // Valles Marineris: a long dark scar near the equator.
          ctx.strokeStyle = 'rgba(60,28,20,0.7)';
          ctx.lineWidth = 2.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0.27 * w, 0.54 * h);
          ctx.bezierCurveTo(0.3 * w, 0.52 * h, 0.34 * w, 0.56 * h, 0.4 * w, 0.54 * h);
          ctx.stroke();
          // Olympus Mons: a bright, round shield volcano.
          drawBigCrater(ctx, w, h, 0.17, 0.42, 9, hex('#c07044'), hex('#8e4a30'));
        },
      });
    }

    case 'phobos':
      return buildRocky({
        a: hex('#5d554d'),
        b: hex('#8a7f73'),
        seed: 401,
        scale: 12,
        contrast: 1.8,
        craters: { count: 120, minR: 1.2, maxR: 7, dark: 0.5, rim: 0.3 },
        decorate: (ctx, w, h) => drawBigCrater(ctx, w, h, 0.5, 0.5, 34, hex('#3f3934'), hex('#9a8f84')),
      });

    case 'deimos':
      return buildRocky({
        a: hex('#7d6f60'),
        b: hex('#a19080'),
        seed: 402,
        scale: 6,
        contrast: 1.1,
        craters: { count: 60, minR: 2, maxR: 8, dark: 0.18, rim: 0.12 },
      });

    case 'jupiter':
      return buildBanded({
        colors: [hex('#6e4b34'), hex('#c28b5b'), hex('#ead9b9'), hex('#b97a4a'), hex('#f1e4c8'), hex('#9a6240'), hex('#e3caa0')],
        seed: 505,
        turbulence: 0.14,
        bands: 7,
        streak: 0.35,
        decorate: (ctx, w, h) => {
          // Great Red Spot.
          drawEllipseSpot(ctx, w, h, 0.62, 0.62, 24, 14, hex('#c24f2e'), hex('#e1a27a'), 0.95);
          drawEllipseSpot(ctx, w, h, 0.62, 0.62, 12, 7, hex('#a63a22'), hex('#c24f2e'), 0.7);
        },
      });

    case 'saturn':
      return buildBanded({
        colors: [hex('#a9895a'), hex('#e7d3a1'), hex('#f3e4bd'), hex('#cbb07a'), hex('#eddab0'), hex('#b99a68')],
        seed: 606,
        turbulence: 0.05,
        bands: 6,
        streak: 0.14,
      });

    case 'uranus':
      return buildBanded({
        colors: [hex('#8fd1d6'), hex('#a8e4e6'), hex('#b8eef0'), hex('#9ddbe0'), hex('#8fcfd6')],
        seed: 707,
        turbulence: 0.03,
        bands: 4,
        streak: 0.07,
      });

    case 'neptune':
      return buildBanded({
        colors: [hex('#1b3fa8'), hex('#2f62e0'), hex('#4b83f2'), hex('#2856cc'), hex('#3a73ea'), hex('#1f46b4')],
        seed: 808,
        turbulence: 0.1,
        bands: 5,
        streak: 0.22,
        decorate: (ctx, w, h) => {
          drawEllipseSpot(ctx, w, h, 0.4, 0.58, 20, 11, hex('#0f2468'), hex('#1b3fa8'), 0.9);
          // Bright companion cloud streaks.
          ctx.strokeStyle = 'rgba(235,245,255,0.8)';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0.34 * w, 0.52 * h);
          ctx.quadraticCurveTo(0.4 * w, 0.49 * h, 0.47 * w, 0.52 * h);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0.7 * w, 0.4 * h);
          ctx.quadraticCurveTo(0.75 * w, 0.38 * h, 0.82 * w, 0.4 * h);
          ctx.stroke();
        },
      });

    case 'wasp39b':
      return buildBanded({
        colors: [hex('#7a2a1c'), hex('#d9733a'), hex('#f0a35e'), hex('#b24a2c'), hex('#e58a46'), hex('#8a321f')],
        seed: 909,
        turbulence: 0.2,
        bands: 6,
        streak: 0.45,
      });

    case 'pluto': {
      const tan = hex('#c8a98a');
      const brown = hex('#7a5642');
      const heartCol = hex('#f2e7d9');
      return buildRocky({
        a: brown,
        b: tan,
        seed: 1001,
        scale: 8,
        contrast: 1.5,
        craters: { count: 60, minR: 1.5, maxR: 6, dark: 0.25, rim: 0.2 },
        decorate: (ctx, w, h) => {
          // Cthulhu Macula: a dark band along the equator.
          ctx.fillStyle = 'rgba(54,32,30,0.65)';
          ctx.beginPath();
          ctx.ellipse(0.28 * w, 0.58 * h, 0.15 * w, 0.075 * h, 0, 0, Math.PI * 2);
          ctx.fill();
          // Tombaugh Regio: the bright heart.
          const cx = 0.5 * w;
          const cy = 0.46 * h;
          const s = 0.068 * w;
          ctx.save();
          ctx.translate(cx, cy);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.6);
          g.addColorStop(0, rgba(heartCol, 0.98));
          g.addColorStop(0.75, rgba(mix(heartCol, tan, 0.4), 0.95));
          g.addColorStop(1, rgba(tan, 0.9));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, s * 1.1);
          ctx.bezierCurveTo(-s * 2.0, -s * 0.2, -s * 1.1, -s * 1.5, 0, -s * 0.55);
          ctx.bezierCurveTo(s * 1.1, -s * 1.5, s * 2.0, -s * 0.2, 0, s * 1.1);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        },
      });
    }

    case 'charon':
      return buildRocky({
        a: hex('#85817d'),
        b: hex('#b3afaa'),
        seed: 1101,
        scale: 8,
        contrast: 1.3,
        craters: { count: 70, minR: 1.5, maxR: 7, dark: 0.3, rim: 0.25 },
        pixel: (u, v, _n, base) => {
          // Mordor Macula: a reddish-brown north pole.
          const edge = 0.19 + (fbm(u, v, 12, 4, 3, 1103) - 0.5) * 0.08;
          return mix(base, hex('#80473a'), 1 - smoothstep(edge - 0.04, edge + 0.03, v));
        },
      });

    case 'io':
      return buildRocky({
        a: hex('#d9c24f'),
        b: hex('#f1e48a'),
        seed: 1201,
        scale: 10,
        contrast: 1.2,
        pixel: (u, v, n, base) => {
          const frost = smoothstep(0.62, 0.8, fbm(u, v, 7, 4, 4, 1203));
          const orange = smoothstep(0.55, 0.75, fbm(u, v, 9, 5, 4, 1207));
          let c = mix(base, hex('#d27a2e'), orange * 0.55);
          c = mix(c, hex('#f6f1dc'), frost * 0.6);
          return mix(c, hex('#b8962e'), (1 - n) * 0.2);
        },
        decorate: (ctx, w, h) => {
          // Volcanic paterae with coloured halos.
          const rand = rng(1209);
          for (let i = 0; i < 46; i++) {
            const x = rand() * w;
            const y = (0.12 + rand() * 0.76) * h;
            const r = 2 + rand() * 4.5;
            wrapped(w, x, r * 4, (px) => {
              const g = ctx.createRadialGradient(px, y, r * 0.2, px, y, r * 3.6);
              g.addColorStop(0, 'rgba(210,70,36,0.85)');
              g.addColorStop(0.5, 'rgba(220,110,40,0.35)');
              g.addColorStop(1, 'rgba(220,110,40,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(px, y, r * 3.6, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = 'rgba(28,18,14,0.92)';
              ctx.beginPath();
              ctx.ellipse(px, y, r, r * 0.8, 0, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        },
      });

    case 'europa':
      return buildRocky({
        a: hex('#cfc7b8'),
        b: hex('#ece6d8'),
        seed: 1301,
        scale: 6,
        contrast: 1.1,
        pixel: (u, v, _n, base) => {
          const mottle = smoothstep(0.55, 0.75, fbm(u, v, 8, 4, 4, 1303));
          return mix(base, hex('#b98e6c'), mottle * 0.55);
        },
        decorate: (ctx, w, h) => {
          drawLines(ctx, w, h, 70, 'rgba(120,70,46,0.42)', 1.4, 55, 1305, 0.5);
          drawLines(ctx, w, h, 40, 'rgba(150,100,70,0.3)', 2.4, 40, 1307, 0.35);
        },
      });

    case 'ganymede':
      return buildRocky({
        a: hex('#6e665b'),
        b: hex('#a69d90'),
        seed: 1401,
        scale: 8,
        contrast: 1.7,
        craters: { count: 160, minR: 1.2, maxR: 8, dark: 0.3, rim: 0.5 },
        decorate: (ctx, w, h) => {
          // Young bright craters with ejecta.
          const rand = rng(1403);
          for (let i = 0; i < 16; i++) {
            const x = rand() * w;
            const y = (0.15 + rand() * 0.7) * h;
            wrapped(w, x, 12, (px) => {
              const g = ctx.createRadialGradient(px, y, 0, px, y, 11);
              g.addColorStop(0, 'rgba(245,245,240,0.85)');
              g.addColorStop(1, 'rgba(245,245,240,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(px, y, 11, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        },
      });

    case 'titan':
      return buildRocky({
        a: hex('#bf7a26'),
        b: hex('#e8b45a'),
        seed: 1501,
        scale: 3,
        contrast: 0.9,
        pixel: (_u, v, n, base) => {
          const detached = Math.abs(v - 0.5) > 0.36 ? 0.18 : 0;
          const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 7);
          return mix(mix(base, hex('#d99a3a'), band * 0.25), hex('#9a5f1a'), detached + (1 - n) * 0.1);
        },
      });

    case 'enceladus':
      return buildRocky({
        a: hex('#e8eef8'),
        b: hex('#fbfdff'),
        seed: 1601,
        scale: 6,
        contrast: 1,
        craters: { count: 70, minR: 1.5, maxR: 7, dark: 0.12, rim: 0.12, floor: [150, 170, 195] },
        decorate: (ctx, w, h) => {
          // "Tiger stripes": blue fractures near the south pole.
          ctx.strokeStyle = 'rgba(70,170,225,0.9)';
          ctx.lineWidth = 2.6;
          ctx.lineCap = 'round';
          for (let i = 0; i < 4; i++) {
            const x = (0.32 + i * 0.045) * w;
            ctx.beginPath();
            ctx.moveTo(x, 0.74 * h);
            ctx.bezierCurveTo(x + 5, 0.82 * h, x - 4, 0.9 * h, x + 3, 0.97 * h);
            ctx.stroke();
          }
          const g = ctx.createLinearGradient(0, 0.7 * h, 0, h);
          g.addColorStop(0, 'rgba(120,190,235,0)');
          g.addColorStop(1, 'rgba(120,190,235,0.45)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0.7 * h, w, 0.3 * h);
        },
      });

    case 'rhea':
      return buildRocky({
        a: hex('#9c9993'),
        b: hex('#c9c6c0'),
        seed: 1701,
        scale: 9,
        contrast: 1.4,
        craters: { count: 260, minR: 1.2, maxR: 10, dark: 0.35, rim: 0.5 },
      });

    case 'mimas':
      return buildRocky({
        a: hex('#8d8d8d'),
        b: hex('#bcbcbc'),
        seed: 1801,
        scale: 9,
        contrast: 1.3,
        craters: { count: 230, minR: 1.2, maxR: 8, dark: 0.35, rim: 0.5 },
        // Herschel Crater: about 1/3 of Mimas's diameter.
        decorate: (ctx, w, h) => drawBigCrater(ctx, w, h, 0.5, 0.5, 27, hex('#6e6e6e'), hex('#d7d7d7')),
      });

    case 'iapetus':
      return buildRocky({
        a: hex('#d9d4c8'),
        b: hex('#f0ece2'),
        seed: 1901,
        scale: 8,
        contrast: 1.1,
        craters: { count: 120, minR: 1.2, maxR: 8, dark: 0.22, rim: 0.3 },
        pixel: (u, v, n, base) => {
          // Dark leading hemisphere (centred at u = 0.25), bright trailing hemisphere.
          const edge = Math.cos((u - 0.25) * Math.PI * 2) + (fbm(u, v, 6, 5, 4, 1903) - 0.5) * 0.9;
          const darkness = smoothstep(-0.05, 0.3, edge);
          return mix(base, mix(hex('#201b18'), hex('#4a3d33'), n), darkness);
        },
      });

    case 'dione':
      return buildRocky({
        a: hex('#b4b2ac'),
        b: hex('#dedcd6'),
        seed: 2001,
        scale: 8,
        contrast: 1.2,
        craters: { count: 200, minR: 1.2, maxR: 9, dark: 0.28, rim: 0.4 },
        decorate: (ctx, w, h) => drawLines(ctx, w, h, 60, 'rgba(250,250,248,0.5)', 1.6, 50, 2003, 0.25, { v0: 0.15, v1: 0.85, u0: 0.5, u1: 1 }),
      });

    case 'tethys':
      return buildRocky({
        a: hex('#c6c4be'),
        b: hex('#ebe9e3'),
        seed: 2101,
        scale: 7,
        contrast: 1.1,
        craters: { count: 150, minR: 1.2, maxR: 8, dark: 0.22, rim: 0.4 },
        decorate: (ctx, w, h) => {
          // Odysseus crater (over a third of the diameter) and the Ithaca Chasma trench.
          drawBigCrater(ctx, w, h, 0.3, 0.45, 36, hex('#a8a6a0'), hex('#f4f2ec'));
          ctx.strokeStyle = 'rgba(86,84,80,0.75)';
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0.62 * w, 0.14 * h);
          ctx.bezierCurveTo(0.8 * w, 0.4 * h, 0.9 * w, 0.62 * h, 0.78 * w, 0.88 * h);
          ctx.stroke();
        },
      });

    case 'triton':
      return buildRocky({
        a: hex('#c9b3a7'),
        b: hex('#eed9cf'),
        seed: 2201,
        scale: 8,
        contrast: 1.2,
        pixel: (u, v, n, base) => {
          // Pinkish-white southern cap and "cantaloupe" pitted terrain.
          const cap = smoothstep(0.6, 0.72, v + (fbm(u, v, 10, 4, 3, 2203) - 0.5) * 0.1);
          const pits = smoothstep(0.5, 0.7, fbm(u, v, 30, 15, 2, 2205));
          let c = mix(base, hex('#8a7a78'), pits * 0.35 * (1 - cap));
          c = mix(c, hex('#f6e4de'), cap * 0.85);
          return mix(c, hex('#6a5a58'), (1 - n) * 0.1);
        },
        decorate: (ctx, w, h) => {
          // Dark plume streaks.
          const rand = rng(2207);
          ctx.strokeStyle = 'rgba(40,34,34,0.7)';
          ctx.lineWidth = 1.4;
          for (let i = 0; i < 40; i++) {
            const x = rand() * w;
            const y = (0.62 + rand() * 0.3) * h;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 7 + rand() * 6, y - 2 + rand() * 4);
            ctx.stroke();
          }
        },
      });
  }
}

// ── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<SphereArtId, PlanetTexture>();

/** Build a texture without caching it. The texture worker runs this (see textureLoader.ts). */
export function buildPlanetTexture(id: SphereArtId): PlanetTexture {
  return buildTexture(id);
}

/** The cached texture, or undefined if it has not been built yet. */
export function peekPlanetTexture(id: SphereArtId): PlanetTexture | undefined {
  return cache.get(id);
}

/** Store a texture that was built elsewhere (the worker) so later lookups are instant. */
export function cachePlanetTexture(id: SphereArtId, tex: PlanetTexture): void {
  cache.set(id, tex);
}

/** Build (once) and return the texture for a sphere body, on the calling thread. */
export function getPlanetTexture(id: SphereArtId): PlanetTexture {
  const hit = cache.get(id);
  if (hit) return hit;
  const tex = buildTexture(id);
  cache.set(id, tex);
  return tex;
}

// Exposed for components that need the same colour maths.
export { smoothstep };
