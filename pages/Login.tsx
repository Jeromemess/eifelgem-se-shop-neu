
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { Sprout, User, ArrowRight, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    setIsLoading(true);
    setError('');
    try {
      await ApiService.login(firstName, lastName);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white p-10 sm:p-14 rounded-[3.5rem] w-full max-w-md relative overflow-hidden" style={{boxShadow: '0 16px 48px rgba(0,40,32,.14)', border: '1px solid var(--eifel-beige-dark)'}}>
        <div className="absolute top-0 left-0 w-full h-1.5 rounded-t-[3.5rem]" style={{backgroundColor: 'var(--eifel-dark)'}}></div>

        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{backgroundColor: 'var(--eifel-beige)', border: '1px solid var(--eifel-beige-darker)'}}>
            <Sprout className="w-8 h-8" style={{color: 'var(--eifel-dark)'}} />
          </div>
          <h2 className="font-display text-3xl font-semibold mb-2" style={{color: 'var(--eifel-dark)'}}>Hof-Shop</h2>
          <p className="text-[10px] font-medium uppercase tracking-widest" style={{color: 'var(--eifel-text-muted)'}}>Trage deinen Namen ein, um zu reservieren</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest mb-2 block ml-2" style={{color: 'var(--eifel-dark)'}}>Vorname</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="z.B. Max"
              className="w-full p-5 rounded-2xl border-2 border-transparent outline-none text-sm tracking-wide transition-all"
              style={{backgroundColor: 'var(--eifel-beige)', fontFamily: 'inherit'}}
              onFocus={e => e.target.style.borderColor = 'var(--eifel-dark)'}
              onBlur={e => e.target.style.borderColor = 'transparent'}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest mb-2 block ml-2" style={{color: 'var(--eifel-dark)'}}>Nachname</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="z.B. Mustermann"
              className="w-full p-5 rounded-2xl border-2 border-transparent outline-none text-sm tracking-wide transition-all"
              style={{backgroundColor: 'var(--eifel-beige)', fontFamily: 'inherit'}}
              onFocus={e => e.target.style.borderColor = 'var(--eifel-dark)'}
              onBlur={e => e.target.style.borderColor = 'transparent'}
              required
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-2xl text-sm text-center" style={{backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626'}}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !firstName || !lastName}
            className="w-full text-white py-5 rounded-2xl font-semibold transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-3 uppercase tracking-widest text-xs mt-4"
            style={{backgroundColor: 'var(--eifel-dark)', boxShadow: '0 6px 24px rgba(0,40,32,.18)'}}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Gemüse ansehen</>}
          </button>
        </form>

        <p className="mt-8 text-center text-[9px] font-medium uppercase tracking-widest leading-relaxed" style={{color: 'var(--eifel-text-muted)'}}>
          Einfach reservieren und am Hof abholen.<br/>Bezahlung erfolgt bar vor Ort.
        </p>
      </div>
    </div>
  );
};

export default Login;
