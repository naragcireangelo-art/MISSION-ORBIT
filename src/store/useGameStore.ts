/**
 * useGameStore.ts — Zustand store: current screen, selected mission, satellite name, progress.
 *
 * ── TEAM NOTE ────────────────────────────────────────────────────────────────
 * This is the slice the Entry / Archive / Briefing screens need. If the store already
 * exists in your project, merge these fields into it (keep the same names) rather than
 * replacing it. Fields used by Jaz's screens:
 *
 *   currentScreen, setScreen(screen)
 *   selectedMissionId, selectMission(id)       (selecting a mission also resets the callsign)
 *   satelliteName, setSatelliteName(name)      (Assembly writes it; Briefing reads it)
 *   completedMissionIds, missionStars          (Outcome screens write them via completeMission)
 *   scannedBodies, markScanned(name)           (Explore writes them on `scanComplete`)
 *   muted, toggleMute(), setMuted(bool)
 *   codexOpen, codexFocus, openCodex(name?), closeCodex()
 *
 * Progress (completed missions, stars, scanned worlds, mute) is saved to localStorage.
 * Written for zustand v4 and v5 (curried `create<State>()(...)`).
 */

import { create } from 'zustand';
import { defaultCallsign, getMission } from '../data/missions';

type MissionId = string;

// ── Types ────────────────────────────────────────────────────────────────────

export type ScreenId =
  | 'splash'
  | 'archive'
  | 'assembly'
  | 'briefing'
  | 'objectives'
  | 'explore'
  | 'complete'
  | 'lost'
  | 'outro';

interface PersistedState {
  completedMissionIds: MissionId[];
  missionStars: Record<string, number>;
  scannedBodies: string[];
  muted: boolean;
}

export interface GameState extends PersistedState {
  currentScreen: ScreenId;
  selectedMissionId: MissionId | null;
  satelliteName: string;
  codexOpen: boolean;
  /** Scan name of the Codex entry to open first (or null for the first entry). */
  codexFocus: string | null;

  setScreen: (screen: ScreenId) => void;
  selectMission: (id: MissionId) => void;
  setSatelliteName: (name: string) => void;
  completeMission: (id: MissionId, stars: number) => void;
  markScanned: (bodyName: string) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  openCodex: (focusScanName?: string) => void;
  closeCodex: () => void;
  resetProgress: () => void;
}

// ── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mission-orbit:v1';

const EMPTY_PERSISTED: PersistedState = {
  completedMissionIds: [],
  missionStars: {},
  scannedBodies: [],
  muted: false,
};

function loadPersisted(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_PERSISTED };
    const data = JSON.parse(raw) as Partial<PersistedState>;
    return {
      completedMissionIds: Array.isArray(data.completedMissionIds) ? data.completedMissionIds : [],
      missionStars:
        data.missionStars && typeof data.missionStars === 'object' ? data.missionStars : {},
      scannedBodies: Array.isArray(data.scannedBodies) ? data.scannedBodies : [],
      muted: data.muted === true,
    };
  } catch {
    return { ...EMPTY_PERSISTED };
  }
}

function savePersisted(s: PersistedState): void {
  try {
    const data: PersistedState = {
      completedMissionIds: s.completedMissionIds,
      missionStars: s.missionStars,
      scannedBodies: s.scannedBodies,
      muted: s.muted,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* private mode / storage full — progress just won't persist */
  }
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>()((set, get) => ({
  ...loadPersisted(),
  currentScreen: 'splash',
  selectedMissionId: null,
  satelliteName: '',
  codexOpen: false,
  codexFocus: null,

  setScreen: (screen) => set({ currentScreen: screen }),

  selectMission: (id) => {
    const mission = getMission(id);
    set({ selectedMissionId: id, satelliteName: mission ? defaultCallsign(mission) : '' });
  },

  setSatelliteName: (name) => set({ satelliteName: name.slice(0, 16) }),

  completeMission: (id, stars) => {
    const s = get();
    const next: PersistedState = {
      completedMissionIds: s.completedMissionIds.includes(id)
        ? s.completedMissionIds
        : [...s.completedMissionIds, id],
      missionStars: { ...s.missionStars, [id]: Math.max(stars, s.missionStars[id] ?? 0) },
      scannedBodies: s.scannedBodies,
      muted: s.muted,
    };
    savePersisted(next);
    set(next);
  },

  markScanned: (bodyName) => {
    const s = get();
    if (s.scannedBodies.includes(bodyName)) return;
    const scannedBodies = [...s.scannedBodies, bodyName];
    savePersisted({ ...s, scannedBodies });
    set({ scannedBodies });
  },

  toggleMute: () => get().setMuted(!get().muted),

  setMuted: (muted) => {
    savePersisted({ ...get(), muted });
    set({ muted });
  },

  openCodex: (focusScanName) => set({ codexOpen: true, codexFocus: focusScanName ?? null }),
  closeCodex: () => set({ codexOpen: false }),

  resetProgress: () => {
    const muted = get().muted;
    const next: PersistedState = { ...EMPTY_PERSISTED, muted };
    savePersisted(next);
    set(next);
  },
}));
