
import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Order, OrderItem } from '../types';
import { ApiService } from '../services/api';
import { CheckCircle, ArrowLeft, Calendar, Sprout, PlusCircle, UserCheck } from 'lucide-react';

const Success: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order as Order | undefined;
  const newItemsFromState = location.state?.newItems as OrderItem[] | undefined;
  
  const [pickupInfo, setPickupInfo] = useState<{dateStr: string, time: string, day: string} | null>(null);

  // Witzige Sprüche für die Bestätigung
  const funQuotes = [
    "Das Gemüse freut sich schon riesig auf dein Zuhause!",
    "Jerome hat die Karotten gerade nochmal extra gestreichelt.",
    "Die Würmer im Acker weinen, weil du so viel tolles Zeug mitnimmst.",
    "Jerome schärft schon mal die Harke für deine nächste Ladung.",
    "Deine Kiste ist so schwer, Jerome macht dafür extra Liegestütze."
  ];
  const [quote] = useState(() => funQuotes[Math.floor(Math.random() * funQuotes.length)]);

  useEffect(() => {
    if (!order) { navigate('/'); return; }
    const loadPickup = async () => {
      try {
        const settings = await ApiService.getSettings();
        if (settings.currentPickupDate) {
          const pDate = new Date(settings.currentPickupDate);
          setPickupInfo({
            dateStr: pDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            time: settings.pickupTime,
            day: pDate.toLocaleDateString('de-DE', { weekday: 'long' })
          });
        }
      } catch (err) { console.error(err); }
    };
    loadPickup();
  }, [order, navigate]);

  if (!order) return null;

  const newlyAdded = newItemsFromState || [];
  const previousItems = order.items.map(item => {
    const newly = newlyAdded.find(n => n.productId === item.productId);
    if (newly) {
      const remainingQty = item.quantity - newly.quantity;
      return remainingQty > 0 ? { ...item, quantity: remainingQty } : null;
    }
    return item;
  }).filter(Boolean) as OrderItem[];

  const isFollowUpOrder = previousItems.length > 0;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 bg-[#fdfbf7] overflow-x-hidden pb-20">
      <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-2xl border border-[#f5f2e8] overflow-hidden">
        <div className="bg-[#1a4d2e] p-8 text-center text-white relative">
          <div className="absolute top-4 left-4">
             <Sprout className="w-6 h-6 opacity-20" />
          </div>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 mb-6 backdrop-blur-sm">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">Acker-Mission:<br/>Erfolgreich!</h2>
          <p className="opacity-95 font-black text-[10px] uppercase tracking-[0.2em] leading-relaxed italic">
            "{quote}"
          </p>
        </div>

        <div className="p-6 sm:p-12">
          {pickupInfo && (
            <div className="bg-[#fdfaf3] border border-[#f5f2e8] rounded-[2rem] p-6 mb-10 text-center relative group">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1 rounded-full border border-[#f5f2e8] text-[8px] font-black uppercase tracking-widest text-gray-400">
                  Wichtig
                </div>
                <Calendar className="w-8 h-8 text-[#1a4d2e] mx-auto mb-4" />
                <p className="text-gray-400 text-[9px] uppercase font-black tracking-widest mb-2">Deine Abholung</p>
                <p className="text-2xl font-black text-[#1a4d2e] tracking-tight leading-tight">{pickupInfo.day}<br className="sm:hidden" /> {pickupInfo.dateStr}</p>
                <p className="text-gray-900 font-bold mt-2 text-sm sm:text-xl">ab {pickupInfo.time} Uhr am Hof</p>
            </div>
          )}

          <div className="mb-10 p-6 bg-[#1a4d2e]/5 rounded-3xl border border-[#1a4d2e]/10 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[#1a4d2e]">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#1a4d2e]">Vor Ort</p>
              <p className="text-xs font-bold text-gray-600">Jerome packt dir alles zusammen. <br/>Zahlung ganz entspannt in Bar.</p>
            </div>
          </div>

          <div className="mb-10 space-y-8">
            <div className="flex flex-col items-center pb-4 border-b border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Kunde</span>
                <span className="text-2xl font-black text-black uppercase tracking-tighter">{order.customerName}</span>
            </div>

            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1a4d2e]">
                <PlusCircle className="w-4 h-4" /> {isFollowUpOrder ? 'Gerade hinzugefügt' : 'Deine Beute'}
              </h4>
              <ul className="space-y-3">
                {newlyAdded.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-start text-lg font-black text-gray-800">
                    <span className="flex items-start gap-3">
                      <span className="text-[#1a4d2e] bg-[#1a4d2e]/10 px-2 py-0.5 rounded-lg text-[10px] font-black mt-1">{item.quantity}x</span> 
                      <span>{item.productName}</span>
                    </span>
                    <span className="text-gray-400 font-bold text-sm shrink-0">{(item.priceAtOrder * item.quantity).toFixed(2)} €</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8 flex flex-col items-center border-t border-[#f5f2e8] mt-8">
              <span className="font-black text-gray-400 uppercase tracking-widest text-[9px] mb-2">Gesamtpreis (Bar bei Abholung)</span>
              <span className="font-black text-5xl text-[#1a4d2e] tracking-tighter">{order.totalAmount.toFixed(2)} €</span>
            </div>
          </div>

          <Link to="/" className="w-full text-center bg-black hover:bg-[#1a4d2e] text-white font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-xl active:scale-95">
            <ArrowLeft className="w-5 h-5" /> Zurück zum Feld
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Success;
