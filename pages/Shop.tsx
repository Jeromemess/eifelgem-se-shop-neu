
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ApiService, getWeekLabel } from '../services/api';
import { Product, Customer, OrderItem, Order, StoreSettings } from '../types';
import { Loader2, X, ArrowRight, ShoppingCart, History, ShoppingBag, Banknote, UserPlus, Sprout, Tractor, Clock, MapPin, RefreshCcw } from 'lucide-react';

const Shop: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({ 
    pickupDay: '', pickupTime: '', openDay: '', maxSlots: 0, currentPickupDate: '', isShopOpen: true, nextOpeningText: '' 
  });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [previousOrder, setPreviousOrder] = useState<Order | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const loadInitialData = async () => {
    // Gecachte Daten sofort anzeigen → kein Spinner bei Wiederkehrern
    const cachedProds = localStorage.getItem('eifel_products_cache');
    const cachedSetts = localStorage.getItem('eifel_settings_cache');
    if (cachedProds && cachedSetts) {
      const prods: Product[] = JSON.parse(cachedProds);
      const setts: StoreSettings = JSON.parse(cachedSetts);
      setProducts(prods.filter(p => p.isActive).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      setSettings(setts);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const user = await ApiService.getCurrentUser();
      setCurrentUser(user);

      // Wochenlabel aus Cache für parallelen Order-Fetch
      const cachedSettsParsed: StoreSettings | null = cachedSetts ? JSON.parse(cachedSetts) : null;
      const weekForFetch = cachedSettsParsed?.currentPickupDate
        ? getWeekLabel(new Date(cachedSettsParsed.currentPickupDate))
        : getWeekLabel(new Date());

      // Alle 3 Quellen gleichzeitig laden
      const [prodData, storeSettings, prevOrder] = await Promise.all([
        ApiService.getProducts(),
        ApiService.getSettings(),
        user
          ? ApiService.getOrdersForUser(`${user.firstName} ${user.lastName}`, weekForFetch)
          : Promise.resolve(null)
      ]);

      const sortedProducts = [...prodData]
        .filter(p => p.isActive)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      setProducts(sortedProducts);
      setSettings(storeSettings);
      setPreviousOrder(prevOrder);

      // Cache für nächsten Besuch aktualisieren
      localStorage.setItem('eifel_products_cache', JSON.stringify(prodData));
      localStorage.setItem('eifel_settings_cache', JSON.stringify(storeSettings));
    } catch (err: any) {
      console.error("Fehler beim Laden im Shop:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

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

  const handleUpdateQuantity = useCallback((productId: string, qty: number) => {
    setCart(prev => {
      const next = { ...prev, [productId]: qty };
      if (qty <= 0) delete next[productId];
      return next;
    });
  }, []);

  const handleSwitchUser = () => {
    setCurrentUser(null);
    setPreviousOrder(null);
    setFirstName('');
    setLastName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(cart).length === 0) return;

    // Lagerbestand prüfen
    for (const [productId, qty] of Object.entries(cart)) {
      const p = products.find(prod => prod.id === productId);
      if (p && Number(qty) > p.stockQuantity) {
        alert(`"${p.name}" ist nur noch ${p.stockQuantity}x verfügbar. Bitte passe die Menge an.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let user = currentUser;
      if (!user) {
        if (!firstName || !lastName) throw new Error("Bitte gib deinen Namen an.");
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

      const week = settings?.currentPickupDate
        ? getWeekLabel(new Date(settings.currentPickupDate))
        : getWeekLabel(new Date());

      // Nur den neuen Betrag übergeben — submitOrder addiert intern den bestehenden Betrag
      const order = await ApiService.submitOrder(user, newItems, cartTotal, week, isShipping);

      // Bestand im lokalen State sofort reduzieren, damit Kunden die aktuelle Verfügbarkeit sehen
      setProducts(prev => prev.map(p => {
        const ordered = newItems.find(item => item.productId === p.id);
        if (!ordered) return p;
        return { ...p, stockQuantity: Math.max(0, p.stockQuantity - ordered.quantity) };
      }));

      setCart({});
      setIsCheckoutOpen(false);
      navigate('/success', { state: { order, newItems: newItems } });
    } catch (err: any) {
      console.error("Bestellfehler:", err);
      alert(err.message || 'Fehler bei der Bestellung. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin" style={{color: 'var(--eifel-dark)'}} />
      <p className="text-[10px] font-medium uppercase tracking-widest" style={{color: 'var(--eifel-text-muted)'}}>Acker wird gescannt…</p>
    </div>
  );

  if (!settings.isShopOpen) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12" style={{backgroundColor: 'var(--eifel-beige)'}}>
        <div className="max-w-xl w-full bg-white rounded-[3.5rem] p-10 sm:p-16 text-center overflow-hidden relative" style={{boxShadow: '0 16px 48px rgba(0,40,32,.14)', border: '1px solid var(--eifel-beige-dark)'}}>
          <div className="absolute top-0 left-0 w-full h-1.5" style={{backgroundColor: 'var(--eifel-orange)'}}></div>
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8" style={{backgroundColor: 'rgba(240,160,32,0.08)'}}>
            <Clock className="w-12 h-12 animate-pulse" style={{color: 'var(--eifel-orange)'}} />
          </div>
          <h2 className="font-display text-4xl font-semibold italic mb-6" style={{color: 'var(--eifel-dark)'}}>Hofpause!</h2>
          <p className="text-lg italic mb-10" style={{color: 'var(--eifel-text-muted)'}}>
            Wir aktualisieren gerade das Angebot für dich. <br/>Komm bald wieder!
          </p>
          <div className="rounded-3xl p-8 mb-8 border-2 border-dashed" style={{backgroundColor: 'var(--eifel-beige)', borderColor: 'var(--eifel-beige-darker)'}}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={{color: 'var(--eifel-dark)'}}>Shop öffnet wieder:</p>
            <p className="font-display text-2xl font-semibold" style={{color: 'var(--eifel-dark)'}}>{settings.nextOpeningText || 'Demnächst'}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-widest" style={{color: 'var(--eifel-text-muted)'}}>
            <MapPin className="w-3 h-3" /> Eifelgemüse am Acker
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-40 max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-16 mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-4" style={{color: 'var(--eifel-green)'}}>— Wochenmarkt —</p>
        <h2 className="font-display text-4xl md:text-6xl font-semibold mb-4 leading-tight" style={{color: 'var(--eifel-dark)'}}>
          Frisches Gemüse.<br/>
          <em style={{color: 'var(--eifel-green)'}}>Direkt vom Feld.</em>
        </h2>
        <div className="max-w-xl mx-auto mb-10">
          <p className="text-lg mb-6 italic" style={{color: 'var(--eifel-text-muted)'}}>
            Nächste Ernte: <span className="not-italic font-semibold" style={{color: 'var(--eifel-dark)'}}>
              {settings.currentPickupDate ? new Date(settings.currentPickupDate).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' }) : 'Demnächst'}
              {settings.pickupTime ? ` · ${settings.pickupTime} Uhr` : ''}
            </span>
          </p>
          <div className="h-px w-16 mx-auto rounded-full" style={{backgroundColor: 'var(--eifel-green)'}}></div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed" style={{borderColor: 'var(--eifel-beige-dark)'}}>
          <Sprout className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--eifel-beige-darker)'}} />
          <p className="text-sm font-medium uppercase tracking-widest mb-6" style={{color: 'var(--eifel-text-muted)'}}>Der Acker ist gerade leer…</p>
          <button onClick={loadInitialData} className="inline-flex items-center gap-2 text-white px-8 py-4 rounded-2xl font-semibold text-xs uppercase tracking-widest transition-all" style={{backgroundColor: 'var(--eifel-dark)', boxShadow: '0 6px 24px rgba(0,40,32,.18)'}}>
            <RefreshCcw className="w-4 h-4" /> Seite neu laden
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              quantityInCart={cart[product.id] || 0}
              onUpdateQuantity={handleUpdateQuantity}
            />
          ))}
        </div>
      )}

      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4" style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
          <button onClick={() => setIsCheckoutOpen(true)} className="w-full text-white p-2 rounded-full shadow-2xl flex items-center justify-between border border-white/10 transition-all hover:scale-105 active:scale-95" style={{backgroundColor: 'var(--eifel-dark-2)'}}>
            <div className="flex items-center gap-2 ml-3">
              <div className="text-white w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{backgroundColor: 'var(--eifel-dark)'}}>{cartCount}</div>
              {previousOrder && (
                <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                  + {previousOrder.items.reduce((s, i) => s + i.quantity, 0)} bereits
                </span>
              )}
            </div>
            <div className="text-white py-3 px-6 rounded-full font-semibold text-[10px] uppercase tracking-widest flex items-center gap-2" style={{backgroundColor: 'var(--eifel-dark)'}}>
              Kiste prüfen <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 backdrop-blur-md" style={{backgroundColor: 'rgba(0,56,48,0.85)'}} onClick={() => !isSubmitting && setIsCheckoutOpen(false)} />
          <div className="relative bg-white w-full sm:max-w-xl sm:rounded-[3rem] rounded-t-[2.5rem] overflow-hidden shadow-2xl p-6 sm:p-14 max-h-[92dvh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="font-display text-3xl font-semibold leading-tight" style={{color: 'var(--eifel-dark)'}}>Blick in deine Kiste</h3>
                <p className="text-[9px] font-semibold uppercase tracking-widest mt-2" style={{color: 'var(--eifel-green)'}}>Alles frisch für dich reserviert!</p>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-8 h-8 text-gray-400" /></button>
            </div>

            <div className="space-y-6 mb-10">
              <div className="rounded-[2rem] p-8 border-2" style={{backgroundColor: 'var(--eifel-beige)', borderColor: 'rgba(0,80,64,0.1)'}}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-6 flex items-center gap-2" style={{color: 'var(--eifel-dark)'}}>
                  <ShoppingCart className="w-4 h-4" /> Deine Kiste:
                </p>
                <div className="space-y-3 mb-8">
                  {/* Bereits bestellte Artikel */}
                  {previousOrder && previousOrder.items.map((item, idx) => (
                    <div key={`prev-${idx}`} className="flex justify-between items-center rounded-xl px-4 py-3" style={{backgroundColor: 'rgba(0,80,64,0.06)', border: '1px solid rgba(0,80,64,0.1)'}}>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{backgroundColor: 'rgba(0,80,64,0.12)', color: 'var(--eifel-dark)'}}>✓ bereits</span>
                        <span className="font-semibold" style={{color: 'var(--eifel-text)'}}>{item.quantity}x {item.productName}</span>
                      </div>
                      <span className="text-sm tabular-nums font-medium" style={{color: 'var(--eifel-text-muted)'}}>{(item.priceAtOrder * item.quantity).toFixed(2)} €</span>
                    </div>
                  ))}
                  {/* Neu hinzugefügte Artikel */}
                  {Object.entries(cart).map(([id, qty]) => {
                    const p = products.find(prod => prod.id === id);
                    if (!p) return null;
                    const lineTotal = calculateTotalToPay(p, Number(qty));
                    return (
                      <div key={id} className="flex justify-between items-center rounded-xl px-4 py-3 bg-white" style={{border: '1px solid rgba(112,160,32,0.2)'}}>
                        <div className="flex items-center gap-3">
                          {previousOrder && <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{backgroundColor: 'rgba(112,160,32,0.15)', color: 'var(--eifel-green)'}}>+ neu</span>}
                          <span className="font-semibold text-lg" style={{color: 'var(--eifel-text)'}}>{qty}x {p.name}</span>
                        </div>
                        <span className="text-sm tabular-nums font-semibold" style={{color: 'var(--eifel-dark)'}}>{lineTotal.toFixed(2)} €</span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-gray-200 space-y-4">
                  <div className="bg-white rounded-2xl p-6 space-y-4" style={{border: '2px solid rgba(0,80,64,0.1)'}}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2" style={{color: 'var(--eifel-dark)'}}>
                      <MapPin className="w-4 h-4" /> Erhalt der Ware:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setIsShipping(false)}
                        className="py-4 rounded-xl font-semibold text-[10px] uppercase tracking-widest border-2 transition-all"
                        style={!isShipping ? {backgroundColor: 'var(--eifel-dark)', color: 'white', borderColor: 'transparent', boxShadow: '0 4px 12px rgba(0,40,32,.2)'} : {backgroundColor: 'white', color: '#9ca3af', borderColor: '#f3f4f6'}}
                      >
                        Abholung
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsShipping(true)}
                        className="py-4 rounded-xl font-semibold text-[10px] uppercase tracking-widest border-2 transition-all"
                        style={isShipping ? {backgroundColor: 'var(--eifel-dark)', color: 'white', borderColor: 'transparent', boxShadow: '0 4px 12px rgba(0,40,32,.2)'} : {backgroundColor: 'white', color: '#9ca3af', borderColor: '#f3f4f6'}}
                      >
                        Versand
                      </button>
                    </div>

                    {isShipping && (
                      <div className="p-4 rounded-xl space-y-2" style={{backgroundColor: 'rgba(240,160,32,0.06)', border: '1px solid rgba(240,160,32,0.2)'}}>
                        <p className="text-[9px] font-semibold uppercase tracking-widest leading-tight" style={{color: 'var(--eifel-orange)'}}>
                          Info zum Versand:
                        </p>
                        <p className="text-[10px] leading-relaxed" style={{color: 'var(--eifel-text)'}}>
                          • Versand erfolgt meistens am <span className="underline">Donnerstag</span>.<br/>
                          • Kosten: 2€ bis 5€ (je nach Entfernung).<br/>
                          • Ich melde mich persönlich bei dir für die Details!
                        </p>
                      </div>
                    )}
                    {!isShipping && (
                      <div className="p-4 rounded-xl" style={{backgroundColor: 'rgba(112,160,32,0.06)', border: '1px solid rgba(112,160,32,0.15)'}}>
                        <p className="text-[10px] leading-relaxed" style={{color: 'var(--eifel-text)'}}>
                          Abholung am Feld (Mittwoch ab {settings.pickupTime || '17:00'} Uhr).
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="text-[11px] font-semibold uppercase tracking-widest leading-none" style={{color: 'var(--eifel-text-muted)'}}>Gesamtbetrag:</div>
                    <div className="text-right">
                      <span className="font-display text-4xl font-semibold tabular-nums leading-none" style={{color: 'var(--eifel-dark)'}}>
                        {((previousOrder?.totalAmount || 0) + cartTotal).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{color: 'var(--eifel-dark)', backgroundColor: 'rgba(0,80,64,0.05)', border: '1px solid rgba(0,80,64,0.1)'}}>
                    <Banknote className="w-4 h-4 shrink-0" />
                    <p className="text-[9px] font-semibold uppercase tracking-widest leading-tight">Bezahlung in bar direkt am Feld</p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!currentUser ? (
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Vorname" className="w-full p-5 rounded-2xl border-2 border-transparent outline-none text-sm" style={{backgroundColor: 'var(--eifel-beige)', fontFamily: 'inherit'}} required />
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nachname" className="w-full p-5 rounded-2xl border-2 border-transparent outline-none text-sm" style={{backgroundColor: 'var(--eifel-beige)', fontFamily: 'inherit'}} required />
                </div>
              ) : (
                <div className="p-6 rounded-2xl text-center relative" style={{backgroundColor: 'rgba(0,80,64,0.05)', border: '1px solid rgba(0,80,64,0.1)'}}>
                  <button type="button" onClick={handleSwitchUser} className="absolute top-4 right-4 transition-colors hover:text-red-500" style={{color: 'var(--eifel-dark)'}} title="Nutzer wechseln"><UserPlus className="w-4 h-4" /></button>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{color: 'var(--eifel-text-muted)'}}>Reserviert für:</p>
                  <p className="font-display text-xl font-semibold" style={{color: 'var(--eifel-dark)'}}>{currentUser.firstName} {currentUser.lastName}</p>
                </div>
              )}
              <button type="submit" disabled={isSubmitting} className="w-full text-white py-5 rounded-2xl font-semibold uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40" style={{backgroundColor: 'var(--eifel-dark)', boxShadow: '0 6px 24px rgba(0,40,32,.18)'}}>
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Tractor className="w-5 h-5" /> Verbindlich reservieren</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
