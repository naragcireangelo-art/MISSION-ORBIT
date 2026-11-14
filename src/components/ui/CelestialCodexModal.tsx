/**
 * CelestialCodexModal.tsx — The Celestial Codex: a catalog of every world, moon and deep-sky
 * target the player can scan, with a rotating portrait, quick stats and a NASA Science Log note.
 *
 * Opened from the store (`openCodex()` / `codexOpen`), so any screen can open it. Keyboard:
 *   Esc closes · ↑ / ↓ move through the list · Tab stays inside the window.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { CODEX_ENTRIES, CODEX_GROUPS, type CodexEntry, type CodexGroup } from '../../data/codexEntries';
import { MISSIONS } from '../../data/missions';
import { uiAudio } from '../../engine/uiAudio';
import { useGameStore } from '../../store/useGameStore';
import { IconCheck, IconClose, IconCodex, IconCrosshair } from './icons';
import { BodyPortrait } from './planet/BodyPortrait';
import { isSphereArt } from './planet/planetTextures';
import { prewarmTextures } from './planet/textureLoader';

type GroupFilter = CodexGroup | 'all';

const FOCUSABLE = 'button:not([disabled]), input, [href], select, textarea, [tabindex]:not([tabindex="-1"])';

function CodexDialog() {
  const closeCodex = useGameStore((s) => s.closeCodex);
  const focusName = useGameStore((s) => s.codexFocus);
  const scannedBodies = useGameStore((s) => s.scannedBodies);

  const [group, setGroup] = useState<GroupFilter>('all');
  const [selectedName, setSelectedName] = useState<string>(() => {
    const hit = CODEX_ENTRIES.find((e) => e.scanName.toLowerCase() === (focusName ?? '').toLowerCase());
    return (hit ?? CODEX_ENTRIES[0]).scanName;
  });

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<Element | null>(null);

  const scannedSet = useMemo(() => new Set(scannedBodies.map((n) => n.toLowerCase())), [scannedBodies]);

  const filtered = useMemo<CodexEntry[]>(() => {
    return CODEX_ENTRIES.filter((e) => group === 'all' || e.group === group);
  }, [group]);

  const selected: CodexEntry | undefined =
    filtered.find((e) => e.scanName === selectedName) ?? filtered[0];

  const appearsIn = useMemo(
    () =>
      selected
        ? MISSIONS.filter((m) => m.targetIds.some((t) => t.toLowerCase() === selected.scanName.toLowerCase()))
        : [],
    [selected],
  );

  // Open: remember focus, play the sweep, and put focus inside the dialog. Close: restore focus.
  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    uiAudio.sfx.open();
    const first = dialogRef.current?.querySelector<HTMLElement>('.mo-codex__list button');
    first?.focus();
    const stopPrewarm = prewarmTextures();
    return () => {
      stopPrewarm();
      const el = previouslyFocused.current;
      if (el instanceof HTMLElement) el.focus();
    };
  }, []);

  // Keep the selected row in view as it changes.
  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    row?.scrollIntoView({ block: 'nearest' });
  }, [selected?.scanName]);

  const select = (entry: CodexEntry, focus = false): void => {
    setSelectedName(entry.scanName);
    uiAudio.sfx.click();
    if (focus) {
      window.requestAnimationFrame(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-scan="${CSS.escape(entry.scanName)}"]`)?.focus();
      });
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      uiAudio.sfx.click();
      closeCodex();
      return;
    }
    if (e.key === 'Tab') {
      const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstNode) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault();
        firstNode.focus();
      }
      return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && selected) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && e.key === 'ArrowUp') return;
      const index = filtered.findIndex((x) => x.scanName === selected.scanName);
      const next = filtered[e.key === 'ArrowDown' ? Math.min(filtered.length - 1, index + 1) : Math.max(0, index - 1)];
      if (next && next.scanName !== selected.scanName) {
        e.preventDefault();
        select(next, target.tagName !== 'INPUT');
      }
    }
  };

  const isScanned = selected ? scannedSet.has(selected.scanName.toLowerCase()) : false;
  const totalScanned = CODEX_ENTRIES.filter((e) => scannedSet.has(e.scanName.toLowerCase())).length;

  return createPortal(
    <div
      className="mo-codex__overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeCodex();
      }}
    >
      <div
        ref={dialogRef}
        className="mo-codex"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mo-codex-title"
        onKeyDown={onKeyDown}
      >
        <span className="mo-corner mo-corner--tl" />
        <span className="mo-corner mo-corner--tr" />
        <span className="mo-corner mo-corner--bl" />
        <span className="mo-corner mo-corner--br" />

        <header className="mo-codex__header">
          <span className="mo-codex__icon">
            <IconCodex size={22} />
          </span>
          <div className="mo-codex__heading">
            <h2 id="mo-codex-title">Celestial Codex</h2>
            <p>
              {CODEX_ENTRIES.length} catalogued targets · {totalScanned} scanned
            </p>
          </div>
          <button type="button" className="mo-iconbtn" onClick={closeCodex} aria-label="Close Celestial Codex">
            <IconClose size={18} />
          </button>
        </header>

        <div className="mo-codex__body">
          <aside className="mo-codex__sidebar">
            <div className="mo-codex__filters" role="group" aria-label="Filter by type">
              {([{ id: 'all', label: 'All' }, ...CODEX_GROUPS] as { id: GroupFilter; label: string }[]).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`mo-chip-btn${group === g.id ? ' is-active' : ''}`}
                  aria-pressed={group === g.id}
                  onClick={() => {
                    uiAudio.sfx.click();
                    setGroup(g.id);
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="mo-codex__list" ref={listRef} role="group" aria-label="Codex entries">
              {filtered.map((e) => {
                const scanned = scannedSet.has(e.scanName.toLowerCase());
                const active = selected?.scanName === e.scanName;
                return (
                  <button
                    key={e.scanName}
                    type="button"
                    data-scan={e.scanName}
                    className={`mo-codex__row${active ? ' is-active' : ''}`}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => select(e)}
                  >
                    <span className={`mo-codex__dot${scanned ? ' is-scanned' : ''}`} aria-hidden="true" />
                    <span className="mo-codex__rowtext">
                      <span className="mo-codex__rowtitle">{e.title}</span>
                      <span className="mo-codex__rowkind">{e.kind}</span>
                    </span>
                    {scanned && (
                      <span className="mo-codex__rowcheck" title="Scanned">
                        <IconCheck size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="mo-codex__detail" aria-live="polite">
            {selected ? (
              <>
                <div className="mo-codex__portrait" key={selected.scanName}>
                  <div className="mo-codex__reticle" aria-hidden="true" />
                  <BodyPortrait
                    art={selected.art}
                    size={selected.art === 'saturn' ? 190 : 230}
                    fps={20}
                    label={`Portrait of ${selected.title}`}
                    interactive
                  />
                  {isSphereArt(selected.art) && (
                    <p className="mo-codex__drag-hint" aria-hidden="true">
                      Drag to rotate · double-click to reset
                    </p>
                  )}
                </div>
                <div className="mo-codex__info">
                  <p className="mo-eyebrow">{selected.kind}</p>
                  <h3 className="mo-codex__title">{selected.title}</h3>
                  <p className={`mo-codex__scan${isScanned ? ' is-scanned' : ''}`}>
                    <IconCrosshair size={14} />
                    {isScanned ? 'SCANNED — LOGGED TO CODEX' : 'NOT YET SCANNED'}
                  </p>
                  <dl className="mo-codex__stats">
                    {selected.stats.map(([label, value]) => (
                      <div key={label} className="mo-codex__stat">
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mo-codex__log">
                    <p className="mo-eyebrow">NASA Science Log</p>
                    <p>{selected.fact}</p>
                  </div>
                  {appearsIn.length > 0 && (
                    <div className="mo-codex__missions">
                      <p className="mo-eyebrow">Scan target in</p>
                      <ul>
                        {appearsIn.map((m) => (
                          <li key={m.id}>
                            <span className="mo-tag mo-tag--mono">{m.id}</span>
                            {m.spacecraft}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="mo-codex__empty">Select an entry to read its log.</p>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function CelestialCodexModal() {
  const open = useGameStore((s) => s.codexOpen);
  return open ? <CodexDialog /> : null;
}

export default CelestialCodexModal;
