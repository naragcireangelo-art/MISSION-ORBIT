/**
 * App.tsx — Screen switcher for Mission Orbit.
 *
 *   Splash → Archive (all levels) → Objectives (the chosen level) → Play → Explore (gameplay)
 *
 * Splash runs on its own; the other screens sit inside the slim Mission Control frame.
 * Explore belongs to a teammate. Until it lands, a small placeholder keeps the flow clickable.
 * Dev only: open with `?hud-preview` to replace the Explore placeholder with a HUD test stage.
 */

import type { ReactNode } from 'react';
import { FlightHudPreview } from './components/flight/FlightHudPreview';
import { MissionControlFrame } from './components/ui/MissionControlFrame';
import { MissionArchiveScreen } from './screens/MissionArchiveScreen';
import { MissionCompleteScreen } from './screens/MissionCompleteScreen';
import { ObjectivesScreen } from './screens/ObjectivesScreen';
import { OutroScreen } from './screens/OutroScreen';
import { SignalLostScreen } from './screens/SignalLostScreen';
import { SplashScreen } from './screens/SplashScreen';
import { useGameStore, type ScreenId } from './store/useGameStore';

const HUD_PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('hud-preview');
if (HUD_PREVIEW) useGameStore.setState({ currentScreen: 'explore' });

function Placeholder({ screen }: { screen: ScreenId }) {
  const setScreen = useGameStore((s) => s.setScreen);
  return (
    <section className="mo-screen">
      <h1 className="mo-title">{screen === 'explore' ? 'Gameplay' : screen}</h1>
      <p className="mo-lede">This screen is built by a teammate. Replace this placeholder in App.tsx.</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button type="button" className="mo-btn mo-btn--ghost" onClick={() => setScreen('objectives')}>
          Back to objectives
        </button>
        <button type="button" className="mo-btn mo-btn--primary" onClick={() => setScreen('archive')}>
          Archive
        </button>
      </div>
    </section>
  );
}

export default function App() {
  const screen = useGameStore((s) => s.currentScreen);

  if (screen === 'splash') return <SplashScreen />;

  let content: ReactNode;
  switch (screen) {
    case 'archive':
      content = <MissionArchiveScreen />;
      break;
    case 'objectives':
      content = <ObjectivesScreen />;
      break;
    case 'explore':
      content = HUD_PREVIEW ? <FlightHudPreview /> : <Placeholder screen={screen} />;
      break;
    case 'complete':
      content = <MissionCompleteScreen />;
      break;
    case 'lost':
      content = <SignalLostScreen />;
      break;
    case 'outro':
      content = <OutroScreen />;
      break;
    default:
      content = <Placeholder screen={screen} />;
  }
  return <MissionControlFrame>{content}</MissionControlFrame>;
}
