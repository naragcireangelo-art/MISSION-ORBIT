/**
 * useAssemblyStore.ts — The player's satellite build (4 parts + name).
 *
 * Kept apart from useGameStore so the Assembly screen works on its own. The shape is
 * `SatelliteBuild` from data/parts.ts, so other screens can read it with `useAssemblyStore`
 * or move it into the main store later. The build is saved to localStorage and repaired with
 * `sanitizeBuild` on load, so a stale or hand-edited save can never produce an invalid ship.
 *
 *   build, setPart(slot, id), setName(raw), resetBuild(name?)
 *   getBuildStats()   derived hull / speed / scan range / free errors for the current build
 */

import { create } from 'zustand';
import {
  computeBuildStats,
  createDefaultBuild,
  filterSatelliteNameInput,
  getPart,
  sanitizeBuild,
  type BuildStats,
  type PartSlot,
  type SatelliteBuild,
} from '../data/parts';

const STORAGE_KEY = 'mission-orbit:build:v1';
const FALLBACK_NAME = 'SAT-I';

function load(): SatelliteBuild {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitizeBuild(JSON.parse(raw), FALLBACK_NAME);
  } catch {
    /* unreadable save — fall through to the default build */
  }
  return createDefaultBuild(FALLBACK_NAME);
}

function save(build: SatelliteBuild): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(build));
  } catch {
    /* private mode / storage full — the build just won't persist */
  }
}

interface AssemblyState {
  build: SatelliteBuild;
  setPart: (slot: PartSlot, id: string) => void;
  /** Accepts raw input; disallowed characters are dropped and the length is capped. */
  setName: (raw: string) => void;
  /** Back to the default parts. Pass a name to start from a mission callsign. */
  resetBuild: (name?: string) => void;
  getBuildStats: () => BuildStats;
}

export const useAssemblyStore = create<AssemblyState>()((set, get) => ({
  build: load(),

  setPart: (slot, id) => {
    if (!getPart(slot, id)) return;
    const build = { ...get().build, [slot]: id };
    save(build);
    set({ build });
  },

  setName: (raw) => {
    const build = { ...get().build, name: filterSatelliteNameInput(raw) };
    save(build);
    set({ build });
  },

  resetBuild: (name) => {
    const build = createDefaultBuild(name ?? get().build.name);
    save(build);
    set({ build });
  },

  getBuildStats: () => computeBuildStats(get().build),
}));
