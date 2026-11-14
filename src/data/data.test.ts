/**
 * data.test.ts — Guards the game's content: every mission target exists, has art and a Codex
 * entry, can be typed on a keyboard, and every source link is a plain https URL.
 */

import { describe, expect, it } from 'vitest';
import { bodyArt } from '../components/flight/bodyLookup';
import { BODY_LIST, getBody, normalizeScanName, validateBodies } from './celestialBodies';
import { getCodexEntry } from './codexEntries';
import { MISSIONS, validateMissions } from './missions';

describe('content data', () => {
  it('passes the built-in validators', () => {
    expect(validateMissions()).toEqual([]);
    expect(validateBodies()).toEqual([]);
  });

  it('has 9 missions in launch-date order', () => {
    expect(MISSIONS).toHaveLength(9);
    const dates = MISSIONS.map((m) => m.launchDateISO);
    expect([...dates].sort()).toEqual(dates);
    MISSIONS.forEach((m, i) => expect(m.levelNumber).toBe(i + 1));
  });

  it('gives every mission target a body, art, a Codex entry and a typable name', () => {
    for (const m of MISSIONS) {
      for (const id of m.targetIds) {
        const body = getBody(id);
        expect(body, `${m.code} target ${id}`).toBeDefined();
        expect(bodyArt(id), `art for ${id}`).not.toBeNull();
        expect(getCodexEntry(body!.scanName), `codex for ${id}`).toBeDefined();
        expect(normalizeScanName(body!.name)).toBe(body!.scanName);
      }
    }
  });

  it('uses https source links everywhere', () => {
    const urls = [
      ...MISSIONS.flatMap((m) => m.sources.map((s) => s.url)),
      ...BODY_LIST.map((b) => b.sourceUrl),
    ];
    for (const u of urls) expect(u.startsWith('https://'), u).toBe(true);
    expect(new Set(urls).size).toBeGreaterThan(20);
  });

  it('launch times look like HH:MM UTC', () => {
    for (const m of MISSIONS) expect(m.launchTimeUTC).toMatch(/^\d{2}:\d{2}$/);
  });
});
