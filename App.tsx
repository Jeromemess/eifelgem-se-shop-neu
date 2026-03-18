
import React, { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';

// Code-Splitting: jede Seite wird erst geladen wenn sie gebraucht wird
const Shop    = lazy(() => import('./pages/Shop'));
const Success = lazy(() => import('./pages/Success'));
const Admin   = lazy(() => import('./pages/Admin'));
const Login   = lazy(() => import('./pages/Login'));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--eifel-dark)', borderTopColor: 'transparent' }} />
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--eifel-beige)' }}>
          <Header />
          <main className="flex-grow">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"        element={<Shop />} />
                <Route path="/login"   element={<Login />} />
                <Route path="/success" element={<Success />} />
                <Route path="/admin"   element={<Admin />} />
                <Route path="*"        element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          <footer className="pt-20 pb-16 text-center relative z-10" style={{ backgroundColor: 'var(--eifel-dark-2)' }}>
            <div className="max-w-5xl mx-auto px-4 flex flex-col items-center gap-6">
              <div className="space-y-3">
                <div className="w-10 h-1 mx-auto rounded-full" style={{ backgroundColor: 'var(--eifel-green)' }} />
                <p className="text-white font-display text-base italic tracking-wide">Eifelgemüse</p>
              </div>
              <div className="max-w-xs mx-auto">
                <p className="text-xs font-medium uppercase tracking-widest leading-loose text-white/50">
                  Frisch geerntet. Lokal geliefert.<br />Handarbeit aus der Region.
                </p>
              </div>
              <div className="pt-6 border-t border-white/5 w-full max-w-xs">
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">
                  &copy; {new Date().getFullYear()} Regional & Saisonal
                </p>
              </div>
            </div>
          </footer>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
