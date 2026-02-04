
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ApiService, getWeekLabel } from '../services/api';
import { Product, Customer, OrderItem } from '../types';
import { Loader2, X, ArrowRight, Calendar, CheckSquare, UserPlus, ShoppingBag, AlertCircle, Sparkles } from 'lucide-react';

const Shop: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopStatus, setShopStatus] = useState<{isOpen: boolean, nextOpen?: string}>({ isOpen: true });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, data, status] = await Promise.all([
        ApiService.getCurrentUser(),
        ApiService.getProducts(),
        ApiService.isShopOpen()
      ]);
      setCurrentUser(user);
      setProducts(data.filter(p => p.isActive));
      setShopStatus(status);
    } catch (err) {
      setError("Verbindung zur Datenbank fehlgeschlagen. Bitte prüfe deine Supabase-Einstellungen.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalToPay = (product: Product, quantity: number) => {
    let price = product.pricePerUnit;
    if (product.discount) {
      price = price * (1 - product.discount / 100);
    }
    return price * quantity;
  };

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const product = products.find(p => p.id === id);
      if (!product) return sum;
      return sum + calculateTotalToPay(product, qty as number);
    }, 0);
  }, [cart, products]);

  const cartCount = Object.values(cart).reduce((a: number, b) => a + (b as number), 0) as number;

  const handleUpdateQuantity = (productId: string, qty: number) => {
    setCart(prev => {
      const next = { ...prev, [productId]: qty };
      if (qty <= 0) delete next[productId];
      return next;
    });
  };

  const handleSwitchUser = () => {
    setCurrentUser(null);
    setFirstName('');
    setLastName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      let user = currentUser;
      if (!user) {
        if (!firstName || !lastName) throw new Error("Bitte Vor- und Nachnamen eingeben.");
        user = await ApiService.login(firstName, lastName);
        setCurrentUser(user);
      }
      
      const items: OrderItem[] = Object.entries(cart).map(([productId, quantity]) => {
        const p = products.find(prod => prod.id === productId);
        if (!p) throw new Error("Produkt nicht gefunden");
        const paidQty = quantity as number;
        const physicalQty = p.isBogo ? paidQty * 2 : paidQty;
        const totalLinePrice = calculateTotalToPay(p, paidQty);
        return { 
          productId, 
          quantity: physicalQty, 
          productName: p.name, 
          priceAtOrder: totalLinePrice / physicalQty, 
          packed: false 
        };
      });

      const order = await ApiService.submitOrder(user, items, cartTotal, getWeekLabel(new Date()));
      navigate('/success', { state: { order, newItems: items } });
    } catch (err: any) {
      setError(err.message || 'Fehler beim Bestellen.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#1a4d2e] animate-spin" /></div>;

  if (error) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-black mb-2">Hoppla!</h2>
      <p className="text-gray-500 max-w-sm mb-6">{error}</p>
      <button onClick={() => window.location.reload()} className="bg-[#1a4d2e] text-white px-8 py-3 rounded-full font-black uppercase text-xs">Nochmal versuchen</button>
    </div>
  );

  if (!shopStatus.isOpen) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl text-center border border-[#f5f2e8]">
          <div className="w-20 h-20 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-[1.5rem] flex items-center justify-center mx-auto mb-8"><Calendar className="w-10 h-10" /></div>
          <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter text-[#1a1a1a]">Wir ernten gerade!</h2>
          <p className="text-gray-500 font-bold mb-8 text-sm leading-relaxed">
            Jérôme und die Gang bereiten gerade alles vor. <br/>
            Ab <strong>{shopStatus.nextOpen}</strong> kannst du wieder zuschlagen!
          </p>
          <div className="pt-8 border-t border-gray-100 text-[10px] font-black uppercase tracking-widest text-[#1a4d2e]">Eifelgemüse - Direkt vom Feld</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-40 max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-16 sm:mb-24 mt-8">
        <h2 className="text-4xl md:text-7xl font-[900] text-[#121a14] mb-6 tracking-tighter leading-[0.9]">
          Frisches Gemüse.<br/><span className="text-[#1a4d2e]">Direkt vom Feld.</span>
        </h2>
        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-400 max-w-md mx-auto font-black text-[10px] uppercase tracking-[0.4em] leading-relaxed">
            Stöbere durch unsere Ernte und reserviere deine Auswahl
          </p>
          <div className="inline-flex items-center gap-2 bg-[#f5f2e8] px-4 py-2 rounded-full border border-[#1a4d2e]/10">
            <Sparkles className="w-3 h-3 text-[#1a4d2e]" />
            <span className="text-[8px] font-black uppercase tracking-widest text-[#1a4d2e]">Jérôme hat heute Morgen schon gegossen!</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 mb-12">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            quantityInCart={cart[product.id] || 0}
            onUpdateQuantity={(qty) => handleUpdateQuantity(product.id, qty)}
          />
        ))}
        {products.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center">
             <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Derzeit ist das Feld leergeerntet.</p>
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-4 pointer-events-none">
          <button onClick={() => setIsCheckoutOpen(true)} className="pointer-events-auto w-full bg-[#121a14] text-white p-2 rounded-full shadow-2xl flex items-center justify-between border border-white/10 group transition-all hover:scale-105 active:scale-95">
            <div className="flex items-center gap-3 ml-4">
              <div className="bg-[#1a4d2e] text-white w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black">{cartCount}</div>
            </div>
            <div className="bg-[#1a4d2e] text-white py-3 px-8 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2">Kiste checken <ArrowRight className="w-3 h-3" /></div>
          </button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#121a14]/80 backdrop-blur-md" onClick={() => !isSubmitting && setIsCheckoutOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 sm:p-14 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-3xl font-black text-[#121a14] tracking-tighter uppercase leading-none">Wer kriegt die Beute?</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Jérôme steht schon bereit!</p>
                </div>
                <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-8 h-8 text-gray-400" /></button>
              </div>

              <div className="bg-[#fdfaf3] rounded-[2.5rem] p-6 sm:p-10 border border-[#f5f2e8] mb-12">
                <p className="text-[10px] font-black text-[#1a4d2e] uppercase tracking-widest mb-8 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> Deine Ausbeute:
                </p>
                <div className="space-y-8 mb-10">
                  {Object.entries(cart).map(([id, qty]) => {
                    const p = products.find(prod => prod.id === id);
                    if (!p) return null;
                    const paidQty = qty as number;
                    const physicalQty = p.isBogo ? paidQty * 2 : paidQty;
                    const lineTotal = calculateTotalToPay(p, paidQty);
                    return (
                      <div key={id} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xl sm:text-2xl font-black text-[#121a14] tracking-tight">
                          <span className="flex items-center gap-4">
                            <span className="text-[#1a4d2e] bg-[#1a4d2e]/10 px-3 py-1 rounded-xl text-sm">{physicalQty}x</span>
                            {p.name}
                          </span>
                          <span className="text-gray-400 font-bold text-base">{lineTotal.toFixed(2)} €</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-baseline pt-8 border-t border-[#f2ede1]">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gesamtwert</span>
                  <span className="text-5xl font-black text-[#121a14] tabular-nums tracking-tighter">{cartTotal.toFixed(2)}<span className="text-2xl ml-1 text-[#1a4d2e]">€</span></span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {!currentUser ? (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="VORNAME" className="w-full p-6 bg-[#fdfaf3] rounded-3xl border-2 border-transparent focus:border-[#1a4d2e] outline-none font-black text-sm uppercase tracking-widest shadow-sm" required />
                      <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="NACHNAME" className="w-full p-6 bg-[#fdfaf3] rounded-3xl border-2 border-transparent focus:border-[#1a4d2e] outline-none font-black text-sm uppercase tracking-widest shadow-sm" required />
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#1a4d2e]/5 p-10 rounded-[2.5rem] border border-[#1a4d2e]/10 mb-8 relative group text-center">
                    <button 
                      type="button" 
                      onClick={handleSwitchUser} 
                      className="absolute top-6 right-6 p-2 text-[#1a4d2e] hover:text-black transition-colors"
                      title="Anderer Name?"
                    >
                      <UserPlus className="w-6 h-6" />
                    </button>
                    <p className="text-[10px] font-black text-[#1a4d2e] uppercase tracking-widest mb-1">Moin Moin,</p>
                    <p className="text-3xl font-black text-black uppercase tracking-tight mb-2">{currentUser.firstName} {currentUser.lastName}!</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Jérôme freut sich schon auf dich.</p>
                  </div>
                )}
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#1a4d2e] text-white py-10 rounded-[2.5rem] font-black text-base uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-black active:scale-95">
                  {isSubmitting ? <Loader2 className="w-8 h-8 animate-spin" /> : (
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      Bestellung abschicken!
                    </span>
                  )}
                </button>
              </form>
              <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-10">Zahlung erfolgt bar bei Abholung am Hof.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
