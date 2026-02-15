import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Order, OrderItem } from '../types';
import { ApiService } from '../services/api';
import { CheckCircle, ArrowLeft, Calendar, PlusCircle, History, Tractor, Banknote } from 'lucide-react';

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

  const newlyAdded = newItemsFromState || [];
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
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 bg-[#fdfbf7] pb-24">
      <div className="max-w-2xl w-full bg-white rounded-[3rem] shadow-2xl border border-[#f5f2e8] overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header mit Jèrôme Spruch (Ohne Orange) */}
        <div className="bg-[#1a4d2e] p-10 text-center text-white relative">
          <div className="absolute top-4 right-6 opacity-10 rotate-12">
             <Tractor className="w-24 h-24" />
          </div>
          <CheckCircle className="w-16 h-16 text-white mx-auto mb-6 drop-shadow-lg" />
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 leading-[0.9]">
            Saubere Arbeit!<br/>
            Jèrôme zieht schon seine Gummistiefel an...
          </h2>
          <p className="text-lg font-bold italic opacity-90 px-4">
            ...und ist schon auf dem Weg zum Acker, um deine Beute zu fassen!
          </p>
        </div>

        <div className="p-8 sm:p-12">
          {/* Abhol-Information */}
          {pickupInfo && (
            <div className="bg-[#fdfaf3] border border-[#f5f2e8] rounded-[2.5rem] p-8 mb-10 text-center shadow-inner relative overflow-hidden">
                <Calendar className="w-8 h-8 text-[#1a4d2e] mx-auto mb-4" />
                <p className="text-gray-400 text-[9px] uppercase font-black tracking-widest mb-1">Deine Abholzeit am Hof</p>
                <p className="text-2xl font-black text-[#1a4d2e] tracking-tight">{pickupInfo.day}, {pickupInfo.dateStr}</p>
                <p className="text-gray-900 font-bold mt-1 text-lg">ab {pickupInfo.time} Uhr</p>
            </div>
          )}

          <div className="mb-10 space-y-10">
            <div className="flex flex-col items-center pb-6 border-b border-gray-100">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Reserviert für</span>
               <span className="text-2xl font-black text-black uppercase tracking-tighter border-b-4 border-[#1a4d2e]/20">{order.customerName}</span>
            </div>

            {/* NEUE ARTIKEL */}
            <div className="space-y-5">
              <h4 className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-[#1a4d2e]">
                <div className="w-8 h-8 rounded-full bg-[#1a4d2e] text-white flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                Frisch dazugepackt:
              </h4>
              <div className="bg-[#1a4d2e]/5 rounded-3xl p-6 border border-[#1a4d2e]/10">
                <ul className="space-y-4">
                  {newlyAdded.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-sm font-black text-[#1a4d2e] shadow-sm">
                          {item.quantity}x
                        </span>
                        <span className="text-lg font-black text-gray-800 uppercase tracking-tighter">{item.productName}</span>
                      </div>
                      <span className="text-gray-400 text-sm font-black tabular-nums">{(item.priceAtOrder * item.quantity).toFixed(2)} €</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* BEREITS VORHANDENE ARTIKEL */}
            {isFollowUpOrder && (
              <div className="space-y-5 pt-4">
                <h4 className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-gray-400">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  Schon vorher in deiner Kiste:
                </h4>
                <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100">
                  <ul className="space-y-3">
                    {previousItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center opacity-60">
                        <span className="font-bold text-sm text-gray-500">{item.quantity}x {item.productName}</span>
                        <span className="tabular-nums text-xs font-bold">{(item.priceAtOrder * item.quantity).toFixed(2)} €</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* GESAMTSUMME */}
            <div className="pt-8 flex flex-col items-center border-t-2 border-[#f5f2e8] mt-8 bg-[#121a14] text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
              <span className="font-black text-[#1a4d2e] uppercase tracking-[0.3em] text-[10px] mb-2">Gesamtbetrag der Kiste</span>
              <span className="font-black text-6xl tracking-tighter tabular-nums flex items-start">
                {order.totalAmount.toFixed(2)} <span className="text-2xl mt-2 ml-1">€</span>
              </span>
              <div className="mt-6 px-6 py-3 bg-[#1a4d2e] rounded-full border border-white/10 flex items-center gap-3">
                <Banknote className="w-5 h-5" />
                <p className="text-[10px] font-black uppercase tracking-widest">Alles vor Ort am Feld bar bezahlen</p>
              </div>
            </div>
          </div>

          <Link to="/" className="w-full text-center bg-[#1a4d2e] text-white font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-xl shadow-[#1a4d2e]/20 hover:bg-black active:scale-95">
            <ArrowLeft className="w-5 h-5" /> Zurück zum Acker für mehr!
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Success;
