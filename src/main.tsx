import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './styles/missionControl.css';

const root = createRoot(document.getElementById('root')!);

// Dev only: `?sound-lab` opens the sound-audition page instead of the game. The branch is removed from
// production builds, so the lab never ships.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('sound-lab')) {
  void import('./dev/SoundLab').then(({ SoundLab }) => root.render(<SoundLab />));
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
