
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ApiService, getWeekLabel } from '../services/api';
import { Product, Customer, OrderItem, Order, StoreSettings } from '../types';
import { Loader2, X, ArrowRight, Calendar, UserPlus, ShoppingCart, History, ShoppingBag, Banknote } from 'lucide-react';

const Shop: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [previousOrder, setPreviousOrder] = useState<Order | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const [user, prodData, storeSettings] = await Promise.all([
          ApiService.getCurrentUser(),
          ApiService.getProducts(),
          ApiService.getSettings()
        ]);
        
        if (!active) return;

        setCurrentUser(user);
        setProducts(prodData.filter(p => p.isActive));
        setSettings(storeSettings);

        if (user) {
          const week = storeSettings.currentPickupDate 
            ? getWeekLabel(new Date(storeSettings.currentPickupDate)) 
            : getWeekLabel(new Date());
          const prev = await ApiService.getOrdersForUser(`${user.firstName} ${user.lastName}`, week);
          setPreviousOrder(prev);
        }
      } catch (err: any) {
        console.error("Fehler beim Laden:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadInitialData();
    return () => { active = false; };
  }, []);

  const formattedPickupDate = useMemo(() => {
    if (!settings?.currentPickupDate) return null;
    return new Date(settings.currentPickupDate).toLocaleDateString('de-DE', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }, [settings]);

  const calculateTotalToPay = (product: Product, quantity: number): number => {
    let price = product.pricePerUnit;
    if (product.discount) price = price * (1 - product.discount / 100);
    return price * quantity;
  };

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce<number>((sum, [id, qty]) => {
      const product = products.find(p => p.id === id);
      if (!product) return sum;
      return sum + calculateTotalToPay(product, Number(qty));
    }, 0);
  }, [cart, products]);

  const cartCount = Object.values(cart).reduce<number>((a, b) => Number(a) + Number(b), 0);

  const handleUpdateQuantity = (productId: string, qty: number) => {
    setCart(prev => {
      const next = { ...prev, [productId]: qty };
      if (qty <= 0) delete next[productId];
      return next;
    });
  };

  const handleSwitchUser = () => {
    setCurrentUser(null);
    setPreviousOrder(null);
    setFirstName('');
    setLastName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let user = currentUser;
      if (!user) {
        if (!firstName || !lastName) throw new Error("Name fehlt!");
        user = await ApiService.login(firstName, lastName);
        setCurrentUser(user);
      }
      
      const newItems: OrderItem[] = Object.entries(cart).map(([productId, quantity]) => {
        const p = products.find(prod => prod.id === productId);
        if (!p) throw new Error("Produkt nicht gefunden.");
        const paidQty = Number(quantity);
        const physicalQty = p.isBogo ? paidQty * 2 : paidQty;
        const totalLinePrice = calculateTotalToPay(p, paidQty);
        return { 
          productId, 
          quantity: physicalQty, 
          productName: p.name, 
          priceAtOrder: Number((totalLinePrice / physicalQty).toFixed(2)), 
          packed: false 
        };
      });

      const totalCombinedTotal = (previousOrder?.totalAmount || 0) + cartTotal;
      const order = await ApiService.submitOrder(user, newItems, totalCombinedTotal, getWeekLabel(new Date()));
      
      navigate('/success', { state: { order, newItems: newItems } });
    } catch (err: any) {
      alert(err.message || 'Fehler beim Senden.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
    <Loader2 className="w-10 h-10 text-[#1a4d2e] animate-spin" />
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wir schauen nach, was auf dem Acker los ist...</p>
  </div>;

  return (
    <div className="pb-40 max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-16 mt-8">
        <h2 className="text-4xl md:text-7xl font-[900] text-[#121a14] mb-4 tracking-tighter leading-[0.9]">
          Eifel<span className="text-[#1a4d2e]">gemüse</span>
        </h2>
        {formattedPickupDate && (
          <div className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-6 py-3 rounded-full font-black text-[11px] uppercase tracking-widest shadow-xl mb-10 border-2 border-white/20">
            <Calendar className="w-4 h-4" />
            Nächste Ernte: {formattedPickupDate}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            quantityInCart={cart[product.id] || 0}
            onUpdateQuantity={(qty) => handleUpdateQuantity(product.id, qty)}
          />
        ))}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-4">
          <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-[#121a14] text-white p-2 rounded-full shadow-2xl flex items-center justify-between border border-white/10 transition-all hover:scale-105 active:scale-95">
            <div className="flex items-center gap-3 ml-4">
              <div className="bg-[#1a4d2e] text-white w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black">{cartCount}</div>
            </div>
            <div className="bg-[#1a4d2e] text-white py-3 px-8 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
              {previousOrder ? 'Zu meiner Ernte hinzufügen' : 'Beute sichern'} <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#121a14]/80 backdrop-blur-md" onClick={() => !isSubmitting && setIsCheckoutOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl p-8 sm:p-14 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black text-[#121a14] tracking-tighter uppercase leading-none">Blick in deine Kiste</h3>
                <p className="text-[9px] font-black text-[#1a4d2e] uppercase tracking-widest mt-2">Wir packen alles zusammen!</p>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-8 h-8 text-gray-400" /></button>
            </div>

            <div className="space-y-6 mb-10">
              {previousOrder && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-6 opacity-60">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <History className="w-4 h-4" /> Schon sicher in deiner Kiste:
                  </p>
                  <div className="space-y-2">
                    {previousOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm font-bold text-gray-400">
                        <span>{item.quantity}x {item.productName}</span>
                        <span className="tabular-nums">{(item.priceAtOrder * item.quantity).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#fdfaf3] rounded-[2rem] p-8 border-2 border-[#1a4d2e]/10">
                <p className="text-[10px] font-black text-[#1a4d2e] uppercase tracking-widest mb-6 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> {previousOrder ? 'Gerade hinzugefügt:' : 'Deine Auswahl:'}
                </p>
                <div className="space-y-4 mb-8">
                  {Object.entries(cart).map(([id, qty]) => {
                    const p = products.find(prod => prod.id === id);
                    if (!p) return null;
                    const lineTotal = calculateTotalToPay(p, Number(qty));
                    const originalTotal = p.pricePerUnit * Number(qty);
                    const isDiscounted = (p.discount || 0) > 0 || p.isBogo;

                    return (
                      <div key={id} className="flex justify-between items-center text-xl font-black text-[#121a14]">
                        <span className="uppercase tracking-tighter">
                          {p.name} <span className="text-xs text-[#1a4d2e] ml-2">({qty}x)</span>
                        </span>
                        <div className="text-right">
                          {isDiscounted && (
                            <span className="block text-[10px] text-gray-300 line-through tabular-nums leading-none mb-1">
                              {originalTotal.toFixed(2)} €
                            </span>
                          )}
                          <span className="text-[#1a4d2e] text-sm tabular-nums">
                            {lineTotal.toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="pt-6 border-t border-gray-200 space-y-2">
                   {previousOrder && (
                     <>
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                        <span>Bisheriger Betrag:</span>
                        <span>{previousOrder.totalAmount.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-[#1a4d2e] uppercase tracking-widest leading-none">
                        <span>Neu dazu:</span>
                        <span>{cartTotal.toFixed(2)} €</span>
                      </div>
                     </>
                   )}
                   <div className="flex justify-between items-end pt-2">
                      <div className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-none">Gesamt am Hof:</div>
                      <span className="text-4xl font-black text-[#1a4d2e] tabular-nums leading-none">
                        {((previousOrder?.totalAmount || 0) + cartTotal).toFixed(2)} €
                      </span>
                   </div>
                   
                   <div className="mt-4 flex items-center gap-2 text-[#1a4d2e] opacity-60">
                     <Banknote className="w-3 h-3" />
                     <p className="text-[8px] font-black uppercase tracking-widest">Alles vor Ort am Feld bar bezahlen</p>
                   </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!currentUser ? (
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="VORNAME" className="w-full p-5 bg-[#fdfaf3] rounded-2xl border-2 border-transparent focus:border-[#1a4d2e] outline-none font-black text-sm uppercase" required />
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="NACHNAME" className="w-full p-5 bg-[#fdfaf3] rounded-2xl border-2 border-transparent focus:border-[#1a4d2e] outline-none font-black text-sm uppercase" required />
                </div>
              ) : (
                <div className="bg-[#1a4d2e]/5 p-6 rounded-2xl border border-[#1a4d2e]/10 text-center relative">
                  <button type="button" onClick={handleSwitchUser} className="absolute top-4 right-4 text-[#1a4d2e] hover:text-black transition-colors" title="Nutzer wechseln"><UserPlus className="w-4 h-4" /></button>
                  <p className="text-xl font-black uppercase tracking-tight">{currentUser.firstName} {currentUser.lastName}</p>
                </div>
              )}
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#1a4d2e] text-white py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95">
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ShoppingBag className="w-5 h-5" /> {previousOrder ? 'Zu meiner Ernte hinzufügen' : 'Mission Ernte starten!'}</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
