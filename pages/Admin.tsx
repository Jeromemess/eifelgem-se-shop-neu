
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ApiService, getWeekLabel } from '../services/api';
import { Product, Order, TabView, StoreSettings } from '../types';
import { 
  Lock, Trash2, Edit2, Plus, LogOut, Loader2, UserCircle, CheckSquare, Square, Camera, Save, ClipboardList, ShoppingBasket, CheckCircle2, Minus, Eye, EyeOff, AlertTriangle, ArrowUp, ArrowDown
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
        isBogo: !!currentProduct.isBogo,
        sortOrder: currentProduct.sortOrder ?? products.length
      };
      await ApiService.saveProduct(productToSave);
      setIsEditing(false);
      await loadData();
    } catch (err: any) {
      alert(`Fehler beim Speichern: ${err.message}`);
    } finally { setIsLoading(false); }
  };

  const handleMoveProduct = async (index: number, direction: 'up' | 'down') => {
    const newProducts = [...products];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newProducts.length) return;

    // Tausche sortOrder
    const currentSort = newProducts[index].sortOrder ?? index;
    const targetSort = newProducts[targetIndex].sortOrder ?? targetIndex;
    
    newProducts[index].sortOrder = targetSort;
    newProducts[targetIndex].sortOrder = currentSort;

    setIsLoading(true);
    try {
      await Promise.all([
        ApiService.saveProduct(newProducts[index]),
        ApiService.saveProduct(newProducts[targetIndex])
      ]);
      await loadData();
    } catch (err) {
      alert("Fehler beim Sortieren.");
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
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-sm:px-6 w-full max-w-sm text-center">
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

      <div className="bg-white rounded-[2rem] p-4 sm:p-10 border border-[#f5f2e8] shadow-sm min-h-[400px] relative">
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
                    
                    <textarea 
                      value={currentProduct.description || ''} 
                      onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} 
                      placeholder="ZUSATZ-INFO ZUM PRODUKT (Z.B. 'Nur noch 3 Stück da!')" 
                      className="w-full p-4 bg-[#fdfaf3] rounded-2xl font-medium border-2 border-transparent focus:border-[#1a4d2e] outline-none min-h-[100px] resize-none"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#fdfaf3] rounded-2xl p-4">
                        <label className="text-[8px] font-black uppercase text-gray-400 mb-1 block">Preis pro Einheit</label>
                        <input type="number" step="0.01" value={currentProduct.pricePerUnit || ''} onChange={e => setCurrentProduct({...currentProduct, pricePerUnit: Number(e.target.value)})} className="w-full bg-transparent font-black" required />
                      </div>
                      <div className="bg-[#fdfaf3] rounded-2xl p-4">
                        <label className="text-[8px] font-black uppercase text-gray-400 mb-1 block">Einheit</label>
                        <input type="text" value={currentProduct.unit || ''} onChange={e => setCurrentProduct({...currentProduct, unit: e.target.value})} className="w-full bg-transparent font-black uppercase" required />
                      </div>
                    </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black uppercase text-[10px]">Abbruch</button>
                  <button type="submit" className="flex-1 py-4 bg-[#1a4d2e] text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Speichern</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-xl uppercase tracking-tighter text-black">Sortiment</h3>
                  <button onClick={() => { setCurrentProduct({ isActive: true, unit: 'Stück', stockQuantity: 10, discount: 0, isBogo: false, description: '' }); setIsEditing(true); }} className="bg-black text-white px-4 py-3 rounded-xl font-black text-[9px] uppercase flex items-center gap-2">
                    <Plus className="w-3 h-3" /> Neu
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {products.map((p, idx) => (
                    <div key={p.id} className="border-2 rounded-[1.5rem] bg-[#fdfbf7] border-[#f5f2e8] p-4 flex gap-4 items-center group">
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleMoveProduct(idx, 'up')} disabled={idx === 0} className="p-1 hover:text-[#1a4d2e] disabled:text-gray-200">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleMoveProduct(idx, 'down')} disabled={idx === products.length - 1} className="p-1 hover:text-[#1a4d2e] disabled:text-gray-200">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                      <img src={p.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-sm uppercase truncate">{p.name}</h4>
                        {p.description && <p className="text-[9px] text-[#1a4d2e] font-bold uppercase tracking-widest truncate italic">{p.description}</p>}
                        <p className="text-[9px] font-black text-gray-400">{p.pricePerUnit.toFixed(2)}€ / {p.unit}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleVisibility(p)} className={`p-3 bg-white border rounded-xl ${p.isActive ? 'text-[#1a4d2e]' : 'text-gray-300'}`}>{p.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                        <button onClick={() => { setCurrentProduct(p); setIsEditing(true); }} className="p-3 bg-white border rounded-xl"><Edit2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ... Rest of Admin components ... */}
      </div>
    </div>
  );
};

export default Admin;
