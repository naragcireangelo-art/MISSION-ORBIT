/**
 * flightHooks.ts — React hooks that turn the engine's InputRouter / ScanTelemetry events into
 * component state for the Explore HUD (MissionHud, ScanReticle, ScanSideToast).
 *
 * The engine objects live outside React (ExploreScreen owns them). Pass them in as props; the hooks
 * subscribe on mount and unsubscribe on unmount, so nothing leaks between missions.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  FlightPhase,
  InputRouter,
  ScanCompleteEvent,
  ScanProgress,
  ScanTelemetry,
  TelemetrySnapshot,
} from '../../engine/inputRouter';

/** Current flight phase (APPROACH / SCAN / RESUME). */
export function useFlightPhase(router: InputRouter): FlightPhase {
  const [phase, setPhase] = useState<FlightPhase>(() => router.getPhase());
  useEffect(() => {
    setPhase(router.getPhase());
    return router.on('phase', (e) => setPhase(e.phase));
  }, [router]);
  return phase;
}

/** True while a scan has the movement keys locked. */
export function useMovementLocked(router: InputRouter): boolean {
  return useFlightPhase(router) === 'SCAN';
}

export type ReticleStatus = 'idle' | 'active' | 'done';

/** The kind of feedback the last keystroke deserves. */
export type KeyFeedback = 'correct' | 'error' | 'forgiven';

export interface ReticleState {
  status: ReticleStatus;
  progress: ScanProgress | null;
  /** Feedback for the most recent key, plus a counter so repeated errors re-trigger animations. */
  feedback: KeyFeedback | null;
  feedbackSeq: number;
}

const IDLE: ReticleState = { status: 'idle', progress: null, feedback: null, feedbackSeq: 0 };

/** How long the reticle lingers on "SCANNED" before clearing. */
const DONE_HOLD_MS = 900;

/**
 * Live scan state for the reticle: which letters are typed, the last key's verdict, and a short
 * "done" hold after the final letter so the completion flash is visible.
 */
export function useReticleState(router: InputRouter): ReticleState {
  const [state, setState] = useState<ReticleState>(() => {
    const progress = router.getScanProgress();
    return progress ? { ...IDLE, status: 'active', progress } : IDLE;
  });

  useEffect(() => {
    let doneTimer: number | undefined;
    const clearDone = (): void => {
      if (doneTimer !== undefined) window.clearTimeout(doneTimer);
      doneTimer = undefined;
    };

    const offs = [
      router.on('scanStart', (progress) => {
        clearDone();
        setState({ status: 'active', progress, feedback: null, feedbackSeq: 0 });
      }),
      router.on('scanKey', (e) => {
        const feedback: KeyFeedback = e.correct ? 'correct' : e.forgiven ? 'forgiven' : 'error';
        setState((s) => ({ status: 'active', progress: e, feedback, feedbackSeq: s.feedbackSeq + 1 }));
      }),
      router.on('scanComplete', (e) => {
        clearDone();
        setState((s) => ({
          status: 'done',
          progress: { target: e.target, typed: e.target, remaining: '', index: e.target.length, length: e.target.length, ratio: 1 },
          feedback: 'correct',
          feedbackSeq: s.feedbackSeq + 1,
        }));
        doneTimer = window.setTimeout(() => setState(IDLE), DONE_HOLD_MS);
      }),
      // A cancelled scan (or a reset) drops straight back to APPROACH without `scanComplete`.
      router.on('phase', (e) => {
        if (e.phase === 'APPROACH' && e.previous === 'SCAN') {
          clearDone();
          setState(IDLE);
        }
      }),
    ];
    return () => {
      clearDone();
      offs.forEach((off) => off());
    };
  }, [router]);

  return state;
}

/** Subscribe to every completed scan (e.g. to queue toasts). The handler may change between renders. */
export function useScanComplete(router: InputRouter, handler: (e: ScanCompleteEvent) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => router.on('scanComplete', (e) => ref.current(e)), [router]);
}

/**
 * Polls the telemetry snapshot a few times a second. Snapshots are cheap; polling keeps the WPM
 * readout ticking during a scan without the engine needing to push every frame.
 */
export function useTelemetrySnapshot(telemetry: ScanTelemetry, intervalMs = 250): TelemetrySnapshot {
  const [snap, setSnap] = useState<TelemetrySnapshot>(() => telemetry.getSnapshot());
  useEffect(() => {
    setSnap(telemetry.getSnapshot());
    const id = window.setInterval(() => setSnap(telemetry.getSnapshot()), intervalMs);
    return () => window.clearInterval(id);
  }, [telemetry, intervalMs]);
  return snap;
}
