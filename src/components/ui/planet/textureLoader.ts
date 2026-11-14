/**
 * textureLoader.ts — Gets planet textures to the screen without freezing the page.
 *
 *   loadPlanetTexture(id)    a promise for the texture; built in a Web Worker, then cached
 *   prewarmTextures(ids)     builds textures in the background so later screens find them ready
 *
 * If Web Workers or OffscreenCanvas are unavailable (or the worker fails), it falls back to building
 * on the main thread one texture per task, so a screen full of planets still paints between builds.
 */

import {
  SPHERE_STYLES,
  cachePlanetTexture,
  getPlanetTexture,
  peekPlanetTexture,
  type PlanetTexture,
  type SphereArtId,
} from './planetTextures';
import type { TextureResponse } from './planetTextureWorker';

type Resolver = (t: PlanetTexture | null) => void;

// ── Main-thread fallback: one texture per task ───────────────────────────────

const waiting = new Map<SphereArtId, Resolver[]>();
let pumping = false;

function loadOnMainThread(id: SphereArtId): Promise<PlanetTexture | null> {
  const hit = peekPlanetTexture(id);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const list = waiting.get(id);
    if (list) list.push(resolve);
    else waiting.set(id, [resolve]);
    if (pumping) return;
    pumping = true;
    const pump = (): void => {
      const next = waiting.keys().next();
      if (next.done) {
        pumping = false;
        return;
      }
      const key = next.value;
      const done = waiting.get(key) ?? [];
      waiting.delete(key);
      let tex: PlanetTexture | null = null;
      try {
        tex = getPlanetTexture(key);
      } catch {
        tex = null;
      }
      for (const cb of done) cb(tex);
      window.setTimeout(pump, 16);
    };
    window.setTimeout(pump, 0);
  });
}

// ── Worker path ──────────────────────────────────────────────────────────────

const pending = new Map<SphereArtId, Resolver[]>();
let worker: Worker | null | undefined; // undefined = not tried yet, null = unavailable

function settle(id: SphereArtId, tex: PlanetTexture | null): void {
  const list = pending.get(id) ?? [];
  pending.delete(id);
  for (const cb of list) cb(tex);
}

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  worker = null;
  try {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
    const w = new Worker(new URL('./planetTextureWorker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<TextureResponse>) => {
      const msg = e.data;
      if ('tex' in msg) {
        cachePlanetTexture(msg.id, msg.tex);
        settle(msg.id, msg.tex);
      } else {
        // The worker could not build this one; build it here instead.
        void loadOnMainThread(msg.id).then((t) => settle(msg.id, t));
      }
    };
    w.onerror = () => {
      // The worker itself is broken: switch to the main thread for everything still waiting.
      worker = null;
      w.terminate();
      for (const id of [...pending.keys()]) void loadOnMainThread(id).then((t) => settle(id, t));
    };
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

/** A promise for the texture of a sphere body. Resolves with null if it cannot be built. */
export function loadPlanetTexture(id: SphereArtId): Promise<PlanetTexture | null> {
  const hit = peekPlanetTexture(id);
  if (hit) return Promise.resolve(hit);
  const w = getWorker();
  if (!w) return loadOnMainThread(id);
  return new Promise((resolve) => {
    const list = pending.get(id);
    if (list) {
      list.push(resolve);
      return;
    }
    pending.set(id, [resolve]);
    w.postMessage({ id });
  });
}

/**
 * Builds textures for the given bodies one after another in the background, so a later
 * `loadPlanetTexture` is an instant cache hit. Returns a function that stops the queue.
 */
export function prewarmTextures(ids: readonly SphereArtId[] = Object.keys(SPHERE_STYLES) as SphereArtId[]): () => void {
  const queue = ids.filter((id) => !peekPlanetTexture(id));
  let cancelled = false;
  const next = (): void => {
    if (cancelled) return;
    const id = queue.shift();
    if (id) void loadPlanetTexture(id).then(next);
  };
  const timer = window.setTimeout(next, 0);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}
