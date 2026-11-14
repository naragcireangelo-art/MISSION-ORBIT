/**
 * App.tsx — Screen switcher for Mission Orbit.
 *
 *   Splash → Archive → Assembly → Briefing → Objectives → Play → Explore → Complete / Lost → Outro
 *
 * Splash runs on its own; the other screens sit inside the slim Mission Control frame.
 */

import type { ReactNode } from 'react';
import { MissionControlFrame } from './components/ui/MissionControlFrame';
import { AssemblyScreen } from './screens/AssemblyScreen';
import { BriefingScreen } from './screens/BriefingScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { MissionArchiveScreen } from './screens/MissionArchiveScreen';
import { MissionCompleteScreen } from './screens/MissionCompleteScreen';
import { ObjectivesScreen } from './screens/ObjectivesScreen';
import { OutroScreen } from './screens/OutroScreen';
import { SignalLostScreen } from './screens/SignalLostScreen';
import { SplashScreen } from './screens/SplashScreen';
import { useGameStore } from './store/useGameStore';

export default function App() {
  const screen = useGameStore((s) => s.currentScreen);

  if (screen === 'splash') return <SplashScreen />;

  let content: ReactNode;
  switch (screen) {
    case 'archive':
      content = <MissionArchiveScreen />;
      break;
    case 'assembly':
      content = <AssemblyScreen />;
      break;
    case 'briefing':
      content = <BriefingScreen />;
      break;
    case 'objectives':
      content = <ObjectivesScreen />;
      break;
    case 'explore':
      content = <ExploreScreen />;
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
      content = null;
  }
  return <MissionControlFrame>{content}</MissionControlFrame>;
}
