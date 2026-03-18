
import React from 'react';

interface State { hasError: boolean; }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App-Fehler:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--eifel-beige)' }}>
          <div className="text-center max-w-md">
            <p className="text-5xl mb-6">🌱</p>
            <h2 className="font-display text-2xl font-semibold mb-3" style={{ color: 'var(--eifel-dark)' }}>
              Ups, da ist was schiefgelaufen.
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--eifel-text-muted)' }}>
              Bitte die Seite neu laden.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-2xl text-white font-semibold text-sm"
              style={{ backgroundColor: 'var(--eifel-dark)' }}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
