
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Shop from './pages/Shop';
import Success from './pages/Success';
import Admin from './pages/Admin';
import Login from './pages/Login';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-[#fdfaf3] flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Shop />} />
            <Route path="/login" element={<Login />} />
            <Route path="/success" element={<Success />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <footer className="bg-[#121a14] pt-20 pb-40 text-center relative z-10">
          <div className="max-w-5xl mx-auto px-4 flex flex-col items-center gap-6">
            <div className="space-y-3">
              <div className="w-10 h-1 bg-[#1a4d2e] mx-auto rounded-full"></div>
              <p className="text-white font-black text-xs uppercase tracking-[0.5em] ml-[0.5em]">Eifelgemüse</p>
            </div>
            
            <div className="max-w-xs mx-auto">
              <p className="text-gray-500 text-[9px] font-bold uppercase tracking-[0.3em] leading-loose">
                Frisch geerntet. Lokal geliefert.<br/>Handarbeit aus der Region.
              </p>
            </div>
            
            <div className="pt-6 border-t border-white/5 w-full max-w-xs">
              <p className="text-gray-600 text-[8px] font-medium uppercase tracking-[0.4em]">&copy; {new Date().getFullYear()} Regional & Saisonal</p>
            </div>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
};

export default App;
