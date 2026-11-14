/**
 * ErrorBoundary.tsx — Catches a crash anywhere in the screens and shows a recovery screen instead
 * of a blank page. "Return to the Archive" resets the screen state without losing saved progress;
 * "Reload" restarts the whole page.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useGameStore } from '../../store/useGameStore';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept in the console so a bug report can include it.
    console.error('Mission Orbit crashed:', error, info.componentStack);
  }

  private backToArchive = (): void => {
    useGameStore.getState().setScreen('archive');
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#05070d',
          color: '#e8f1ff',
          fontFamily: "'Chakra Petch', 'Segoe UI', system-ui, sans-serif",
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 460, display: 'grid', gap: 14 }}>
          <p style={{ margin: 0, letterSpacing: '0.24em', fontSize: 12, color: '#ff5a3c' }}>SIGNAL LOST</p>
          <h1 style={{ margin: 0, fontSize: 26, letterSpacing: '0.12em' }}>Something went wrong</h1>
          <p style={{ margin: 0, color: '#9db0cf', lineHeight: 1.5 }}>
            The game hit an unexpected error. Your saved progress is safe.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="mo-btn mo-btn--primary" onClick={this.backToArchive}>
              Return to the Archive
            </button>
            <button type="button" className="mo-btn mo-btn--ghost" style={{ color: '#e8f1ff' }} onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
