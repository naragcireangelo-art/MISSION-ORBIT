/**
 * App.tsx — Screen switcher for Mission Orbit.
 *
 *   Splash → Archive (all levels) → Objectives (the chosen level) → Play → Explore (gameplay)
 *
 * Splash runs on its own; the other screens sit inside the slim Mission Control frame.
 * Explore, Complete, Lost and Outro belong to teammates. Until they land, a small placeholder
 * keeps the flow clickable. Replace each placeholder with the real screen.
 */

import type { ReactNode } from 'react';
import { MissionControlFrame } from './components/ui/MissionControlFrame';
import { MissionArchiveScreen } from './screens/MissionArchiveScreen';
import { ObjectivesScreen } from './screens/ObjectivesScreen';
import { SplashScreen } from './screens/SplashScreen';
import { useGameStore, type ScreenId } from './store/useGameStore';

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
    default:
      content = <Placeholder screen={screen} />;
  }
  return <MissionControlFrame>{content}</MissionControlFrame>;
}
