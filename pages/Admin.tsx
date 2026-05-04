
import React, { useState, useEffect, useMemo } from 'react';
import { ApiService, getWeekLabel } from '../services/api';
import { Product, Order, TabView, StoreSettings } from '../types';
import { 
  Lock, Trash2, Edit2, Plus, LogOut, Loader2, UserCircle, CheckSquare, Square, 
  Save, ClipboardList, X, Wifi, WifiOff, RefreshCcw, Tractor, Calendar, Settings, Power, 
  ArrowUp, ArrowDown, Upload, Image as ImageIcon, Zap, Tag, Eye, EyeOff, MapPin
} from 'lucide-react';

const ADMIN_PIN = (import.meta as any).env?.VITE_ADMIN_PIN || '5719';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<TabView>('orders');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({ 
    pickupDay: 'Mittwoch', pickupTime: '17:00', openDay: 'Sonntag', 
    maxSlots: 50, currentPickupDate: '', isShopOpen: true, nextOpeningText: 'Montag Abend' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [harvestChecklist, setHarvestChecklist] = useState<Record<string, boolean>>({});
  const [ordersDisplayCount, setOrdersDisplayCount] = useState(50);
  const [stockEditId, setStockEditId] = useState<string | null>(null);
  const [stockEditValue, setStockEditValue] = useState<number>(0);

  const isLive = ApiService.isLive();

  useEffect(() => {
    if (sessionStorage.getItem('admin_session') === 'true') { 
      setIsAuthenticated(true); 
      loadData(); 
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [p, o, s] = await Promise.all([
        ApiService.getProducts(), 
        ApiService.getOrders(), 
        ApiService.getSettings()
      ]);
      // Sortiere Produkte nach sortOrder
      setProducts(p.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))); 
      setOrders(o); 
      setSettings(s);
    } catch (err) {
      console.error("Ladefehler:", err);
    } finally { setIsLoading(false); }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) { 
      setIsAuthenticated(true); sessionStorage.setItem('admin_session', 'true'); loadData(); 
    } else { alert('Falsche PIN'); }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await ApiService.saveSettings(settings);
      alert("Hof-Einstellungen wurden in der Cloud aktualisiert!");
    } catch (err: any) { alert("Fehler beim Speichern:\n" + (err?.message || err?.details || JSON.stringify(err))); }
    finally { setIsLoading(false); }
  };

  const resetWeek = async () => {
    if (confirm("Möchtest du wirklich ALLE Bestellungen löschen? Dies leert den Ernteplan für die neue Woche unwiderruflich.")) {
      setIsLoading(true);
      try {
        await ApiService.deleteOrdersForWeek();
        await loadData();
        alert("Woche erfolgreich zurückgesetzt. Alle Bestellungen wurden gelöscht.");
      } catch (err: any) { 
        console.error("Reset Fehler:", err);
        alert("Fehler beim Löschen: " + (err.message || "Unbekannter Fehler")); 
      }
      finally { setIsLoading(false); }
    }
  };

  // BILD UPLOAD HANDLER — komprimiert & lädt direkt in Supabase Storage hoch
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const url = await ApiService.uploadProductImage(file);
      setCurrentProduct(prev => ({ ...prev, imageUrl: url }));
    } catch (err: any) {
      alert('Bild-Upload fehlgeschlagen: ' + (err?.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  // REIHENFOLGE ÄNDERN
  const moveProduct = async (index: number, direction: 'up' | 'down') => {
    const newProducts = [...products];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newProducts.length) return;

    // Tausche Objekte
    const temp = newProducts[index];
    newProducts[index] = newProducts[targetIndex];
    newProducts[targetIndex] = temp;

    // Update sortOrder Werte
    newProducts.forEach((p, i) => p.sortOrder = i);
    
    setProducts(newProducts);
    setIsLoading(true);
    try {
      await Promise.all(newProducts.map(p => ApiService.saveProduct(p)));
    } catch (e) {
      console.error("Fehler beim Sortieren:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // SICHTBARKEIT TOGGLE
  const toggleVisibility = async (p: Product) => {
    const updated = { ...p, isActive: !p.isActive };
    setIsLoading(true);
    try {
      await ApiService.saveProduct(updated);
      await loadData();
    } catch (e) {
      console.error("Fehler beim Sichtbarkeit ändern:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStock = async (product: Product, newQty: number) => {
    setStockEditId(null);
    if (newQty === product.stockQuantity) return;
    setIsLoading(true);
    try {
      await ApiService.saveProduct({ ...product, stockQuantity: newQty });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stockQuantity: newQty } : p));
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  // ERNTEPLAN BERECHNEN
  const harvestPlan = useMemo(() => {
    const totals: Record<string, { name: string, quantity: number, unit: string }> = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        if (!totals[item.productName]) {
          const p = products.find(prod => prod.name === item.productName);
          totals[item.productName] = { 
            name: item.productName, 
            quantity: 0, 
            unit: p?.unit || 'Stück' 
          };
        }
        totals[item.productName].quantity += item.quantity;
      });
    });
    return Object.values(totals);
  }, [orders, products]);

  if (!isAuthenticated) return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4" style={{backgroundColor: 'var(--eifel-beige)'}}>
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm text-center" style={{boxShadow: '0 16px 48px rgba(0,40,32,.14)', border: '1px solid var(--eifel-beige-dark)'}}>
        <div className="w-16 h-16 text-white rounded-[1.2rem] flex items-center justify-center mx-auto mb-6 shadow-xl" style={{backgroundColor: 'var(--eifel-dark)'}}><Lock className="w-8 h-8" /></div>
        <h2 className="font-display text-2xl font-semibold mb-6" style={{color: 'var(--eifel-dark)'}}>Hof-Login</h2>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} className="w-full p-4 rounded-2xl mb-6 text-center text-3xl outline-none font-bold border-2 border-transparent" style={{backgroundColor: 'var(--eifel-beige)', fontFamily: 'inherit'}} placeholder="PIN" />
        <button className="w-full text-white py-4 rounded-2xl font-semibold uppercase tracking-widest text-sm" style={{backgroundColor: 'var(--eifel-dark)'}}>Login</button>
      </form>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center" style={{backgroundColor: 'var(--eifel-beige-dark)', color: 'var(--eifel-dark)'}}><UserCircle className="w-6 h-6" /></div>
          <div>
            <h1 className="font-display text-xl font-semibold leading-none" style={{color: 'var(--eifel-dark)'}}>Hof-Zentrale</h1>
            <div className={`mt-1 flex items-center gap-1.5 ${isLive ? 'text-green-600' : 'text-orange-500'}`}>
              {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="text-[8px] font-semibold uppercase tracking-widest">{isLive ? 'Live-Cloud' : 'Lokal'}</span>
            </div>
          </div>
        </div>
        <button onClick={() => { sessionStorage.removeItem('admin_session'); setIsAuthenticated(false); }} className="p-2 text-gray-300 hover:text-red-600 transition-colors"><LogOut className="w-6 h-6" /></button>
      </div>

      <div className="grid grid-cols-2 sm:flex p-1.5 rounded-[1.5rem] mb-8 gap-1.5" style={{backgroundColor: 'var(--eifel-beige-dark)'}}>
        {[
          { id: 'orders', label: 'Bestellungen', icon: ClipboardList },
          { id: 'harvest', label: 'Ernteplan', icon: Tractor },
          { id: 'products', label: 'Sortiment', icon: Save },
          { id: 'settings', label: 'Woche', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as TabView); setIsEditing(false); }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-[10px] uppercase tracking-widest transition-all"
            style={activeTab === tab.id ? {backgroundColor: 'var(--eifel-dark)', color: 'white', boxShadow: '0 4px 12px rgba(0,40,32,.2)'} : {color: 'var(--eifel-text-muted)'}}
          >
            <tab.icon className="w-3 h-3 shrink-0" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] p-4 sm:p-10 shadow-sm relative min-h-[500px]" style={{border: '1px solid var(--eifel-beige-dark)'}}>
        {isLoading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-50 rounded-[2rem]"><Loader2 className="w-10 h-10 animate-spin" style={{color: 'var(--eifel-dark)'}} /></div>}

        {/* TAB: BESTELLUNGEN */}
        {activeTab === 'orders' && (
           <div className="space-y-4">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl uppercase tracking-tighter text-black flex items-center gap-2">Einzel-Bestellungen ({orders.length})</h3>
                <button onClick={loadData} className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-black transition-transform active:rotate-180 duration-500"><RefreshCcw className="w-4 h-4" /></button>
             </div>
             {orders.length === 0 ? <p className="text-center py-20 text-gray-300 font-black uppercase text-[10px]">Keine Bestellungen vorhanden</p> :
               orders.slice(0, ordersDisplayCount).map(o => (
                 <div key={o.id} className="border-2 rounded-[1.5rem] border-[#E2E2CE] bg-[#F0F0E0] overflow-hidden">
                    <button onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)} className="w-full flex justify-between items-center p-5 hover:bg-white">
                      <div className="text-left">
                        <h4 className="text-lg font-black uppercase tracking-tighter text-black flex items-center gap-2">
                          {o.customerName}
                          {o.isShipping ? (
                            <span className="bg-orange-100 text-orange-700 text-[8px] px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Upload className="w-2 h-2 rotate-90" /> Versand
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-700 text-[8px] px-2 py-0.5 rounded-full flex items-center gap-1">
                              <MapPin className="w-2 h-2" /> Abholung
                            </span>
                          )}
                        </h4>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{o.totalAmount.toFixed(2)}€ • {o.items?.length} Sorten</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${o.items?.every(i => i.packed) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {o.items?.every(i => i.packed) ? 'Gepackt' : 'Offen'}
                      </div>
                    </button>
                    {expandedOrderId === o.id && (
                      <div className="p-4 bg-white border-t border-[#E2E2CE] space-y-3">
                        {o.items?.map((item, idx) => (
                          <button key={idx} onClick={() => ApiService.togglePackedStatus(o.id, idx).then(loadData)} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${item.packed ? 'bg-gray-50 border-transparent opacity-40' : 'bg-white border-[#005040]/10'}`}>
                            {item.packed ? <CheckSquare className="w-8 h-8 text-[#005040]" /> : <Square className="w-8 h-8 text-gray-200" />}
                            <div className="text-left"><p className="text-2xl font-black leading-none">{item.quantity}x</p><p className="text-xs font-black text-[#005040] uppercase">{item.productName}</p></div>
                          </button>
                        ))}
                      </div>
                    )}
                 </div>
               ))
             }
             {orders.length > ordersDisplayCount && (
               <button
                 onClick={() => setOrdersDisplayCount(n => n + 50)}
                 className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-black hover:text-white"
                 style={{backgroundColor: 'var(--eifel-beige-dark)', color: 'var(--eifel-dark)'}}
               >
                 Weitere {Math.min(50, orders.length - ordersDisplayCount)} anzeigen ({ordersDisplayCount}/{orders.length})
               </button>
             )}
           </div>
        )}

        {/* TAB: ERNTEPLAN */}
        {activeTab === 'harvest' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl uppercase tracking-tighter text-black flex items-center gap-2"><Tractor className="w-5 h-5 text-[#005040]" /> Ernteliste (Summen)</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">KW {getWeekLabel(new Date())}</p>
            </div>
            
            {harvestPlan.length === 0 ? (
              <div className="text-center py-20 bg-[#F0F0E0] rounded-[2rem] border-2 border-dashed border-[#E2E2CE]">
                <p className="text-[10px] font-black text-gray-300 uppercase">Derzeit nichts zum ernten</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {harvestPlan.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setHarvestChecklist(p => ({...p, [item.name]: !p[item.name]}))}
                    className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${harvestChecklist[item.name] ? 'bg-green-50 border-transparent opacity-50 grayscale' : 'bg-white border-[#E2E2CE] shadow-sm'}`}
                  >
                    <div className="flex items-center gap-6">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${harvestChecklist[item.name] ? 'bg-green-500 text-white' : 'bg-[#E2E2CE] text-[#005040]'}`}>
                          {harvestChecklist[item.name] ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                       </div>
                       <div className="text-left">
                          <p className="text-3xl font-black leading-none">{item.quantity} <span className="text-sm uppercase">{item.unit}</span></p>
                          <p className="text-xs font-black uppercase text-[#005040] tracking-widest mt-1">{item.name}</p>
                       </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: SORTIMENT */}
        {activeTab === 'products' && (
           <div>
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-xl uppercase tracking-tighter text-black">Gemüsesorten ({products.length})</h3>
                <button onClick={() => { setCurrentProduct({ isActive: true, discount: 0, isBogo: false, sortOrder: products.length }); setIsEditing(true); }} className="bg-black text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"><Plus className="w-4 h-4" /> Neu</button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {products.map((p, idx) => (
                  <div key={p.id} className={`border-2 rounded-[1.5rem] bg-[#F0F0E0] border-[#E2E2CE] p-4 sm:p-5 flex gap-3 sm:gap-4 items-center transition-all ${!p.isActive ? 'opacity-50 grayscale bg-gray-50 border-dashed' : ''}`}>
                    <div className="flex flex-col gap-1">
                       <button onClick={() => moveProduct(idx, 'up')} disabled={idx === 0} className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-[#005040] disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
                       <button onClick={() => moveProduct(idx, 'down')} disabled={idx === products.length - 1} className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-[#005040] disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
                    </div>
                    <img src={p.imageUrl || 'https://images.unsplash.com/photo-1566385908041-9c9ca335606d?w=200'} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shadow-sm shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase truncate text-black flex items-center gap-2">
                        {p.name}
                        {p.isBogo && <Zap className="w-3 h-3 text-green-600 fill-current shrink-0" />}
                        {p.discount ? <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded shrink-0">-{p.discount}%</span> : null}
                      </h4>
                      <p className="text-[10px] font-black text-[#005040]">{p.pricePerUnit.toFixed(2)}€ / {p.unit}</p>

                      {/* Inline-Bestand */}
                      {stockEditId === p.id ? (
                        <div className="flex items-center gap-1.5 mt-2">
                          <button type="button" onClick={() => setStockEditValue(v => Math.max(0, v - 1))} className="w-7 h-7 rounded-lg bg-white border font-black text-lg flex items-center justify-center hover:bg-gray-100">−</button>
                          <input
                            type="number"
                            min={0}
                            value={stockEditValue}
                            onChange={e => setStockEditValue(Math.max(0, Number(e.target.value)))}
                            onKeyDown={e => { if (e.key === 'Enter') saveStock(p, stockEditValue); if (e.key === 'Escape') setStockEditId(null); }}
                            autoFocus
                            className="w-16 text-center p-1 rounded-lg border-2 border-[#005040] font-black text-sm outline-none"
                          />
                          <button type="button" onClick={() => setStockEditValue(v => v + 1)} className="w-7 h-7 rounded-lg bg-white border font-black text-lg flex items-center justify-center hover:bg-gray-100">+</button>
                          <button type="button" onClick={() => saveStock(p, stockEditValue)} className="px-3 h-7 rounded-lg bg-[#005040] text-white text-[9px] font-black uppercase tracking-wider">OK</button>
                          <button type="button" onClick={() => setStockEditId(null)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setStockEditId(p.id); setStockEditValue(p.stockQuantity ?? 0); }}
                          className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 ${
                            (p.stockQuantity ?? 0) === 0
                              ? 'bg-red-100 text-red-600'
                              : (p.stockQuantity ?? 0) <= 5
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          <span className="text-base leading-none">{p.stockQuantity ?? 0}</span>
                          <span className="opacity-70">Stk · bearbeiten</span>
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => toggleVisibility(p)} title={p.isActive ? "Im Shop ausblenden" : "Im Shop anzeigen"} className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${p.isActive ? 'bg-white text-gray-400' : 'bg-orange-500 text-white border-transparent'}`}>
                        {p.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setCurrentProduct(p); setIsEditing(true); }} className="w-9 h-9 flex items-center justify-center bg-white border rounded-xl hover:bg-black hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { if(confirm("Sorten wirklich vom Hof löschen?")) ApiService.deleteProduct(p.id).then(loadData) }} className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 border rounded-xl hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {/* TAB: EINSTELLUNGEN / WOCHE */}
        {activeTab === 'settings' && (
           <form onSubmit={handleSaveSettings} className="space-y-10">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-xl uppercase tracking-tighter text-black">Wochen-Management</h3>
                <button type="button" onClick={resetWeek} className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-3 h-3" /> Neue Woche (Reset)</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6 bg-[#F0F0E0] p-8 rounded-[2rem] border-2 border-[#E2E2CE]">
                    <div className="flex items-center gap-3 mb-4"><Calendar className="text-[#005040] w-5 h-5" /> <span className="font-black uppercase text-[11px] tracking-widest">Abhol-Termin</span></div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Aktuelles Abholdatum</label>
                      <input type="date" value={settings.currentPickupDate} onChange={e => setSettings({...settings, currentPickupDate: e.target.value})} className="w-full p-4 bg-white border-2 border-[#E2E2CE] rounded-2xl font-black" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Uhrzeit</label>
                      <input type="text" value={settings.pickupTime} onChange={e => setSettings({...settings, pickupTime: e.target.value})} placeholder="z.B. 17:00" className="w-full p-4 bg-white border-2 border-[#E2E2CE] rounded-2xl font-black uppercase" />
                    </div>
                 </div>

                 <div className="space-y-6 bg-[#F0F0E0] p-8 rounded-[2rem] border-2 border-[#E2E2CE]">
                    <div className="flex items-center gap-3 mb-4"><Power className="text-[#005040] w-5 h-5" /> <span className="font-black uppercase text-[11px] tracking-widest">Shop Status</span></div>
                    <button type="button" onClick={() => setSettings({...settings, isShopOpen: !settings.isShopOpen})} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${settings.isShopOpen ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                       {settings.isShopOpen ? 'Shop ist GEÖFFNET' : 'Shop ist GESCHLOSSEN'}
                    </button>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Info-Text für Kunden (wenn zu)</label>
                      <textarea value={settings.nextOpeningText} onChange={e => setSettings({...settings, nextOpeningText: e.target.value})} className="w-full p-4 bg-white border-2 border-[#E2E2CE] rounded-2xl font-bold text-sm min-h-[100px]" placeholder="z.B. Wir bereiten gerade die Ernte für Montag vor..." />
                    </div>
                 </div>
              </div>

              <button type="submit" className="w-full py-6 bg-black text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all"><Save className="w-5 h-5" /> Einstellungen Speichern</button>
           </form>
        )}

        {isEditing && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setIsEditing(false)} />
              <div className="relative bg-white w-full max-w-xl rounded-[3rem] p-8 sm:p-14 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
                 <form onSubmit={async (e) => {
                    e.preventDefault();
                    setIsLoading(true);
                    try {
                      await ApiService.saveProduct(currentProduct as any);
                      setIsEditing(false);
                      loadData();
                    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
                 }} className="space-y-6">
                    <div className="flex justify-between items-center mb-8">
                       <h3 className="text-3xl font-black uppercase tracking-tighter">{currentProduct.id ? 'Anpassen' : 'Neue Sorte'}</h3>
                       <button type="button" onClick={() => setIsEditing(false)} className="p-2"><X className="w-8 h-8 text-gray-200" /></button>
                    </div>

                    <div className="flex flex-col items-center gap-4 mb-8">
                       <div className="w-32 h-32 bg-[#F0F0E0] rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                          {currentProduct.imageUrl ? (
                            <img src={currentProduct.imageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-gray-300" />
                          )}
                       </div>
                       <label className="cursor-pointer bg-white border-2 border-[#005040] text-[#005040] px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#005040] hover:text-white transition-all flex items-center gap-2">
                          <Upload className="w-3 h-3" /> Foto vom Feld wählen
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                       </label>
                    </div>

                    <div className="flex justify-between items-center bg-[#F0F0E0] p-5 rounded-2xl mb-4">
                       <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sorte im Shop anzeigen</span>
                       <button type="button" onClick={() => setCurrentProduct({...currentProduct, isActive: !currentProduct.isActive})} className={`w-12 h-6 rounded-full transition-all relative ${currentProduct.isActive ? 'bg-[#005040]' : 'bg-gray-200'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${currentProduct.isActive ? 'right-1' : 'left-1'}`} />
                       </button>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Name der Sorte</label>
                       <input type="text" value={currentProduct.name || ''} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full p-5 bg-[#F0F0E0] border-2 border-transparent focus:border-[#005040] outline-none rounded-2xl font-black uppercase" required />
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Beschreibung <span className="normal-case font-medium">(erscheint unter dem Namen im Shop)</span></label>
                       <textarea
                         value={currentProduct.description || ''}
                         onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})}
                         placeholder="z.B. Aus den Sorten Radieschen Rot, Pink & Grün – ideal für Salate und Sandwiches."
                         rows={3}
                         className="w-full p-5 bg-[#F0F0E0] border-2 border-transparent focus:border-[#005040] outline-none rounded-2xl text-sm resize-none"
                         style={{fontFamily: 'inherit'}}
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Preis (€)</label>
                          <input type="number" step="0.01" value={currentProduct.pricePerUnit || ''} onChange={e => setCurrentProduct({...currentProduct, pricePerUnit: Number(e.target.value)})} className="w-full p-5 bg-[#F0F0E0] rounded-2xl font-black" required />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Einheit</label>
                          <input type="text" value={currentProduct.unit || ''} onChange={e => setCurrentProduct({...currentProduct, unit: e.target.value})} placeholder="Bund, kg..." className="w-full p-5 bg-[#F0F0E0] rounded-2xl font-black uppercase" required />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-b py-6 border-gray-100">
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2 block flex items-center gap-1"><Tag className="w-3 h-3" /> Rabatt (%)</label>
                          <input type="number" value={currentProduct.discount || 0} onChange={e => setCurrentProduct({...currentProduct, discount: Number(e.target.value)})} className="w-full p-5 bg-orange-50 rounded-2xl font-black text-orange-600" />
                       </div>
                       <div className="flex flex-col justify-end">
                          <button type="button" onClick={() => setCurrentProduct({...currentProduct, isBogo: !currentProduct.isBogo})} className={`w-full p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${currentProduct.isBogo ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                             <Zap className={`w-4 h-4 ${currentProduct.isBogo ? 'fill-current' : ''}`} /> 1+1 GRATIS
                          </button>
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Lagerbestand (am Acker)</label>
                       <input type="number" value={currentProduct.stockQuantity || ''} onChange={e => setCurrentProduct({...currentProduct, stockQuantity: Number(e.target.value)})} className="w-full p-5 bg-[#F0F0E0] rounded-2xl font-black" required />
                    </div>

                    <button type="submit" className="w-full py-6 bg-[#005040] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl mt-4">Sorte Speichern</button>
                 </form>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
