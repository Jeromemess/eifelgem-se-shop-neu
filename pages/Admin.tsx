
import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/api';
import { Product, Order, TabView, StoreSettings } from '../types';
import { 
  Lock, Trash2, Edit2, Plus, LogOut, Loader2, UserCircle, CheckSquare, Square, Camera, Save, ClipboardList, X, Wifi, WifiOff, RefreshCcw, AlertCircle
} from 'lucide-react';

const ADMIN_PIN = '5719';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<TabView>('orders');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({ pickupDay: 'Mittwoch', pickupTime: '17:00', openDay: 'Sonntag', maxSlots: 50, currentPickupDate: '', isShopOpen: true, nextOpeningText: 'Montag Abend' });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLive = ApiService.isLive();
  const debug = ApiService.getDebugStatus();

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
      console.error("Ladefehler im Admin:", err);
    } finally { setIsLoading(false); }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) { 
      setIsAuthenticated(true); sessionStorage.setItem('admin_session', 'true'); loadData(); 
    } else { alert('Falsche PIN'); }
  };

  if (!isAuthenticated) return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center border border-[#f5f2e8]">
        <div className="w-16 h-16 bg-[#1a4d2e] text-white rounded-[1.2rem] flex items-center justify-center mx-auto mb-6 shadow-xl"><Lock className="w-8 h-8" /></div>
        <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter text-black">Hof-Zentrale</h2>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} className="w-full p-4 bg-[#fdfbf7] border-2 border-[#f5f2e8] rounded-2xl mb-6 text-center text-3xl outline-none font-black" placeholder="PIN" />
        <button className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm">Zutritt</button>
      </form>
      
      <div className="mt-8 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-sm w-full">
         <div className="flex items-center gap-3 mb-4">
            {isLive ? <Wifi className="text-green-500 w-5 h-5" /> : <WifiOff className="text-orange-500 w-5 h-5" />}
            <span className={`text-[10px] font-black uppercase tracking-widest ${isLive ? 'text-green-600' : 'text-orange-600'}`}>
               {isLive ? 'Supabase Cloud Verbunden' : 'Lokal-Modus Aktiv'}
            </span>
         </div>
         <div className="space-y-2 text-[9px] font-mono text-gray-400 break-all">
            <p>URL konfiguriert: {debug.urlSet ? 'JA' : 'NEIN'}</p>
            <p>Key vorhanden: {debug.keySet ? 'JA' : 'NEIN'}</p>
            <p>Endpunkt: {debug.urlPreview}</p>
         </div>
         {!isLive && (
           <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-100 flex gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-[9px] font-bold text-orange-800 leading-tight">
                Die Cloud-Daten werden nicht geladen. Prüfe deine .env Datei auf dem Server/Handy.
              </p>
           </div>
         )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#f5f2e8] rounded-[1rem] flex items-center justify-center text-[#1a4d2e]"><UserCircle className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none text-black">Hof-Zentrale</h1>
            <div className={`mt-1 flex items-center gap-1.5 ${isLive ? 'text-green-600' : 'text-orange-500'}`}>
               {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
               <span className="text-[8px] font-black uppercase tracking-widest">{isLive ? 'Cloud-Live' : 'Lokal'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={loadData} title="Daten neu laden" className="p-2 text-gray-400 hover:text-black transition-colors">
              <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
           </button>
           <button onClick={() => { sessionStorage.removeItem('admin_session'); setIsAuthenticated(false); }} className="p-2 text-gray-300 hover:text-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex bg-[#f5f2e8] p-1.5 rounded-[1.5rem] mb-8 gap-1.5">
        {['orders', 'products', 'settings'].map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab as TabView); setIsEditing(false); }} className={`py-3 sm:py-4 px-3 sm:px-6 rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>
            {tab === 'orders' ? 'Bestellungen' : tab === 'products' ? 'Sortiment' : 'Einstellungen'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] p-4 sm:p-10 border border-[#f5f2e8] shadow-sm min-h-[400px] relative">
        {isLoading && !isEditing && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-50 rounded-[2rem]"><Loader2 className="w-10 h-10 animate-spin text-[#1a4d2e]" /></div>}

        {activeTab === 'orders' && (
           <div className="space-y-4">
             <h3 className="font-black text-xl uppercase tracking-tighter text-black flex items-center gap-2"><ClipboardList className="w-5 h-5 text-[#1a4d2e]" /> Bestellungen ({orders.length})</h3>
             {orders.length === 0 ? <p className="text-center py-20 text-gray-300 font-black uppercase tracking-widest text-[10px]">Keine Bestellungen vorhanden</p> : 
               orders.map(o => (
                 <div key={o.id} className="border-2 rounded-[1.5rem] border-[#f5f2e8] bg-[#fdfbf7] overflow-hidden">
                    <button onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)} className="w-full flex justify-between items-center p-4 hover:bg-white transition-colors">
                      <div className="text-left">
                        <h4 className="text-lg font-black uppercase tracking-tighter text-black">{o.customerName}</h4>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{o.items?.length || 0} Posten • {o.totalAmount.toFixed(2)}€ • {o.weekLabel}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${o.items?.every(i => i.packed) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {o.items?.every(i => i.packed) ? 'Fertig' : 'In Arbeit'}
                      </div>
                    </button>
                    {expandedOrderId === o.id && (
                      <div className="p-4 bg-white border-t border-[#f5f2e8] space-y-3">
                        {o.items?.map((item, idx) => (
                          <button key={idx} onClick={() => ApiService.togglePackedStatus(o.id, idx).then(loadData)} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${item.packed ? 'bg-gray-50 border-transparent opacity-40' : 'bg-white border-[#1a4d2e]/10'}`}>
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
           <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl uppercase tracking-tighter text-black">Sortiment ({products.length})</h3>
                <button onClick={() => { setCurrentProduct({ isActive: true }); setIsEditing(true); }} className="bg-black text-white px-4 py-3 rounded-xl font-black text-[9px] uppercase"><Plus className="w-3 h-3 inline mr-1" /> Neue Sorte</button>
              </div>
              
              {products.length === 0 && !isLoading && (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                   <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Keine Produkte in der Cloud gefunden.</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {products.map(p => (
                  <div key={p.id} className="border-2 rounded-[1.5rem] bg-[#fdfbf7] border-[#f5f2e8] p-4 flex gap-4 items-center">
                    <img src={p.imageUrl || 'https://images.unsplash.com/photo-1566385908041-9c9ca335606d?w=200'} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                       <h4 className="font-black text-sm uppercase truncate">{p.name}</h4>
                       <p className="text-[9px] font-black text-gray-400">{p.pricePerUnit.toFixed(2)}€ / {p.unit}</p>
                       <p className="text-[8px] font-black text-[#1a4d2e] uppercase">{p.stockQuantity} Vorrätig</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setCurrentProduct(p); setIsEditing(true); }} className="p-3 bg-white border rounded-xl hover:bg-gray-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { if(confirm("Sorte wirklich löschen?")) ApiService.deleteProduct(p.id).then(loadData) }} className="p-3 bg-red-50 text-red-500 border rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {isEditing && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
              <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] p-8 sm:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
                 <form onSubmit={async (e) => {
                    e.preventDefault();
                    setIsLoading(true);
                    try {
                      await ApiService.saveProduct(currentProduct as any);
                      setIsEditing(false);
                      loadData();
                    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
                 }} className="space-y-6">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">{currentProduct.id ? 'Sorte bearbeiten' : 'Neue Sorte'}</h3>
                    <input type="text" value={currentProduct.name || ''} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} placeholder="NAME" className="w-full p-4 bg-gray-50 rounded-2xl font-black uppercase" required />
                    <div className="grid grid-cols-2 gap-4">
                       <input type="number" step="0.01" value={currentProduct.pricePerUnit || ''} onChange={e => setCurrentProduct({...currentProduct, pricePerUnit: Number(e.target.value)})} placeholder="PREIS" className="p-4 bg-gray-50 rounded-2xl font-black" required />
                       <input type="text" value={currentProduct.unit || ''} onChange={e => setCurrentProduct({...currentProduct, unit: e.target.value})} placeholder="EINHEIT" className="p-4 bg-gray-50 rounded-2xl font-black uppercase" required />
                    </div>
                    <input type="number" value={currentProduct.stockQuantity || ''} onChange={e => setCurrentProduct({...currentProduct, stockQuantity: Number(e.target.value)})} placeholder="LAGERBESTAND" className="w-full p-4 bg-gray-50 rounded-2xl font-black" required />
                    <input type="text" value={currentProduct.imageUrl || ''} onChange={e => setCurrentProduct({...currentProduct, imageUrl: e.target.value})} placeholder="BILD-URL" className="w-full p-4 bg-gray-50 rounded-2xl font-black" />
                    <button type="submit" className="w-full py-5 bg-[#1a4d2e] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">Speichern</button>
                 </form>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
