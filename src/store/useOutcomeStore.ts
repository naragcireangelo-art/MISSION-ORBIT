/**
 * useOutcomeStore.ts — Results of the last flight + career totals, for the outcome screens.
 *
 * ── HOW EXPLORE HANDS OVER ───────────────────────────────────────────────────
 * When the run ends, ExploreScreen calls ONE function. It writes the report, updates career
 * totals, saves stars via useGameStore.completeMission, and switches screen:
 *
 *   import { reportMissionComplete, reportSignalLost } from '../store/useOutcomeStore';
 *
 *   // all targets scanned
 *   reportMissionComplete({
 *     missionId: mission.id,
 *     satelliteName,
 *     scanned: scannedThisRun,              // body ids or names, in scan order
 *     telemetry: telemetry.getSnapshot(),   // from engine/inputRouter
 *     flight: { hull, maxHull, hullHits, nearMisses, asteroidsDodged, flightSeconds },
 *   });
 *
 *   // hull reached 0
 *   reportSignalLost({ ...sameFields, lossCause: 'Asteroid impact in the Io approach corridor' });
 *
 * Kept separate from useGameStore so the store owner and the Explore owner don't collide on merges.
 * Career totals are saved to localStorage under their own key.
 */

import { create } from 'zustand';
import type { TelemetrySnapshot } from '../engine/inputRouter';
import { calculateWpm } from '../engine/inputRouter';
import { getMission } from '../data/missions';
import { findBody } from '../components/flight/bodyLookup';
import { useGameStore } from './useGameStore';

// ── Types ────────────────────────────────────────────────────────────────────

export type RunOutcome = 'complete' | 'lost';

export interface FlightStats {
  hull: number;
  maxHull: number;
  hullHits: number;
  nearMisses: number;
  asteroidsDodged: number;
  /** Real seconds from launch to the end of the run. */
  flightSeconds: number;
}

export interface MissionRunInput {
  missionId: string;
  satelliteName?: string;
  /** Bodies scanned this run (ids or display names). */
  scanned: readonly string[];
  telemetry: TelemetrySnapshot;
  flight: FlightStats;
  /** Signal Lost only: what took the craft out. */
  lossCause?: string;
}

export interface StarCriterion {
  id: 'complete' | 'accuracy' | 'hull';
  label: string;
  earned: boolean;
}

export interface MissionReport {
  outcome: RunOutcome;
  missionId: string;
  satelliteName: string;
  /** Body ids scanned this run, in order. */
  scannedIds: string[];
  wpm: number;
  /** 0..1 */
  accuracy: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  scanSeconds: number;
  scansCompleted: number;
  perfectScans: number;
  flight: FlightStats;
  stars: number;
  criteria: StarCriterion[];
  lossCause: string | null;
  finishedAt: number;
}

export interface CareerMission {
  bestStars: number;
  completions: number;
  /** Worlds documented on the best completed run. */
  scannedIds: string[];
}

export interface Career {
  asteroidsDodged: number;
  nearMisses: number;
  /** For career WPM: correct scan keystrokes and scan seconds across every run. */
  correctKeystrokes: number;
  scanSeconds: number;
  signalsLost: number;
  missions: Record<string, CareerMission>;
}

export interface OutcomeState {
  lastReport: MissionReport | null;
  career: Career;
  /** Store a finished run without changing screen (mostly for tests and previews). */
  recordRun: (outcome: RunOutcome, input: MissionRunInput) => MissionReport;
  resetCareer: () => void;
}

// ── Rating ───────────────────────────────────────────────────────────────────

/** Star thresholds — one star each. Shown on the Mission Complete screen. */
export const STAR_RULES = {
  accuracy: 0.9,
  hull: 0.5,
} as const;

export function rateRun(outcome: RunOutcome, accuracy: number, hull: number, maxHull: number): StarCriterion[] {
  const hullRatio = maxHull > 0 ? hull / maxHull : 0;
  return [
    { id: 'complete', label: 'All targets scanned', earned: outcome === 'complete' },
    {
      id: 'accuracy',
      label: `Scan accuracy ${Math.round(STAR_RULES.accuracy * 100)}% or better`,
      earned: outcome === 'complete' && accuracy >= STAR_RULES.accuracy,
    },
    {
      id: 'hull',
      label: `Hull integrity ${Math.round(STAR_RULES.hull * 100)}% or better`,
      earned: outcome === 'complete' && hullRatio >= STAR_RULES.hull,
    },
  ];
}

/** Career words per minute across every scan ever typed. */
export function careerWpm(career: Career): number {
  return calculateWpm(career.correctKeystrokes, career.scanSeconds);
}

// ── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mission-orbit:career:v1';

const EMPTY_CAREER: Career = {
  asteroidsDodged: 0,
  nearMisses: 0,
  correctKeystrokes: 0,
  scanSeconds: 0,
  signalsLost: 0,
  missions: {},
};

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

function loadCareer(): Career {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_CAREER, missions: {} };
    const data = JSON.parse(raw) as Partial<Career>;
    const missions: Record<string, CareerMission> = {};
    if (data.missions && typeof data.missions === 'object') {
      for (const [id, m] of Object.entries(data.missions)) {
        if (!m || typeof m !== 'object') continue;
        missions[id] = {
          bestStars: Math.min(3, num(m.bestStars)),
          completions: num(m.completions),
          scannedIds: Array.isArray(m.scannedIds) ? m.scannedIds.filter((s) => typeof s === 'string') : [],
        };
      }
    }
    return {
      asteroidsDodged: num(data.asteroidsDodged),
      nearMisses: num(data.nearMisses),
      correctKeystrokes: num(data.correctKeystrokes),
      scanSeconds: num(data.scanSeconds),
      signalsLost: num(data.signalsLost),
      missions,
    };
  } catch {
    return { ...EMPTY_CAREER, missions: {} };
  }
}

function saveCareer(career: Career): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(career));
  } catch {
    /* private mode / storage full — career just won't persist */
  }
}

// ── Store ────────────────────────────────────────────────────────────────────

function toIds(names: readonly string[]): string[] {
  const out: string[] = [];
  for (const n of names) {
    const id = findBody(n)?.id;
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export const useOutcomeStore = create<OutcomeState>()((set, get) => ({
  lastReport: null,
  career: loadCareer(),

  recordRun: (outcome, input) => {
    const { telemetry: t, flight } = input;
    const mission = getMission(input.missionId);
    const criteria = rateRun(outcome, t.accuracy, flight.hull, flight.maxHull);
    const stars = criteria.filter((c) => c.earned).length;
    const scannedIds = toIds(input.scanned);

    const report: MissionReport = {
      outcome,
      missionId: input.missionId,
      satelliteName: input.satelliteName?.trim() || (mission ? `${mission.callsignBase}-II` : 'SATELLITE'),
      scannedIds,
      wpm: t.wpm,
      accuracy: t.accuracy,
      totalKeystrokes: t.totalKeystrokes,
      correctKeystrokes: t.correctKeystrokes,
      scanSeconds: t.scanSeconds,
      scansCompleted: t.scansCompleted,
      perfectScans: t.perfectScans,
      flight: { ...flight },
      stars,
      criteria,
      lossCause: outcome === 'lost' ? input.lossCause?.trim() || null : null,
      finishedAt: Date.now(),
    };

    const prev = get().career;
    const prevMission = prev.missions[input.missionId];
    const missions = { ...prev.missions };
    if (outcome === 'complete') {
      const better = !prevMission || stars >= prevMission.bestStars;
      missions[input.missionId] = {
        bestStars: Math.max(stars, prevMission?.bestStars ?? 0),
        completions: (prevMission?.completions ?? 0) + 1,
        scannedIds: better ? scannedIds : prevMission.scannedIds,
      };
    }
    const career: Career = {
      asteroidsDodged: prev.asteroidsDodged + Math.max(0, flight.asteroidsDodged),
      nearMisses: prev.nearMisses + Math.max(0, flight.nearMisses),
      correctKeystrokes: prev.correctKeystrokes + Math.max(0, t.correctKeystrokes),
      scanSeconds: prev.scanSeconds + Math.max(0, t.scanSeconds),
      signalsLost: prev.signalsLost + (outcome === 'lost' ? 1 : 0),
      missions,
    };

    saveCareer(career);
    set({ lastReport: report, career });
    return report;
  },

  resetCareer: () => {
    const career: Career = { ...EMPTY_CAREER, missions: {} };
    saveCareer(career);
    set({ career, lastReport: null });
  },
}));

// ── Hand-over helpers for ExploreScreen ─────────────────────────────────────

/** All targets scanned: save the run + stars and open the Mission Complete screen. */
export function reportMissionComplete(input: MissionRunInput): MissionReport {
  const report = useOutcomeStore.getState().recordRun('complete', input);
  const game = useGameStore.getState();
  game.completeMission(input.missionId as Parameters<typeof game.completeMission>[0], report.stars);
  game.setScreen('complete');
  return report;
}

/** Hull reached 0: save the run and open the Signal Lost screen. */
export function reportSignalLost(input: MissionRunInput): MissionReport {
  const report = useOutcomeStore.getState().recordRun('lost', input);
  useGameStore.getState().setScreen('lost');
  return report;
}
