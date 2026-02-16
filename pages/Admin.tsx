
import React, { useState, useEffect, useMemo } from 'react';
import { ApiService, getWeekLabel } from '../services/api';
import { Product, Order, TabView, StoreSettings } from '../types';
import { 
  Lock, Trash2, Edit2, Plus, LogOut, Loader2, UserCircle, CheckSquare, Square, 
  Save, ClipboardList, X, Wifi, WifiOff, RefreshCcw, Tractor, Calendar, Settings, Power, Info
} from 'lucide-react';

const ADMIN_PIN = '5719';

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
      setProducts(p); 
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
    } catch (err) { alert("Fehler beim Speichern der Einstellungen"); }
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
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center border border-[#f5f2e8]">
        <div className="w-16 h-16 bg-[#1a4d2e] text-white rounded-[1.2rem] flex items-center justify-center mx-auto mb-6 shadow-xl"><Lock className="w-8 h-8" /></div>
        <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter">Hof-Login</h2>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} className="w-full p-4 bg-[#fdfbf7] border-2 border-[#f5f2e8] rounded-2xl mb-6 text-center text-3xl outline-none font-black" placeholder="PIN" />
        <button className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm">Login</button>
      </form>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#f5f2e8] rounded-[1rem] flex items-center justify-center text-[#1a4d2e]"><UserCircle className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Hof-Zentrale</h1>
            <div className={`mt-1 flex items-center gap-1.5 ${isLive ? 'text-green-600' : 'text-orange-500'}`}>
               {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
               <span className="text-[8px] font-black uppercase tracking-widest">{isLive ? 'Live-Cloud' : 'Lokal'}</span>
            </div>
          </div>
        </div>
        <button onClick={() => { sessionStorage.removeItem('admin_session'); setIsAuthenticated(false); }} className="p-2 text-gray-300 hover:text-red-600 transition-colors"><LogOut className="w-6 h-6" /></button>
      </div>

      <div className="grid grid-cols-2 sm:flex bg-[#f5f2e8] p-1.5 rounded-[1.5rem] mb-8 gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'orders', label: 'Bestellungen', icon: ClipboardList },
          { id: 'harvest', label: 'Ernteplan', icon: Tractor },
          { id: 'products', label: 'Sortiment', icon: Save },
          { id: 'settings', label: 'Woche', icon: Settings }
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id as TabView); setIsEditing(false); }} className={`flex items-center gap-2 py-3 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>
            <tab.icon className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] p-4 sm:p-10 border border-[#f5f2e8] shadow-sm relative min-h-[500px]">
        {isLoading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-50 rounded-[2rem]"><Loader2 className="w-10 h-10 animate-spin text-[#1a4d2e]" /></div>}

        {/* TAB: BESTELLUNGEN */}
        {activeTab === 'orders' && (
           <div className="space-y-4">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl uppercase tracking-tighter text-black flex items-center gap-2">Einzel-Bestellungen ({orders.length})</h3>
                <button onClick={loadData} className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-black transition-transform active:rotate-180 duration-500"><RefreshCcw className="w-4 h-4" /></button>
             </div>
             {orders.length === 0 ? <p className="text-center py-20 text-gray-300 font-black uppercase text-[10px]">Keine Bestellungen vorhanden</p> : 
               orders.map(o => (
                 <div key={o.id} className="border-2 rounded-[1.5rem] border-[#f5f2e8] bg-[#fdfbf7] overflow-hidden">
                    <button onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)} className="w-full flex justify-between items-center p-5 hover:bg-white">
                      <div className="text-left">
                        <h4 className="text-lg font-black uppercase tracking-tighter text-black">{o.customerName}</h4>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{o.totalAmount.toFixed(2)}€ • {o.items?.length} Sorten</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${o.items?.every(i => i.packed) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {o.items?.every(i => i.packed) ? 'Gepackt' : 'Offen'}
                      </div>
                    </button>
                    {expandedOrderId === o.id && (
                      <div className="p-4 bg-white border-t border-[#f5f2e8] space-y-3">
                        {o.items?.map((item, idx) => (
                          <button key={idx} onClick={() => ApiService.togglePackedStatus(o.id, idx).then(loadData)} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${item.packed ? 'bg-gray-50 border-transparent opacity-40' : 'bg-white border-[#1a4d2e]/10'}`}>
                            {item.packed ? <CheckSquare className="w-8 h-8 text-[#1a4d2e]" /> : <Square className="w-8 h-8 text-gray-200" />}
                            <div className="text-left"><p className="text-2xl font-black leading-none">{item.quantity}x</p><p className="text-xs font-black text-[#1a4d2e] uppercase">{item.productName}</p></div>
                          </button>
                        ))}
                      </div>
                    )}
                 </div>
               ))
             }
           </div>
        )}

        {/* TAB: ERNTEPLAN */}
        {activeTab === 'harvest' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl uppercase tracking-tighter text-black flex items-center gap-2"><Tractor className="w-5 h-5 text-[#1a4d2e]" /> Ernteliste (Summen)</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">KW {getWeekLabel(new Date())}</p>
            </div>
            
            {harvestPlan.length === 0 ? (
              <div className="text-center py-20 bg-[#fdfbf7] rounded-[2rem] border-2 border-dashed border-[#f5f2e8]">
                <p className="text-[10px] font-black text-gray-300 uppercase">Derzeit nichts zum ernten</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {harvestPlan.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setHarvestChecklist(p => ({...p, [item.name]: !p[item.name]}))}
                    className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${harvestChecklist[item.name] ? 'bg-green-50 border-transparent opacity-50 grayscale' : 'bg-white border-[#f5f2e8] shadow-sm'}`}
                  >
                    <div className="flex items-center gap-6">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${harvestChecklist[item.name] ? 'bg-green-500 text-white' : 'bg-[#f5f2e8] text-[#1a4d2e]'}`}>
                          {harvestChecklist[item.name] ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                       </div>
                       <div className="text-left">
                          <p className="text-3xl font-black leading-none">{item.quantity} <span className="text-sm uppercase">{item.unit}</span></p>
                          <p className="text-xs font-black uppercase text-[#1a4d2e] tracking-widest mt-1">{item.name}</p>
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
                <button onClick={() => { setCurrentProduct({ isActive: true }); setIsEditing(true); }} className="bg-black text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"><Plus className="w-4 h-4" /> Neu</button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {products.map(p => (
                  <div key={p.id} className="border-2 rounded-[1.5rem] bg-[#fdfbf7] border-[#f5f2e8] p-5 flex gap-5 items-center">
                    <img src={p.imageUrl || 'https://images.unsplash.com/photo-1566385908041-9c9ca335606d?w=200'} className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                    <div className="flex-1 min-w-0"><h4 className="font-black text-sm uppercase truncate text-black">{p.name}</h4><p className="text-[10px] font-black text-[#1a4d2e]">{p.pricePerUnit.toFixed(2)}€ / {p.unit}</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => { setCurrentProduct(p); setIsEditing(true); }} className="p-3 bg-white border rounded-xl hover:bg-black hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { if(confirm("Sorten wirklich vom Hof löschen?")) ApiService.deleteProduct(p.id).then(loadData) }} className="p-3 bg-red-50 text-red-500 border rounded-xl hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
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
                 <div className="space-y-6 bg-[#fdfbf7] p-8 rounded-[2rem] border-2 border-[#f5f2e8]">
                    <div className="flex items-center gap-3 mb-4"><Calendar className="text-[#1a4d2e] w-5 h-5" /> <span className="font-black uppercase text-[11px] tracking-widest">Abhol-Termin</span></div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Aktuelles Abholdatum</label>
                      <input type="date" value={settings.currentPickupDate} onChange={e => setSettings({...settings, currentPickupDate: e.target.value})} className="w-full p-4 bg-white border-2 border-[#f5f2e8] rounded-2xl font-black" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Uhrzeit</label>
                      <input type="text" value={settings.pickupTime} onChange={e => setSettings({...settings, pickupTime: e.target.value})} placeholder="z.B. 17:00" className="w-full p-4 bg-white border-2 border-[#f5f2e8] rounded-2xl font-black uppercase" />
                    </div>
                 </div>

                 <div className="space-y-6 bg-[#fdfbf7] p-8 rounded-[2rem] border-2 border-[#f5f2e8]">
                    <div className="flex items-center gap-3 mb-4"><Power className="text-[#1a4d2e] w-5 h-5" /> <span className="font-black uppercase text-[11px] tracking-widest">Shop Status</span></div>
                    <button type="button" onClick={() => setSettings({...settings, isShopOpen: !settings.isShopOpen})} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${settings.isShopOpen ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                       {settings.isShopOpen ? 'Shop ist GEÖFFNET' : 'Shop ist GESCHLOSSEN'}
                    </button>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Info-Text für Kunden (wenn zu)</label>
                      <textarea value={settings.nextOpeningText} onChange={e => setSettings({...settings, nextOpeningText: e.target.value})} className="w-full p-4 bg-white border-2 border-[#f5f2e8] rounded-2xl font-bold text-sm min-h-[100px]" placeholder="z.B. Wir bereiten gerade die Ernte für Montag vor..." />
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
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Name der Sorte</label>
                       <input type="text" value={currentProduct.name || ''} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full p-5 bg-[#fdfbf7] border-2 border-transparent focus:border-[#1a4d2e] outline-none rounded-2xl font-black uppercase" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Preis (€)</label>
                          <input type="number" step="0.01" value={currentProduct.pricePerUnit || ''} onChange={e => setCurrentProduct({...currentProduct, pricePerUnit: Number(e.target.value)})} className="w-full p-5 bg-[#fdfbf7] rounded-2xl font-black" required />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Einheit</label>
                          <input type="text" value={currentProduct.unit || ''} onChange={e => setCurrentProduct({...currentProduct, unit: e.target.value})} placeholder="Bund, kg..." className="w-full p-5 bg-[#fdfbf7] rounded-2xl font-black uppercase" required />
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Lagerbestand (am Acker)</label>
                       <input type="number" value={currentProduct.stockQuantity || ''} onChange={e => setCurrentProduct({...currentProduct, stockQuantity: Number(e.target.value)})} className="w-full p-5 bg-[#fdfbf7] rounded-2xl font-black" required />
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Bild-URL</label>
                       <input type="text" value={currentProduct.imageUrl || ''} onChange={e => setCurrentProduct({...currentProduct, imageUrl: e.target.value})} placeholder="https://..." className="w-full p-5 bg-[#fdfbf7] rounded-2xl font-bold text-xs" />
                    </div>
                    <button type="submit" className="w-full py-6 bg-[#1a4d2e] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl mt-4">Sorte Speichern</button>
                 </form>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
