
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Sprout, LogOut, User } from 'lucide-react';
import { ApiService } from '../services/api';
import { Customer } from '../types';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');
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
    <header className="sticky top-0 z-50 py-4 shadow-sm" style={{backgroundColor: 'var(--eifel-beige)', borderBottom: '1px solid var(--eifel-beige-dark)'}}>
      <div className="max-w-5xl mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: 'rgba(0,80,64,0.1)'}}>
            <Sprout className="w-6 h-6" style={{color: 'var(--eifel-dark)'}} />
          </div>
          <span className="text-2xl font-display italic font-semibold" style={{color: 'var(--eifel-dark)'}}>
            Eifel<span style={{color: 'var(--eifel-green)'}}>gemüse</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6">
          {!isAdmin ? (
            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border" style={{backgroundColor: 'rgba(0,80,64,0.06)', borderColor: 'rgba(0,80,64,0.15)'}}>
                  <User className="w-3 h-3" style={{color: 'var(--eifel-dark)'}} />
                  <span className="text-[9px] font-semibold uppercase tracking-widest max-w-[80px] truncate" style={{color: 'var(--eifel-dark)'}}>{user.firstName}</span>
                  <button onClick={handleLogout} className="ml-1 p-1 hover:text-red-500 transition-colors" title="Nutzer wechseln">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <Link
                to="/admin"
                className="text-[10px] flex items-center gap-2 font-semibold uppercase tracking-widest transition-all px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl shadow-sm hover:shadow-md active:translate-y-0.5"
                style={{backgroundColor: 'white', color: 'var(--eifel-text)', border: '1px solid var(--eifel-beige-dark)'}}
              >
                <Lock className="w-3.5 h-3.5" /> Hof-Login
              </Link>
            </div>
          ) : (
            <Link
              to="/"
              className="text-[10px] font-semibold uppercase tracking-widest border-b-2 pb-1 transition-all"
              style={{color: 'var(--eifel-dark)', borderColor: 'var(--eifel-green)'}}
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
