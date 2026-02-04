
import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Order, OrderItem } from '../types';
import { ApiService } from '../services/api';
import { CheckCircle, ArrowLeft, Calendar, Sprout, PlusCircle, History } from 'lucide-react';

const Success: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order as Order | undefined;
  const newItemsFromState = location.state?.newItems as OrderItem[] | undefined;
  
  const [pickupInfo, setPickupInfo] = useState<{dateStr: string, time: string, day: string} | null>(null);

  useEffect(() => {
    if (!order) {
      navigate('/');
      return;
    }

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
      } catch (err) {
        console.error("Success Page Settings Load Error:", err);
      }
    };
    loadPickup();
  }, [order, navigate]);

  if (!order) return null;

  // Berechnung: Was kam gerade neu dazu, was war schon drin?
  const newlyAdded = newItemsFromState || [];
  
  // Wir filtern die "alten" Items heraus, indem wir die Mengen vergleichen
  const previousItems = order.items.map(totalItem => {
    const newly = newlyAdded.find(n => n.productId === totalItem.productId);
    if (newly) {
      const remainingQty = totalItem.quantity - newly.quantity;
      return remainingQty > 0 ? { ...totalItem, quantity: remainingQty } : null;
    }
    return totalItem;
  }).filter(Boolean) as OrderItem[];

  const isFollowUpOrder = previousItems.length > 0;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 bg-[#fdfbf7] pb-20">
      <div className="max-w-2xl w-full bg-white rounded-[3rem] shadow-2xl border border-[#f5f2e8] overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-[#1a4d2e] p-10 text-center text-white relative">
          <Sprout className="absolute top-6 left-6 w-8 h-8 opacity-10" />
          <CheckCircle className="w-16 h-16 text-white mx-auto mb-6 drop-shadow-lg" />
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 leading-none">Acker-Mission:<br/>Erfolgreich!</h2>
          <p className="opacity-70 text-[10px] font-black uppercase tracking-widest">Wir haben deine Wünsche notiert.</p>
        </div>

        <div className="p-8 sm:p-12">
          {pickupInfo && (
            <div className="bg-[#fdfaf3] border border-[#f5f2e8] rounded-[2rem] p-8 mb-10 text-center shadow-inner">
                <Calendar className="w-8 h-8 text-[#1a4d2e] mx-auto mb-4" />
                <p className="text-gray-400 text-[9px] uppercase font-black tracking-widest mb-1">Deine Abholung am Hof</p>
                <p className="text-2xl font-black text-[#1a4d2e] tracking-tight">{pickupInfo.day}, {pickupInfo.dateStr}</p>
                <p className="text-gray-900 font-bold mt-1 text-lg">ab {pickupInfo.time} Uhr</p>
            </div>
          )}

          <div className="mb-10 space-y-8">
            <div className="flex flex-col items-center pb-6 border-b border-gray-100">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Bestätigung für</span>
               <span className="text-2xl font-black text-black uppercase tracking-tighter">{order.customerName}</span>
            </div>

            {/* NEU HINZUGEFÜGT */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1a4d2e]">
                <PlusCircle className="w-4 h-4" /> Gerade hinzugefügt:
              </h4>
              <ul className="space-y-3">
                {newlyAdded.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center text-lg font-black text-gray-800">
                    <span className="flex items-center gap-3">
                      <span className="bg-[#1a4d2e]/10 text-[#1a4d2e] px-2 py-0.5 rounded-lg text-xs">{item.quantity}x</span>
                      {item.productName}
                    </span>
                    <span className="text-gray-400 text-sm tabular-nums">{(item.priceAtOrder * item.quantity).toFixed(2)} €</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* BEREITS RESERVIERT */}
            {isFollowUpOrder && (
              <div className="space-y-4 pt-4 border-t border-dashed border-gray-100 opacity-50">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <History className="w-4 h-4" /> Bisher in deiner Kiste:
                </h4>
                <ul className="space-y-2">
                  {previousItems.map((item, idx) => (
                    <li key={idx} className="flex justify-between text-sm font-bold text-gray-500">
                      <span>{item.quantity}x {item.productName}</span>
                      <span className="tabular-nums">{(item.priceAtOrder * item.quantity).toFixed(2)} €</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-8 flex flex-col items-center border-t-2 border-[#f5f2e8] mt-8 bg-gray-50 rounded-[2.5rem] p-8 border-2 border-gray-100">
              <span className="font-black text-gray-400 uppercase tracking-widest text-[9px] mb-1">Gesamtbetrag (Bisher + Neu)</span>
              <span className="font-black text-5xl text-[#1a4d2e] tracking-tighter tabular-nums">{order.totalAmount.toFixed(2)} €</span>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-4 italic">Zahlung erfolgt bar bei Abholung.</p>
            </div>
          </div>

          <Link to="/" className="w-full text-center bg-black hover:bg-[#1a4d2e] text-white font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] shadow-xl active:scale-95">
            <ArrowLeft className="w-4 h-4" /> Zurück zum Shop
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Success;
