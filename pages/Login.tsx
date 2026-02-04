
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { Sprout, User, ArrowRight, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    setIsLoading(true);
    try {
      await ApiService.login(firstName, lastName);
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white p-10 sm:p-14 rounded-[3.5rem] shadow-2xl w-full max-w-md border border-[#f5f2e8] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#1a4d2e]"></div>
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#fdfaf3] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#f2ede1]">
            <Sprout className="w-8 h-8 text-[#1a4d2e]" />
          </div>
          <h2 className="text-3xl font-[900] text-black tracking-tighter uppercase leading-none mb-2">Hof-Shop</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trage deinen Namen ein, um zu reservieren</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#1a4d2e] mb-2 block ml-2">Vorname</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Z.B. MAX"
              className="w-full p-5 bg-[#fdfaf3] rounded-2xl border-2 border-transparent focus:border-[#1a4d2e] outline-none font-black text-sm uppercase tracking-widest transition-all"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#1a4d2e] mb-2 block ml-2">Nachname</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Z.B. MUSTERMANN"
              className="w-full p-5 bg-[#fdfaf3] rounded-2xl border-2 border-transparent focus:border-[#1a4d2e] outline-none font-black text-sm uppercase tracking-widest transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !firstName || !lastName}
            className="w-full bg-[#1a4d2e] text-white py-6 rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-95 disabled:bg-gray-200 flex items-center justify-center gap-3 uppercase tracking-widest text-xs mt-4"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Gemüse ansehen</>}
          </button>
        </form>

        <p className="mt-8 text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
          Einfach reservieren und am Hof abholen.<br/>Bezahlung erfolgt bar vor Ort.
        </p>
      </div>
    </div>
  );
};

export default Login;
