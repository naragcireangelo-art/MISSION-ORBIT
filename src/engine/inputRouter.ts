/**
 * inputRouter.ts — Phase-aware keyboard router + scan telemetry for the Explore screen.
 *
 * This file has two parts:
 *
 *   PART 1 — ScanTelemetry
 *     Typing analytics measured strictly during SCAN phases:
 *       - WPM             (5 correct characters = 1 word, timed in REAL seconds, not slow-mo seconds)
 *       - Scan accuracy   (correct keystrokes vs. penalized errors)
 *       - Error allowance (free errors granted by the Laser / LiDAR part, refilled every scan)
 *
 *   PART 2 — InputRouter
 *     APPROACH / RESUME : WASD + Arrow keys steer the satellite. Letters never reach the scanner.
 *     SCAN              : movement is locked and flushed; letters, digits and hyphens are
 *                         matched against the celestial body's name.
 *
 * Finishing a name fires `scanComplete` with the message "<Name> has been scanned"
 * and switches to RESUME, where movement works again straight away.
 *
 * This file has no dependencies.
 */

// ═════════════════════════════════════════════════════════════════════════════
// PART 1 — SCAN TELEMETRY
// ═════════════════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────────────────

/** How a single keystroke was judged. */
export type KeystrokeVerdict = 'correct' | 'forgiven' | 'penalized';

/** Stats for one finished scan (one planet / moon name). */
export interface ScanResult {
  target: string;
  correct: number;
  errors: number;
  forgivenErrors: number;
  penalizedErrors: number;
  seconds: number;
  wpm: number;
  /** 0..1 — forgiven errors do not lower this. */
  accuracy: number;
  /** True when the scan had zero penalized errors. */
  perfect: boolean;
}

/** Live numbers for the HUD and the outcome screens. */
export interface TelemetrySnapshot {
  /** Words per minute across every scan so far (including the one in progress). */
  wpm: number;
  /** 0..1 — multiply by 100 for a percentage. Forgiven errors do not lower this. */
  accuracy: number;
  /** 0..1 — accuracy counting every error, even forgiven ones. */
  rawAccuracy: number;
  correctKeystrokes: number;
  totalKeystrokes: number;
  errors: number;
  forgivenErrors: number;
  penalizedErrors: number;
  /** Free errors granted per scan by the equipped Laser. */
  errorAllowance: number;
  /** Free errors still unused in the current scan (full allowance when idle). */
  allowanceRemaining: number;
  /** Real seconds spent inside scan phases. */
  scanSeconds: number;
  scansCompleted: number;
  perfectScans: number;
  /** True while a scan is in progress. */
  scanning: boolean;
  /** Name being scanned right now, or null. */
  currentTarget: string | null;
}

export interface ScanTelemetryOptions {
  /** Free errors per scan (from the Laser part). Default 0. */
  errorAllowance?: number;
}

interface Counters {
  correct: number;
  forgiven: number;
  penalized: number;
  seconds: number;
}

// ── Constants & helpers ──────────────────────────────────────────────────────

const CHARS_PER_WORD = 5;

/** Standard typing-test WPM: (characters / 5) per minute. */
export function calculateWpm(correctCharacters: number, seconds: number): number {
  if (seconds <= 0 || correctCharacters <= 0) return 0;
  return correctCharacters / CHARS_PER_WORD / (seconds / 60);
}

/** Share of keystrokes that were correct, 0..1. Returns 1 when nothing was typed yet. */
export function calculateAccuracy(correct: number, errors: number): number {
  const total = correct + errors;
  return total === 0 ? 1 : correct / total;
}

function emptyCounters(): Counters {
  return { correct: 0, forgiven: 0, penalized: 0, seconds: 0 };
}

function sanitizeAllowance(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

// ── Class ────────────────────────────────────────────────────────────────────

export class ScanTelemetry {
  private errorAllowance: number;
  /** Finished scans only. */
  private totals: Counters = emptyCounters();
  /** The scan in progress, or null. Merged into totals by endScan(). */
  private current: Counters | null = null;
  private currentTarget: string | null = null;
  private scansCompleted = 0;
  private perfectScans = 0;
  private history: ScanResult[] = [];

  constructor(options: ScanTelemetryOptions = {}) {
    this.errorAllowance = sanitizeAllowance(options.errorAllowance ?? 0);
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  /** Set the free errors per scan (call when the Laser part is known / changed). */
  setErrorAllowance(allowance: number): void {
    this.errorAllowance = sanitizeAllowance(allowance);
  }

  /** Wipe everything. Call when a mission starts or is retried. */
  reset(): void {
    this.totals = emptyCounters();
    this.current = null;
    this.currentTarget = null;
    this.scansCompleted = 0;
    this.perfectScans = 0;
    this.history = [];
  }

  // ── Recording a scan ───────────────────────────────────────────────────────

  /** Start timing a scan. The error allowance refills. */
  beginScan(target: string): void {
    this.current = emptyCounters();
    this.currentTarget = target;
  }

  /** Record one typed character. Ignored when no scan is active. */
  recordKeystroke(correct: boolean): KeystrokeVerdict {
    const scan = this.current;
    if (!scan) return correct ? 'correct' : 'penalized';

    if (correct) {
      scan.correct += 1;
      return 'correct';
    }
    if (scan.forgiven < this.errorAllowance) {
      scan.forgiven += 1;
      return 'forgiven';
    }
    scan.penalized += 1;
    return 'penalized';
  }

  /**
   * Advance the scan clock. Pass REAL (unscaled) seconds — `step.realDt` from the
   * game loop — so slow-mo does not inflate WPM. Does nothing outside a scan.
   */
  tick(realSeconds: number): void {
    if (this.current && realSeconds > 0) this.current.seconds += realSeconds;
  }

  /** Finish the active scan, commit it to the totals and return its stats. */
  endScan(): ScanResult | null {
    const scan = this.current;
    if (!scan) return null;

    const result: ScanResult = {
      target: this.currentTarget ?? '',
      correct: scan.correct,
      errors: scan.forgiven + scan.penalized,
      forgivenErrors: scan.forgiven,
      penalizedErrors: scan.penalized,
      seconds: scan.seconds,
      wpm: calculateWpm(scan.correct, scan.seconds),
      accuracy: calculateAccuracy(scan.correct, scan.penalized),
      perfect: scan.penalized === 0,
    };

    this.totals.correct += scan.correct;
    this.totals.forgiven += scan.forgiven;
    this.totals.penalized += scan.penalized;
    this.totals.seconds += scan.seconds;
    this.scansCompleted += 1;
    if (result.perfect) this.perfectScans += 1;
    this.history.push(result);

    this.current = null;
    this.currentTarget = null;
    return result;
  }

  /** Abort the active scan and throw its numbers away (e.g. mission ended mid-scan). */
  cancelScan(): void {
    this.current = null;
    this.currentTarget = null;
  }

  // ── Reading results ────────────────────────────────────────────────────────

  /** Per-scan results in the order they were completed. */
  getScanHistory(): readonly ScanResult[] {
    return this.history;
  }

  /** Live numbers, including the scan in progress. Cheap enough to call every frame. */
  getSnapshot(): TelemetrySnapshot {
    const live = this.current ?? emptyCounters();
    const correct = this.totals.correct + live.correct;
    const forgiven = this.totals.forgiven + live.forgiven;
    const penalized = this.totals.penalized + live.penalized;
    const seconds = this.totals.seconds + live.seconds;
    const errors = forgiven + penalized;

    return {
      wpm: calculateWpm(correct, seconds),
      accuracy: calculateAccuracy(correct, penalized),
      rawAccuracy: calculateAccuracy(correct, errors),
      correctKeystrokes: correct,
      totalKeystrokes: correct + errors,
      errors,
      forgivenErrors: forgiven,
      penalizedErrors: penalized,
      errorAllowance: this.errorAllowance,
      allowanceRemaining: Math.max(0, this.errorAllowance - live.forgiven),
      scanSeconds: seconds,
      scansCompleted: this.scansCompleted,
      perfectScans: this.perfectScans,
      scanning: this.current !== null,
      currentTarget: this.currentTarget,
    };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PART 2 — INPUT ROUTER
// ═════════════════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────────────────

export type FlightPhase = 'APPROACH' | 'SCAN' | 'RESUME';

/** Steering direction. x: -1 left .. +1 right, y: -1 up .. +1 down (canvas axes). Length is 0 or 1. */
export interface MovementVector {
  x: number;
  y: number;
}

/** Where the player is in the current name. Drives the reticle letter highlighting. */
export interface ScanProgress {
  /** Full name as displayed, e.g. "WASP-39b". */
  target: string;
  /** Letters already matched (highlight these). */
  typed: string;
  /** Letters still to type. */
  remaining: string;
  /** Index of the next character to type. */
  index: number;
  length: number;
  /** 0..1 */
  ratio: number;
}

export interface ScanKeyEvent extends ScanProgress {
  /** The character the player pressed. */
  key: string;
  /** The character that was expected. */
  expected: string;
  correct: boolean;
  /** True for a wrong key that the Laser's error allowance absorbed. */
  forgiven: boolean;
}

export interface ScanCompleteEvent {
  target: string;
  /** Ready-made toast text: "<Name> has been scanned". */
  message: string;
  /** Stats for this scan, or null when no telemetry is attached. */
  result: ScanResult | null;
}

export interface PhaseChangeEvent {
  phase: FlightPhase;
  previous: FlightPhase;
}

export interface InputRouterEvents {
  phase: PhaseChangeEvent;
  scanStart: ScanProgress;
  /** Every typed character during a scan. Play the error thud when `correct` is false. */
  scanKey: ScanKeyEvent;
  scanComplete: ScanCompleteEvent;
}

export interface InputRouterOptions {
  /** When given, keystrokes and scan start/end are recorded automatically. */
  telemetry?: ScanTelemetry;
}

/** The parts of a KeyboardEvent the router reads. A real KeyboardEvent fits. */
export interface KeyboardEventLike {
  code: string;
  key: string;
  repeat?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: unknown;
  preventDefault?: () => void;
}

type Direction = 'up' | 'down' | 'left' | 'right';
type Handler<T> = (event: T) => void;

// ── Constants & helpers ──────────────────────────────────────────────────────

const MOVEMENT_KEYS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

/** Characters the player is expected to type. Anything else in a name is skipped for them. */
const TYPABLE = /^[a-z0-9-]$/i;

export function isMovementKey(code: string): boolean {
  return code in MOVEMENT_KEYS;
}

/** True when the key press belongs to a text field (e.g. a debug input), not the game. */
function isEditableTarget(target: unknown): boolean {
  if (typeof target !== 'object' || target === null) return false;
  const element = target as { tagName?: unknown; isContentEditable?: unknown };
  if (element.isContentEditable === true) return true;
  return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT';
}

// ── Class ────────────────────────────────────────────────────────────────────

export class InputRouter {
  private readonly telemetry: ScanTelemetry | null;
  private readonly heldKeys = new Set<string>();
  private readonly listeners: { [K in keyof InputRouterEvents]: Set<Handler<InputRouterEvents[K]>> } = {
    phase: new Set(),
    scanStart: new Set(),
    scanKey: new Set(),
    scanComplete: new Set(),
  };

  private phase: FlightPhase = 'APPROACH';
  private scanTarget: string | null = null;
  private scanIndex = 0;
  private attachedTo: Window | null = null;

  constructor(options: InputRouterOptions = {}) {
    this.telemetry = options.telemetry ?? null;
  }

  // ── Listening ──────────────────────────────────────────────────────────────

  /** Start listening to the keyboard. Call from the Explore screen's mount effect. */
  attach(target: Window = window): void {
    this.detach();
    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('blur', this.handleBlur);
    this.attachedTo = target;
  }

  /** Stop listening. Call from the Explore screen's unmount cleanup. */
  detach(): void {
    const target = this.attachedTo;
    if (!target) return;

    target.removeEventListener('keydown', this.handleKeyDown);
    target.removeEventListener('keyup', this.handleKeyUp);
    target.removeEventListener('blur', this.handleBlur);
    this.attachedTo = null;
    this.heldKeys.clear();
  }

  /** Subscribe to an event. Returns a function that unsubscribes. */
  on<K extends keyof InputRouterEvents>(event: K, handler: Handler<InputRouterEvents[K]>): () => void {
    const handlers = this.listeners[event];
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  // ── Reading state ──────────────────────────────────────────────────────────

  getPhase(): FlightPhase {
    return this.phase;
  }

  /** True during SCAN — show the "MOVEMENT LOCKED — TYPE TO SCAN" badge. */
  isMovementLocked(): boolean {
    return this.phase === 'SCAN';
  }

  /** Current steering direction. Always zero while movement is locked. */
  getMovement(): MovementVector {
    if (this.phase === 'SCAN') return { x: 0, y: 0 };

    let x = 0;
    let y = 0;
    for (const code of this.heldKeys) {
      const direction = MOVEMENT_KEYS[code];
      if (direction === 'left') x -= 1;
      else if (direction === 'right') x += 1;
      else if (direction === 'up') y -= 1;
      else if (direction === 'down') y += 1;
    }

    // Arrow + WASD for the same direction must not double the speed.
    x = Math.sign(x);
    y = Math.sign(y);

    // Diagonals keep the same top speed as straight lines.
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  /** Progress through the active name, or null when not scanning. */
  getScanProgress(): ScanProgress | null {
    const target = this.scanTarget;
    if (target === null) return null;

    return {
      target,
      typed: target.slice(0, this.scanIndex),
      remaining: target.slice(this.scanIndex),
      index: this.scanIndex,
      length: target.length,
      ratio: target.length === 0 ? 1 : this.scanIndex / target.length,
    };
  }

  // ── Phase control ──────────────────────────────────────────────────────────

  /** A body entered antenna range: lock movement and start matching its name. */
  beginScan(targetName: string): void {
    if (this.scanTarget !== null) this.telemetry?.cancelScan();

    this.heldKeys.clear(); // halt cleanly, no drifting
    this.scanTarget = targetName;
    this.scanIndex = 0;
    this.skipUntypable();
    this.telemetry?.beginScan(targetName);
    this.setPhase('SCAN');

    const progress = this.getScanProgress();
    if (progress) this.emit('scanStart', progress);
    if (this.scanIndex >= targetName.length) this.completeScan(); // nothing to type
  }

  /** Abort the active scan without completing it and return to APPROACH. */
  cancelScan(): void {
    if (this.scanTarget === null) return;

    this.scanTarget = null;
    this.scanIndex = 0;
    this.telemetry?.cancelScan();
    this.setPhase('APPROACH');
  }

  /** RESUME → APPROACH. Call once the time scale is back at 1.0. */
  finishResume(): void {
    if (this.phase === 'RESUME') this.setPhase('APPROACH');
  }

  /** Back to a clean APPROACH state. Call when a mission starts or is retried. */
  reset(): void {
    if (this.scanTarget !== null) this.telemetry?.cancelScan();

    this.heldKeys.clear();
    this.scanTarget = null;
    this.scanIndex = 0;
    this.setPhase('APPROACH');
  }

  // ── Keyboard handlers (public so they can be driven directly in tests) ─────

  handleKeyDown = (event: KeyboardEventLike): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return; // leave browser shortcuts alone
    if (isEditableTarget(event.target)) return;

    const movement = isMovementKey(event.code);
    const typable = event.key.length === 1 && TYPABLE.test(event.key);

    if (this.phase === 'SCAN') {
      if (movement || typable) event.preventDefault?.();
      if (event.repeat) return; // holding a key must not spam characters
      if (typable) this.typeCharacter(event.key);
      return;
    }

    if (movement) {
      event.preventDefault?.(); // stop the arrow keys scrolling the page
      this.heldKeys.add(event.code);
    }
  };

  handleKeyUp = (event: KeyboardEventLike): void => {
    this.heldKeys.delete(event.code);
  };

  /** Window lost focus: key-up events will be missed, so release everything. */
  handleBlur = (): void => {
    this.heldKeys.clear();
  };

  // ── Internals ──────────────────────────────────────────────────────────────

  private typeCharacter(key: string): void {
    const target = this.scanTarget;
    if (target === null) return;

    const expected = target.charAt(this.scanIndex);
    const correct = key.toLowerCase() === expected.toLowerCase();
    const verdict = this.telemetry?.recordKeystroke(correct);

    if (correct) {
      this.scanIndex += 1;
      this.skipUntypable();
    }

    const progress = this.getScanProgress();
    if (progress) {
      this.emit('scanKey', { ...progress, key, expected, correct, forgiven: verdict === 'forgiven' });
    }
    if (this.scanIndex >= target.length) this.completeScan();
  }

  /** Jump over spaces, apostrophes, etc. so the player only types letters, digits and hyphens. */
  private skipUntypable(): void {
    const target = this.scanTarget;
    if (target === null) return;

    while (this.scanIndex < target.length && !TYPABLE.test(target.charAt(this.scanIndex))) {
      this.scanIndex += 1;
    }
  }

  private completeScan(): void {
    const target = this.scanTarget;
    if (target === null) return;

    const result = this.telemetry?.endScan() ?? null;
    this.scanTarget = null;
    this.scanIndex = 0;
    this.setPhase('RESUME'); // movement keys work again from here
    this.emit('scanComplete', { target, message: `${target} has been scanned`, result });
  }

  private setPhase(next: FlightPhase): void {
    const previous = this.phase;
    if (previous === next) return;

    this.phase = next;
    if (next === 'SCAN') this.heldKeys.clear();
    this.emit('phase', { phase: next, previous });
  }

  private emit<K extends keyof InputRouterEvents>(event: K, payload: InputRouterEvents[K]): void {
    for (const handler of [...this.listeners[event]]) handler(payload);
  }
}