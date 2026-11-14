/**
 * bodyLookup.ts — Resolve the names the engine hands us ("Titan", "WASP-39b") back to
 * celestialBodies.ts entries, and to the BodyPortrait art id used to draw them.
 */

import { BODY_LIST, getBody, normalizeScanName, type CelestialBody } from '../../data/celestialBodies';
import { CODEX_ENTRIES, type BodyArtId } from '../../data/codexEntries';

const ART_IDS: ReadonlySet<string> = new Set(CODEX_ENTRIES.map((e) => e.art));

/** Find a body by id, display name or scan name (case- and punctuation-insensitive). */
export function findBody(nameOrId: string | null | undefined): CelestialBody | undefined {
  if (!nameOrId) return undefined;
  const direct = getBody(nameOrId);
  if (direct) return direct;
  const key = normalizeScanName(nameOrId);
  return (BODY_LIST as readonly CelestialBody[]).find(
    (b) => b.scanName === key || normalizeScanName(b.name) === key || normalizeScanName(b.fullName ?? '') === key,
  );
}

/** Display name for a body id (falls back to the id itself). */
export function bodyName(id: string): string {
  return getBody(id)?.name ?? id;
}

/** Portrait art for a body id, or null when there is no artwork for it. */
export function bodyArt(id: string): BodyArtId | null {
  const art = id.replace(/-/g, '');
  return ART_IDS.has(art) ? (art as BodyArtId) : null;
}

/** True when `scannedNames` (any mix of ids / display names) includes the body `id`. */
export function makeScannedMatcher(scannedNames: readonly string[]): (id: string) => boolean {
  const ids = new Set<string>();
  for (const n of scannedNames) {
    const b = findBody(n);
    if (b) ids.add(b.id);
  }
  return (id) => ids.has(id);
}
