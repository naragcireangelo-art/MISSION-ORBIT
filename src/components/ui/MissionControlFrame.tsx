/**
 * MissionControlFrame.tsx — Slim Mission Control frame around the Archive and Objectives screens:
 * brand on the left, Codex and Sound buttons on the right, disclaimer along the bottom.
 * Hotkeys: C = Celestial Codex, M = mute (off on the Explore screen, where letters are for scanning).
 *
 *   <MissionControlFrame>{currentScreenElement}</MissionControlFrame>
 */

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import '../../styles/missionControl.css';
import { uiAudio } from '../../engine/uiAudio';
import { useGameStore } from '../../store/useGameStore';
import { IconCodex, IconMute, IconSound } from './icons';
import { MissionEmblem } from './MissionEmblem';
import { CelestialCodexModal } from './CelestialCodexModal';
import { SpaceBackdrop } from './SpaceBackdrop';

export interface MissionControlFrameProps {
  children: ReactNode;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function MissionControlFrame({ children }: MissionControlFrameProps) {
  const screen = useGameStore((s) => s.currentScreen);
  const muted = useGameStore((s) => s.muted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const openCodex = useGameStore((s) => s.openCodex);
  const closeCodex = useGameStore((s) => s.closeCodex);
  const codexOpen = useGameStore((s) => s.codexOpen);

  const hotkeys = screen !== 'explore';

  // Keep the synth in step with the saved mute setting.
  useEffect(() => {
    uiAudio.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (!hotkeys) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'c') {
        e.preventDefault();
        if (codexOpen) closeCodex();
        else openCodex();
      } else if (key === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkeys, codexOpen, openCodex, closeCodex, toggleMute]);

  return (
    <div className="mo-app mo-frame" data-screen={screen}>
      <div className="mo-backdrop" aria-hidden="true">
        <SpaceBackdrop density={0.6} />
      </div>
      <div className="mo-vignette" aria-hidden="true" />

      <header className="mo-frame__top">
        <div className="mo-brand">
          <MissionEmblem size={38} />
          <div className="mo-brand__text">
            <strong>MISSION ORBIT</strong>
            <span>DEEP SPACE OPERATIONS</span>
          </div>
        </div>

        <div className="mo-telemetry">
          <div className="mo-telemetry__buttons">
            <button
              type="button"
              className="mo-iconbtn"
              onClick={() => {
                uiAudio.sfx.click();
                openCodex();
              }}
              aria-label="Open Celestial Codex"
              title={hotkeys ? 'Celestial Codex (C)' : 'Celestial Codex'}
            >
              <IconCodex size={18} />
            </button>
            <button
              type="button"
              className={`mo-iconbtn${muted ? ' is-off' : ''}`}
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
              title={hotkeys ? (muted ? 'Sound off (M)' : 'Sound on (M)') : muted ? 'Sound off' : 'Sound on'}
            >
              {muted ? <IconMute size={18} /> : <IconSound size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mo-frame__main">{children}</main>

      <footer className="mo-frame__bottom">
        <span />
        <span className="mo-frame__disclaimer">
          Educational simulation inspired by real NASA missions · Not an official NASA product
        </span>
        <span className="mo-frame__hints">{hotkeys ? 'C  CODEX · M  SOUND' : ''}</span>
      </footer>

      <CelestialCodexModal />
    </div>
  );
}

export default MissionControlFrame;
