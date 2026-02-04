
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Sprout, LogOut, User } from 'lucide-react';
import { ApiService } from '../services/api';
import { Customer } from '../types';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');
  const [logoError, setLogoError] = useState(false);
  const [user, setUser] = useState<Customer | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const curr = await ApiService.getCurrentUser();
      setUser(curr);
    };
    checkUser();
  }, [location.pathname]);

  const handleLogout = async () => {
    await ApiService.logout();
    setUser(null);
    // Smooth reset instead of hard reload
    navigate('/');
  };

  return (
    <header className="bg-[#fdfbf7] border-b border-[#f5f2e8] sticky top-0 z-50 py-4 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95">
          {!logoError ? (
            <img 
              src="input_file_0.png" 
              alt="Eifelgemüse Icon" 
              className="h-10 w-auto object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-10 h-10 bg-[#1a4d2e]/10 rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-[#1a4d2e]" />
            </div>
          )}
          <span className="text-2xl font-[900] tracking-tighter text-[#1a1a1a]">
            Eifel<span className="text-[#1a4d2e]">gemüse</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6">
          {!isAdmin ? (
            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2 bg-[#1a4d2e]/5 px-3 py-1.5 rounded-xl border border-[#1a4d2e]/10">
                  <User className="w-3 h-3 text-[#1a4d2e]" />
                  <span className="text-[9px] font-black uppercase text-[#1a4d2e] max-w-[80px] truncate">{user.firstName}</span>
                  <button onClick={handleLogout} className="ml-1 p-1 hover:text-red-500 transition-colors" title="Nutzer wechseln">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <Link 
                to="/admin" 
                className="text-[#1a1a1a] hover:text-[#1a4d2e] text-[10px] flex items-center gap-2 font-black uppercase tracking-widest transition-all bg-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl border border-[#f5f2e8] shadow-sm hover:shadow-md active:translate-y-0.5"
              >
                <Lock className="w-3.5 h-3.5" /> Hof-Login
              </Link>
            </div>
          ) : (
            <Link 
              to="/" 
              className="text-[#1a4d2e] hover:text-black text-[10px] font-black uppercase tracking-widest border-b-2 border-[#1a4d2e] pb-1 transition-all"
            >
              ← Zum Shop
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
