
import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Order, OrderItem } from '../types';
import { ApiService } from '../services/api';
import { CheckCircle, ArrowLeft, Calendar, Sprout, PlusCircle, UserCheck, History } from 'lucide-react';

const Success: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order as Order | undefined;
  const newItemsFromState = location.state?.newItems as OrderItem[] | undefined;
  
  const [pickupInfo, setPickupInfo] = useState<{dateStr: string, time: string, day: string} | null>(null);

  const funQuotes = [
    "Jérôme hat die Gummistiefel schon an und flitzt im Tiefflug zum Acker!",
    "Deine Wünsche sind tief im Boden versenkt!",
    "Das Gemüse freut sich schon riesig auf dein Zuhause!",
    "Wir schärfen schon mal die Harke für deine nächste Ladung.",
    "Deine Kiste ist so schwer, wir machen dafür extra Liegestütze."
  ];
  
  const [quote] = useState(() => funQuotes[0]);

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
          <p className="opacity-95 font-black text-[10px] uppercase tracking-[0.2em] leading-relaxed italic px-4">
            "{quote}"
          </p>
        </div>

        <div className="p-6 sm:p-12">
          {pickupInfo && (
            <div className="bg-[#fdfaf3] border border-[#f5f2e8] rounded-[2rem] p-6 mb-10 text-center relative group">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1 rounded-full border border-[#f5f2e8] text-[8px] font-black uppercase tracking-widest text-gray-400">
                  Termin
                </div>
                <Calendar className="w-8 h-8 text-[#1a4d2e] mx-auto mb-4" />
                <p className="text-gray-400 text-[9px] uppercase font-black tracking-widest mb-2">Deine Abholung</p>
                <p className="text-2xl font-black text-[#1a4d2e] tracking-tight">{pickupInfo.day}, {pickupInfo.dateStr}</p>
                <p className="text-gray-900 font-bold mt-2 text-xl">ab {pickupInfo.time} Uhr am Hof</p>
            </div>
          )}

          <div className="mb-10 p-6 bg-[#1a4d2e]/5 rounded-3xl border border-[#1a4d2e]/10 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[#1a4d2e]">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#1a4d2e]">Bestätigung</p>
              <p className="text-xs font-bold text-gray-600">Wir packen dir alles zusammen. <br/>Zahlung bar bei Abholung.</p>
            </div>
          </div>

          <div className="mb-10 space-y-8">
            <div className="flex flex-col items-center pb-4 border-b border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Kunde</span>
                <span className="text-2xl font-black text-black uppercase tracking-tighter">{order.customerName}</span>
            </div>

            {/* NEU HINZUGEFÜGT */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1a4d2e]">
                <PlusCircle className="w-4 h-4" /> In dieser Runde hinzugefügt:
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

            {/* BEREITS RESERVIERT */}
            {isFollowUpOrder && (
              <div className="space-y-4 pt-4 border-t border-dashed border-gray-100 opacity-60">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <History className="w-4 h-4" /> War schon in deiner Kiste:
                </h4>
                <ul className="space-y-2">
                  {previousItems.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center text-sm font-bold text-gray-400">
                      <span>{item.quantity}x {item.productName}</span>
                      <span>{(item.priceAtOrder * item.quantity).toFixed(2)} €</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-8 flex flex-col items-center border-t border-[#f5f2e8] mt-8 bg-gray-50 rounded-[2rem] p-6">
              <span className="font-black text-gray-400 uppercase tracking-widest text-[9px] mb-2">Gesamtbetrag (Bisher + Neu)</span>
              <span className="font-black text-5xl text-[#1a4d2e] tracking-tighter">{order.totalAmount.toFixed(2)} €</span>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-4 italic">Bitte bring den Betrag passend in bar mit.</p>
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
