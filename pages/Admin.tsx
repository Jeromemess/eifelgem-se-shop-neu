
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ApiService, getWeekLabel } from '../services/api';
import { Product, Order, TabView, StoreSettings } from '../types';
import { 
  Lock, Trash2, Edit2, Plus, LogOut, Loader2, UserCircle, CheckSquare, Square, Camera, Save, ChevronDown, ChevronUp, ClipboardList, ShoppingBasket, Calendar, CheckCircle2, Minus, Tag, Zap, Eye, EyeOff, AlertTriangle
} from 'lucide-react';

const ADMIN_PIN = '5719';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<TabView>('orders');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [harvestedItems, setHarvestedItems] = useState<string[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({ pickupDay: 'Mittwoch', pickupTime: '17:00', openDay: 'Sonntag', maxSlots: 50, currentPickupDate: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem('admin_session') === 'true') { 
      setIsAuthenticated(true); 
      loadData(); 
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [p, o, s, h] = await Promise.all([
        ApiService.getProducts(), 
        ApiService.getOrders(), 
        ApiService.getSettings(),
        ApiService.getHarvestedStatus()
      ]);
      setProducts(p); 
      setOrders(o); 
      setSettings(s);
      setHarvestedItems(h);
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const productToSave: Product = {
        id: currentProduct.id || Math.random().toString(36).substr(2, 9),
        name: currentProduct.name || 'Unbekannt',
        pricePerUnit: Number(currentProduct.pricePerUnit) || 0,
        unit: currentProduct.unit || 'Stück',
        imageUrl: currentProduct.imageUrl || 'https://images.unsplash.com/photo-1566385908041-9c9ca335606d?w=400',
        stockQuantity: Number(currentProduct.stockQuantity) || 0,
        isActive: currentProduct.isActive ?? true,
        description: currentProduct.description || '',
        discount: Number(currentProduct.discount) || 0,
        isBogo: !!currentProduct.isBogo
      };
      await ApiService.saveProduct(productToSave);
      setIsEditing(false);
      await loadData();
    } catch (err: any) {
      alert(`Fehler beim Speichern: ${err.message}`);
    } finally { setIsLoading(false); }
  };

  const handleResetOrders = async () => {
    setIsLoading(true);
    try {
      await ApiService.clearAllOrders();
      await loadData();
      setShowResetConfirm(false);
      alert("Alle Bestellungen wurden gelöscht. Startklar für die neue Woche!");
    } catch (err) {
      alert("Fehler beim Löschen.");
    } finally { setIsLoading(false); }
  };

  const handleToggleVisibility = async (product: Product) => {
    try {
      await ApiService.saveProduct({ ...product, isActive: !product.isActive });
      loadData();
    } catch (err: any) {
      alert("Fehler: " + err.message);
    }
  };

  const handleUpdateStock = async (productId: string, delta: number) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    try {
      const newStock = Math.max(0, p.stockQuantity + delta);
      await ApiService.saveProduct({ ...p, stockQuantity: newStock });
      loadData();
    } catch (err: any) {
      alert("Fehler: " + err.message);
    }
  };

  const togglePacked = async (orderId: string, itemIdx: number) => {
    await ApiService.togglePackedStatus(orderId, itemIdx);
    loadData();
  };

  const toggleHarvested = async (name: string) => {
    await ApiService.toggleHarvested(name);
    loadData();
  };

  const harvestSummary = useMemo(() => {
    const summary: Record<string, { quantity: number, unit: string }> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!summary[item.productName]) {
          const product = products.find(p => p.id === item.productId);
          summary[item.productName] = { quantity: 0, unit: product?.unit || 'Stück' };
        }
        summary[item.productName].quantity += item.quantity;
      });
    });
    return Object.entries(summary).sort((a, b) => b[1].quantity - a[1].quantity);
  }, [orders, products]);

  if (!isAuthenticated) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 overflow-hidden">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-[#1a4d2e] text-white rounded-[1.2rem] flex items-center justify-center mx-auto mb-6 shadow-xl"><Lock className="w-8 h-8" /></div>
        <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter text-black">Hof-Login</h2>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} className="w-full p-4 bg-[#fdfbf7] border-2 border-[#f5f2e8] rounded-2xl mb-6 text-center text-3xl outline-none font-black text-black" placeholder="PIN" />
        <button className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95">Login</button>
      </form>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 overflow-x-hidden pb-32">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#f5f2e8] rounded-[1rem] flex items-center justify-center text-[#1a4d2e]"><UserCircle className="w-6 h-6" /></div>
          <div><h1 className="text-xl font-black uppercase tracking-tighter leading-none text-black">Hof-Zentrale</h1><p className="text-[#1a4d2e] text-[8px] font-black uppercase tracking-widest mt-1">Management</p></div>
        </div>
        <button onClick={() => { sessionStorage.removeItem('admin_session'); setIsAuthenticated(false); }} className="p-2 text-gray-300 hover:text-red-600 transition-colors"><LogOut className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-2 sm:flex bg-[#f5f2e8] p-1.5 rounded-[1.5rem] mb-8 gap-1.5">
        {[
          {id: 'orders', label: 'Packen'},
          {id: 'products', label: 'Sortiment'},
          {id: 'harvest', label: 'Ernteplan'},
          {id: 'settings', label: 'Setup'}
        ].map((t) => (
          <button key={t.id} onClick={() => { setActiveTab(t.id as TabView); setIsEditing(false); }} className={`py-3 sm:py-4 px-3 sm:px-6 rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] p-4 sm:p-10 border border-[#f5f2e8] shadow-sm min-h-[400px]">
        {isLoading && !isEditing && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-50 rounded-[2rem]"><Loader2 className="w-10 h-10 animate-spin text-[#1a4d2e]" /></div>}

        {activeTab === 'orders' && (
           <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2"><ClipboardList className="text-[#1a4d2e] w-5 h-5" /><h3 className="font-black text-xl uppercase tracking-tighter text-black">Kundenkörbe</h3></div>
             {orders.length === 0 ? <p className="text-center py-20 text-gray-300 font-black uppercase tracking-widest text-[10px]">Keine Bestellungen</p> : 
               orders.map(o => (
                 <div key={o.id} className="border-2 rounded-[1.5rem] border-[#f5f2e8] bg-[#fdfbf7] overflow-hidden">
                    <button onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)} className="w-full flex justify-between items-center p-4 hover:bg-white transition-colors">
                      <div className="text-left">
                        <h4 className="text-lg font-black uppercase tracking-tighter text-black">{o.customerName}</h4>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{o.items.length} Posten • {o.totalAmount.toFixed(2)}€ • {o.weekLabel}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${o.items.every(i => i.packed) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {o.items.every(i => i.packed) ? 'Fertig' : 'Packen'}
                      </div>
                    </button>
                    {expandedOrderId === o.id && (
                      <div className="p-4 bg-white border-t border-[#f5f2e8] space-y-3">
                        {o.items.map((item, idx) => (
                          <button key={idx} onClick={() => togglePacked(o.id, idx)} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${item.packed ? 'bg-gray-50 border-transparent opacity-40' : 'bg-white border-[#1a4d2e]/10'}`}>
                            {item.packed ? <CheckSquare className="w-8 h-8 text-[#1a4d2e]" /> : <Square className="w-8 h-8 text-gray-200" />}
                            <div className="text-left"><p className="text-2xl font-black leading-none">{item.quantity}x</p><p className="text-sm font-black text-[#1a4d2e] uppercase">{item.productName}</p></div>
                          </button>
                        ))}
                      </div>
                    )}
                 </div>
               ))
             }
           </div>
        )}

        {activeTab === 'harvest' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2"><ShoppingBasket className="text-[#1a4d2e] w-5 h-5" /><h3 className="font-black text-xl uppercase tracking-tighter text-black">Ernteplan</h3></div>
            {harvestSummary.map(([name, data]) => {
              const isHarvested = harvestedItems.includes(name);
              return (
                <div key={name} onClick={() => toggleHarvested(name)} className={`flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all ${isHarvested ? 'bg-[#f5f2e8] border-transparent opacity-40' : 'bg-[#fdfaf3] border-[#f5f2e8]'}`}>
                  <div className="text-left"><p className={`text-[9px] font-black uppercase tracking-widest ${isHarvested ? 'text-gray-400' : 'text-[#1a4d2e]'}`}>Gesamt</p><p className="text-4xl font-black tracking-tighter">{data.quantity} <span className="text-xs">{data.unit}</span></p><p className="text-lg font-black uppercase tracking-tighter">{name}</p></div>
                  <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 ${isHarvested ? 'bg-[#1a4d2e] text-white border-transparent' : 'bg-white text-gray-200'}`}><CheckCircle2 className="w-7 h-7" /></div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            {isEditing ? (
              <form onSubmit={handleSaveProduct} className="space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tighter text-black">{currentProduct.id ? 'Sorte anpassen' : 'Neu anlegen'}</h3>
                <div onClick={() => fileInputRef.current?.click()} className="h-48 bg-[#fdfaf3] rounded-[1.5rem] border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden">
                  {currentProduct.imageUrl ? <img src={currentProduct.imageUrl} className="w-full h-full object-cover" /> : <div className="text-center"><Camera className="w-8 h-8 mx-auto text-gray-300" /></div>}
                  <input type="file" ref={fileInputRef} onChange={e => { const file = e.target.files?.[0]; if(file) { const reader = new FileReader(); reader.onloadend = () => setCurrentProduct({...currentProduct, imageUrl: reader.result as string}); reader.readAsDataURL(file); } }} className="hidden" accept="image/*" />
                </div>
                <div className="space-y-4">
                    <input type="text" value={currentProduct.name || ''} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} placeholder="NAME DER SORTE" className="w-full p-4 bg-[#fdfaf3] rounded-2xl font-black uppercase border-2 border-transparent focus:border-[#1a4d2e] outline-none" required />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" step="0.01" value={currentProduct.pricePerUnit || ''} onChange={e => setCurrentProduct({...currentProduct, pricePerUnit: Number(e.target.value)})} placeholder="PREIS" className="p-4 bg-[#fdfaf3] rounded-2xl font-black" required />
                      <input type="text" value={currentProduct.unit || ''} onChange={e => setCurrentProduct({...currentProduct, unit: e.target.value})} placeholder="EINHEIT" className="p-4 bg-[#fdfaf3] rounded-2xl font-black uppercase" required />
                    </div>
                    {/* AKTIONEN */}
                    <div className="p-4 bg-[#1a4d2e]/5 rounded-2xl border border-[#1a4d2e]/10 flex gap-4">
                      <div className="flex-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-[#1a4d2e] mb-1 block">Rabatt %</label>
                        <input type="number" value={currentProduct.discount || 0} onChange={e => setCurrentProduct({...currentProduct, discount: Number(e.target.value)})} className="w-full p-2 bg-white rounded-lg font-black" />
                      </div>
                      <div className="flex-1 flex items-end">
                        <button type="button" onClick={() => setCurrentProduct({...currentProduct, isBogo: !currentProduct.isBogo})} className={`w-full py-3 rounded-lg font-black text-[9px] uppercase tracking-widest border-2 transition-all ${currentProduct.isBogo ? 'bg-[#1a4d2e] text-white border-transparent' : 'bg-white text-gray-400'}`}>1+1 Gratis</button>
                      </div>
                    </div>
                    <div className="p-4 bg-[#fdfaf3] rounded-2xl border-2 border-[#f5f2e8]">
                        <label className="text-[8px] font-black uppercase tracking-widest text-[#1a4d2e] mb-1 block">Bestand</label>
                        <input type="number" value={currentProduct.stockQuantity || 0} onChange={e => setCurrentProduct({...currentProduct, stockQuantity: Number(e.target.value)})} className="w-full bg-transparent text-2xl font-black outline-none" />
                    </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black uppercase text-[10px]">Abbruch</button>
                  <button type="submit" className="flex-1 py-4 bg-[#1a4d2e] text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Speichern</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex justify-between items-center"><h3 className="font-black text-xl uppercase tracking-tighter text-black">Sortiment</h3><button onClick={() => { setCurrentProduct({ isActive: true, unit: 'Stück', stockQuantity: 10 }); setIsEditing(true); }} className="bg-black text-white px-4 py-3 rounded-xl font-black text-[9px] uppercase flex items-center gap-2"><Plus className="w-3 h-3" /> Neu</button></div>
                <div className="grid grid-cols-1 gap-4">
                  {products.map(p => (
                    <div key={p.id} className="border-2 rounded-[1.5rem] bg-[#fdfbf7] border-[#f5f2e8] p-4 flex gap-4 items-center">
                      <img src={p.imageUrl} className="w-20 h-20 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0"><h4 className="font-black text-sm uppercase truncate">{p.name}</h4><p className="text-[9px] font-black text-[#1a4d2e]">{p.pricePerUnit.toFixed(2)}€ / {p.unit}</p><div className="flex items-center gap-3 mt-2"><button onClick={() => handleUpdateStock(p.id, -1)} className="w-8 h-8 bg-white border rounded-lg flex items-center justify-center"><Minus className="w-3 h-3 text-red-500" /></button><p className="text-lg font-black min-w-[30px] text-center">{p.stockQuantity}</p><button onClick={() => handleUpdateStock(p.id, 1)} className="w-8 h-8 bg-white border rounded-lg flex items-center justify-center"><Plus className="w-3 h-3 text-green-500" /></button></div></div>
                      <div className="flex flex-col gap-2"><button onClick={() => handleToggleVisibility(p)} className={`p-3 bg-white border rounded-xl ${p.isActive ? 'text-[#1a4d2e]' : 'text-gray-300'}`}>{p.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button><button onClick={() => { setCurrentProduct(p); setIsEditing(true); }} className="p-3 bg-white border rounded-xl"><Edit2 className="w-4 h-4" /></button></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto space-y-8 py-4 text-center">
            <h4 className="font-black text-xl uppercase tracking-tighter text-black">Setup & Verwaltung</h4>
            <div className="space-y-6">
                <div className="p-6 bg-[#fdfaf3] rounded-3xl border border-[#f5f2e8]">
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-4 block">Nächster Abholtermin</label>
                  <input type="date" value={settings.currentPickupDate} onChange={e => setSettings({...settings, currentPickupDate: e.target.value})} className="w-full p-4 rounded-2xl font-black outline-none border-2 border-transparent focus:border-[#1a4d2e]" />
                </div>
                <div className="p-6 bg-[#fdfaf3] rounded-3xl border border-[#f5f2e8]">
                   <label className="text-[10px] font-black uppercase text-gray-400 mb-4 block">Shop-Öffnung ab</label>
                   <select value={settings.openDay} onChange={e => setSettings({...settings, openDay: e.target.value})} className="w-full p-4 rounded-2xl font-black uppercase">
                     {['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'].map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>
            </div>
            
            <button onClick={async () => { await ApiService.saveSettings(settings); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2000); }} className="w-full bg-[#1a4d2e] text-white py-6 rounded-2xl font-black uppercase text-xs shadow-lg">{saveSuccess ? 'Gespeichert!' : 'Einstellungen speichern'}</button>

            <div className="pt-10 border-t border-gray-100 mt-10">
              <p className="text-[10px] font-black uppercase text-red-500 mb-6">Gefahrenbereich</p>
              {showResetConfirm ? (
                <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-200 animate-in zoom-in-95">
                  <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-3" />
                  <p className="text-xs font-bold text-red-800 mb-4">Möchtest du wirklich ALLE Bestellungen dieser Woche löschen?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-white border border-red-200 rounded-xl font-black text-[9px] uppercase">Abbruch</button>
                    <button onClick={handleResetOrders} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase">Ja, Löschen</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowResetConfirm(true)} className="w-full bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Bestellungen für neue Woche zurücksetzen
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
