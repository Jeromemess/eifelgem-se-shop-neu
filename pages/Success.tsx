
import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Order, OrderItem } from '../types';
import { ApiService } from '../services/api';
import { CheckCircle, ArrowLeft, Calendar, PlusCircle, History, Tractor, Banknote, Sprout, ArrowDown } from 'lucide-react';

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
        console.error("Fehler beim Laden der Abholinfo:", err);
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
  const previousTotal = previousItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
  const newlyTotal = newlyAdded.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 pb-24" style={{backgroundColor: 'var(--eifel-beige)'}}>
      <div className="max-w-2xl w-full bg-white rounded-[3rem] overflow-hidden" style={{boxShadow: '0 32px 80px rgba(0,40,32,.18)', border: '1px solid var(--eifel-beige-dark)'}}>

        <div className="p-10 text-center text-white relative" style={{backgroundColor: 'var(--eifel-dark)'}}>
          <div className="absolute top-4 right-6 opacity-10 rotate-12">
            <Tractor className="w-24 h-24" />
          </div>
          <CheckCircle className="w-16 h-16 text-white mx-auto mb-6 drop-shadow-lg" />
          <h2 className="font-display text-3xl font-semibold italic mb-4 leading-tight">
            Saubere Arbeit!<br/>
            Jèrôme zieht schon seine Gummistiefel an…
          </h2>
          <p className="text-lg italic opacity-90 px-4">
            …und ist schon auf dem Weg zum Acker, um deine Beute zu fassen!
          </p>
        </div>

        <div className="p-8 sm:p-12">
          {pickupInfo && (
            <div className="rounded-[2.5rem] p-8 mb-10 text-center relative overflow-hidden" style={{backgroundColor: 'var(--eifel-beige)', border: '1px solid var(--eifel-beige-dark)'}}>
              <Calendar className="w-8 h-8 mx-auto mb-4" style={{color: 'var(--eifel-dark)'}} />
              <p className="text-[9px] uppercase font-semibold tracking-widest mb-1" style={{color: 'var(--eifel-text-muted)'}}>Deine Abholzeit am Hof</p>
              <p className="font-display text-2xl font-semibold" style={{color: 'var(--eifel-dark)'}}>{pickupInfo.day}, {pickupInfo.dateStr}</p>
              <p className="font-medium mt-1 text-lg" style={{color: 'var(--eifel-text)'}}>ab {pickupInfo.time} Uhr</p>
            </div>
          )}

          <div className="mb-10 space-y-10">
            <div className="flex flex-col items-center pb-6 border-b border-gray-100">
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1" style={{color: 'var(--eifel-text-muted)'}}>Reserviert für</span>
              <span className="font-display text-2xl font-semibold" style={{color: 'var(--eifel-dark)', borderBottom: '3px solid rgba(0,80,64,0.2)', paddingBottom: '2px'}}>{order.customerName}</span>
            </div>

            <div className="space-y-5">
              <h4 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest" style={{color: 'var(--eifel-dark)'}}>
                <div className="w-8 h-8 rounded-full text-white flex items-center justify-center" style={{backgroundColor: 'var(--eifel-dark)'}}>
                  <PlusCircle className="w-4 h-4" />
                </div>
                Neu dazugepackt:
              </h4>
              <div className="rounded-3xl p-6" style={{backgroundColor: 'rgba(0,80,64,0.05)', border: '1px solid rgba(0,80,64,0.1)'}}>
                <ul className="space-y-4">
                  {newlyAdded.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-sm font-bold shadow-sm" style={{color: 'var(--eifel-dark)'}}>
                          {item.quantity}x
                        </span>
                        <span className="font-display text-lg font-semibold" style={{color: 'var(--eifel-text)'}}>{item.productName}</span>
                      </div>
                      <span className="text-sm font-medium tabular-nums" style={{color: 'var(--eifel-text-muted)'}}>{(item.priceAtOrder * item.quantity).toFixed(2)} €</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 flex justify-between text-[10px] font-semibold uppercase" style={{borderTop: '1px solid rgba(0,80,64,0.1)', color: 'var(--eifel-dark)'}}>
                  <span>Wert der neuen Ernte:</span>
                  <span>{newlyTotal.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {isFollowUpOrder && (
              <div className="space-y-5 pt-4">
                <h4 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  Schon vorher in deiner Kiste:
                </h4>
                <div className="rounded-3xl p-6 border border-gray-100 bg-gray-50/50">
                  <ul className="space-y-3">
                    {previousItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center opacity-60">
                        <span className="font-medium text-sm text-gray-500">{item.quantity}x {item.productName}</span>
                        <span className="tabular-nums text-xs font-medium">{(item.priceAtOrder * item.quantity).toFixed(2)} €</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-[9px] font-semibold uppercase text-gray-400">
                    <span>Vorheriger Stand:</span>
                    <span>{previousTotal.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center rounded-[3rem] p-10 shadow-2xl relative overflow-hidden text-white" style={{backgroundColor: 'var(--eifel-dark-2)'}}>
              <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
              <span className="font-semibold uppercase tracking-[0.3em] text-[10px] mb-1" style={{color: 'var(--eifel-green)'}}>Hof-Rechnung (Gesamt)</span>
              <span className="text-[9px] opacity-50 uppercase tracking-widest mb-3">alle Artikel zusammen</span>
              <span className="font-display font-semibold text-6xl tracking-tight tabular-nums flex items-start">
                {order.totalAmount.toFixed(2)} <span className="text-2xl mt-2 ml-1">€</span>
              </span>
              <div className="mt-6 px-6 py-3 rounded-full border border-white/10 flex items-center gap-3 shadow-lg" style={{backgroundColor: 'var(--eifel-dark)'}}>
                <Banknote className="w-5 h-5 text-white" />
                <p className="text-[10px] font-semibold uppercase tracking-widest">Barzahlung direkt am Feld</p>
              </div>
            </div>
          </div>

          <Link
            to="/"
            className="w-full text-center text-white font-semibold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95"
            style={{backgroundColor: 'var(--eifel-dark)', boxShadow: '0 6px 24px rgba(0,40,32,.18)'}}
          >
            <ArrowLeft className="w-5 h-5" /> Zurück zum Acker für mehr Beute!
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Success;
