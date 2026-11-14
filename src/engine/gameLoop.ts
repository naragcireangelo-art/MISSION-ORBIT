/**
 * gameLoop.ts — Fixed-timestep game loop + Canvas 2D render pipeline for Mission Orbit.
 *
 *   - Simulation always advances in exact 1/60 s steps, whatever the monitor's refresh rate.
 *   - A time scale eases smoothly between 1.0 (normal) and 0.25 (scan slow-mo).
 *   - Rendering is orchestrated as ordered layers drawn onto one HTML5 canvas.
 *
 * Other modules plug in without this file importing them:
 *   loop.addSystem('physics', (step) => { ... })     // runs 60x per second
 *   loop.addLayer('asteroids', (frame) => { ... })   // runs once per displayed frame
 *
 * This file has no dependencies.
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** Passed to every system on every fixed step. */
export interface StepInfo {
  /** Game seconds for this step (already multiplied by the time scale). Use for world motion. */
  dt: number;
  /** Real seconds for this step (always 1/60). Use for timers that ignore slow-mo, e.g. WPM. */
  realDt: number;
  /** Current time scale, 0.25 .. 1.0. */
  timeScale: number;
  /** Total game seconds simulated so far (slows down during scans). */
  gameTime: number;
  /** Total real seconds simulated so far. */
  realTime: number;
}

/** Passed to every layer on every rendered frame. */
export interface RenderInfo {
  ctx: CanvasRenderingContext2D;
  /** Canvas size in CSS pixels. Draw in these units; device-pixel scaling is already applied. */
  width: number;
  height: number;
  dpr: number;
  /** 0..1 — how far we are between the last step and the next. Use to interpolate positions. */
  alpha: number;
  timeScale: number;
  gameTime: number;
  realTime: number;
  /** Smoothed frames per second, for a debug readout. */
  fps: number;
}

export type SystemFn = (step: StepInfo) => void;
export type LayerFn = (frame: RenderInfo) => void;

export interface GameLoopOptions {
  /** Canvas to draw on. Can also be set later with attachCanvas(). */
  canvas?: HTMLCanvasElement | null;
  /** Fill colour painted before the layers. Pass null for a transparent canvas. Default deep-space navy. */
  background?: string | null;
  /** Default length of time-scale transitions in real seconds. */
  easeSeconds?: number;
  /** Cap on devicePixelRatio, to keep 4K / retina canvases cheap. Default 2. */
  maxDpr?: number;
  /** Called when a time-scale transition finishes, with the scale that was reached. */
  onTimeScaleSettled?: (timeScale: number) => void;
}

interface Ordered<T> {
  name: string;
  order: number;
  fn: T;
}

// ── Constants & helpers ──────────────────────────────────────────────────────

export const FIXED_FPS = 60;
/** Length of one simulation step in seconds. */
export const FIXED_DT = 1 / FIXED_FPS;
export const NORMAL_TIME_SCALE = 1.0;
export const SCAN_TIME_SCALE = 0.25;
/** Default real-time length of a slow-mo transition, in seconds. */
export const DEFAULT_EASE_SECONDS = 0.6;

/** A longer gap than this (tab was hidden, debugger pause) is treated as this long. */
const MAX_FRAME_SECONDS = 0.25;
const DEFAULT_BACKGROUND = '#05070f';
const DEFAULT_MAX_DPR = 2;

/** Insert keeping the list sorted by `order` (ties keep insertion order). Returns a remover. */
function insertOrdered<T>(list: Ordered<T>[], entry: Ordered<T>): () => void {
  let index = list.length;
  while (index > 0 && list[index - 1].order > entry.order) index -= 1;
  list.splice(index, 0, entry);

  return () => {
    const at = list.indexOf(entry);
    if (at !== -1) list.splice(at, 1);
  };
}

// ── Class ────────────────────────────────────────────────────────────────────

export class GameLoop {
  private readonly systems: Ordered<SystemFn>[] = [];
  private readonly layers: Ordered<LayerFn>[] = [];
  private readonly background: string | null;
  private readonly easeSeconds: number;
  private readonly maxDpr: number;
  private readonly onTimeScaleSettled: ((timeScale: number) => void) | null;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private running = false;
  private paused = false;
  private rafId: number | null = null;
  private lastFrameMs: number | null = null;
  private accumulator = 0;
  private gameTime = 0;
  private realTime = 0;
  private fps = FIXED_FPS;

  private timeScale = NORMAL_TIME_SCALE;
  private targetTimeScale = NORMAL_TIME_SCALE;
  private easeFrom = NORMAL_TIME_SCALE;
  private easeElapsed = 0;
  private easeDuration = 0;
  private easing = false;

  constructor(options: GameLoopOptions = {}) {
    this.background = options.background === undefined ? DEFAULT_BACKGROUND : options.background;
    this.easeSeconds = options.easeSeconds ?? DEFAULT_EASE_SECONDS;
    this.maxDpr = options.maxDpr ?? DEFAULT_MAX_DPR;
    this.onTimeScaleSettled = options.onTimeScaleSettled ?? null;
    if (options.canvas) this.attachCanvas(options.canvas);
  }

  // ── Registration ───────────────────────────────────────────────────────────

  /**
   * Add simulation code that runs every fixed step. Lower `order` runs first
   * (e.g. spawner 10, physics 20, collisions 30). Returns a function that removes it.
   */
  addSystem(name: string, fn: SystemFn, order = 0): () => void {
    return insertOrdered(this.systems, { name, order, fn });
  }

  /**
   * Add drawing code that runs every rendered frame. Lower `order` is drawn first,
   * i.e. further back (e.g. starfield 0, planets 10, asteroids 20, satellite 30).
   * Returns a function that removes it.
   */
  addLayer(name: string, fn: LayerFn, order = 0): () => void {
    return insertOrdered(this.layers, { name, order, fn });
  }

  /** Set (or clear with null) the canvas to render to. Safe to call from a React ref effect. */
  attachCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Start the loop. Does nothing if it is already running. */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastFrameMs = null;
    this.rafId = requestAnimationFrame(this.onAnimationFrame);
  }

  /** Stop the loop completely. Call from the Explore screen's unmount cleanup. */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.lastFrameMs = null;
  }

  /** Freeze the simulation but keep drawing (for a pause menu). */
  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  /** Reset clocks and time scale for a fresh mission attempt. Systems and layers stay registered. */
  reset(): void {
    this.accumulator = 0;
    this.gameTime = 0;
    this.realTime = 0;
    this.lastFrameMs = null;
    this.paused = false;
    this.timeScale = NORMAL_TIME_SCALE;
    this.targetTimeScale = NORMAL_TIME_SCALE;
    this.easing = false;
  }

  // ── Time scale ─────────────────────────────────────────────────────────────

  /**
   * Ease the time scale to `target` over `seconds` of real time.
   * Calling it mid-transition is fine: the new ease starts from the current value.
   */
  setTargetTimeScale(target: number, seconds: number = this.easeSeconds): void {
    const clamped = Math.min(Math.max(target, 0), 4);
    if (clamped === this.targetTimeScale && (this.easing || this.timeScale === clamped)) return;

    this.targetTimeScale = clamped;
    this.easeFrom = this.timeScale;
    this.easeElapsed = 0;
    this.easeDuration = Math.max(0, seconds);
    this.easing = true;
    if (this.easeDuration === 0 || this.easeFrom === clamped) this.settleTimeScale();
  }

  /** Ease down to 25% speed for a scan. */
  enterSlowMo(seconds?: number): void {
    this.setTargetTimeScale(SCAN_TIME_SCALE, seconds);
  }

  /** Ease back up to 100% speed after a scan. */
  exitSlowMo(seconds?: number): void {
    this.setTargetTimeScale(NORMAL_TIME_SCALE, seconds);
  }

  // ── Reading state ──────────────────────────────────────────────────────────

  isRunning(): boolean {
    return this.running;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  getTargetTimeScale(): number {
    return this.targetTimeScale;
  }

  getGameTime(): number {
    return this.gameTime;
  }

  getFps(): number {
    return this.fps;
  }

  // ── Frame ──────────────────────────────────────────────────────────────────

  /**
   * Run one display frame covering `frameSeconds` of real time: zero or more
   * fixed steps, then one render. requestAnimationFrame calls this for you;
   * it is public so tests can drive the loop by hand.
   */
  advance(frameSeconds: number): void {
    const elapsed = Math.min(Math.max(frameSeconds, 0), MAX_FRAME_SECONDS);
    if (elapsed > 0) this.fps += (1 / elapsed - this.fps) * 0.1;

    if (!this.paused) {
      const wasRunning = this.running;
      this.accumulator += elapsed;
      while (this.accumulator >= FIXED_DT) {
        this.step();
        this.accumulator -= FIXED_DT;
        if (this.paused || (wasRunning && !this.running)) break; // a system paused or stopped the loop
      }
    }

    this.render(Math.min(this.accumulator / FIXED_DT, 1));
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private onAnimationFrame = (nowMs: number): void => {
    if (!this.running) return;

    const elapsed = this.lastFrameMs === null ? 0 : (nowMs - this.lastFrameMs) / 1000;
    this.lastFrameMs = nowMs;
    this.advance(elapsed);
    if (this.running) this.rafId = requestAnimationFrame(this.onAnimationFrame);
  };

  private step(): void {
    this.advanceTimeScale(FIXED_DT);

    const dt = FIXED_DT * this.timeScale;
    this.gameTime += dt;
    this.realTime += FIXED_DT;

    const info: StepInfo = {
      dt,
      realDt: FIXED_DT,
      timeScale: this.timeScale,
      gameTime: this.gameTime,
      realTime: this.realTime,
    };
    for (const system of [...this.systems]) system.fn(info);
  }

  private advanceTimeScale(realDt: number): void {
    if (!this.easing) return;

    this.easeElapsed += realDt;
    const t = Math.min(this.easeElapsed / this.easeDuration, 1);
    if (t >= 1) {
      this.settleTimeScale();
      return;
    }

    const eased = t * t * (3 - 2 * t); // smoothstep: gentle start and gentle finish
    this.timeScale = this.easeFrom + (this.targetTimeScale - this.easeFrom) * eased;
  }

  private settleTimeScale(): void {
    this.timeScale = this.targetTimeScale;
    this.easing = false;
    this.onTimeScaleSettled?.(this.timeScale);
  }

  private render(alpha: number): void {
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!canvas || !ctx) return;

    // Keep the backing store matched to the element's on-screen size so vectors stay crisp.
    const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, this.maxDpr);
    const width = canvas.clientWidth || canvas.width / dpr;
    const height = canvas.clientHeight || canvas.height / dpr;
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (this.background !== null) {
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, width, height);
    }

    const info: RenderInfo = {
      ctx,
      width,
      height,
      dpr,
      alpha,
      timeScale: this.timeScale,
      gameTime: this.gameTime,
      realTime: this.realTime,
      fps: this.fps,
    };
    for (const layer of [...this.layers]) {
      ctx.save(); // one layer's styles and transforms never leak into the next
      layer.fn(info);
      ctx.restore();
    }
  }
}