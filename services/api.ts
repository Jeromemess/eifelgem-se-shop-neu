
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Order, StoreSettings, Customer, OrderItem } from '../types';

const getEnvVar = (key: string): string => {
  return (import.meta as any).env?.[key] || '';
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

const isValidConfig = 
  SUPABASE_URL && 
  SUPABASE_URL.startsWith('http') && 
  !SUPABASE_URL.includes('DEINE_SUPABASE_URL_HIER') &&
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY.length > 20;

let supabase: SupabaseClient | null = null;
if (isValidConfig) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Supabase Init Error:", e);
  }
}

export const getWeekLabel = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `KW ${weekNo}/${d.getUTCFullYear()}`;
};

export const ApiService = {
  async getSettings(): Promise<StoreSettings> {
    const fallback: StoreSettings = { 
      pickupDay: 'Donnerstag', pickupTime: '17:00', openDay: 'Sonntag', maxSlots: 50, currentPickupDate: new Date().toISOString().split('T')[0]
    };
    if (!supabase) return fallback;
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      return data ? {
        pickupDay: data.pickup_day,
        pickupTime: data.pickup_time,
        openDay: data.open_day,
        maxSlots: data.max_slots,
        currentPickupDate: data.current_pickup_date
      } : fallback;
    } catch { return fallback; }
  },

  async getProducts(): Promise<Product[]> {
    if (!supabase) {
      const stored = localStorage.getItem('eifel_gemuese_products_mock');
      let products: Product[] = stored ? JSON.parse(stored) : [];
      return products.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    
    // Versuche mit Sortierung zu laden
    const { data, error } = await supabase.from('products').select('*').order('sort_order', { ascending: true });
    
    if (error) {
      // Falls sort_order fehlt, lade einfach alles ohne Sortierung
      const { data: fallbackData } = await supabase.from('products').select('*');
      return (fallbackData || []).map(mapProduct);
    }
    return (data || []).map(mapProduct);
  },

  async saveProduct(p: Product) {
    if (!supabase) {
      const products = await this.getProducts();
      const idx = products.findIndex(prod => prod.id === p.id);
      if (idx > -1) products[idx] = p; else products.push(p);
      localStorage.setItem('eifel_gemuese_products_mock', JSON.stringify(products));
      return;
    }

    // Vollständiger Payload
    const fullPayload = {
      id: p.id,
      name: p.name,
      price_per_unit: p.pricePerUnit,
      unit: p.unit,
      image_url: p.imageUrl,
      stock_quantity: p.stockQuantity,
      is_active: p.isActive,
      description: p.description,
      discount: p.discount,
      is_bogo: p.isBogo,
      sort_order: p.sortOrder
    };

    const { error } = await supabase.from('products').upsert(fullPayload);

    if (error && error.message.includes('column')) {
      console.warn("Datenbank veraltet. Speichere Basis-Daten ohne neue Felder.");
      // Sicherheits-Payload (nur Felder die sicher existieren)
      const safePayload = {
        id: p.id,
        name: p.name,
        price_per_unit: p.pricePerUnit,
        unit: p.unit,
        image_url: p.imageUrl,
        stock_quantity: p.stockQuantity,
        is_active: p.isActive,
        description: p.description
      };
      const { error: retryError } = await supabase.from('products').upsert(safePayload);
      if (retryError) throw retryError;
    } else if (error) {
      throw error;
    }
  },

  async updateAllProducts(products: Product[]) {
    if (!supabase) {
      localStorage.setItem('eifel_gemuese_products_mock', JSON.stringify(products));
      return;
    }
    
    const payloads = products.map(p => ({
      id: p.id,
      name: p.name,
      price_per_unit: p.pricePerUnit,
      unit: p.unit,
      image_url: p.imageUrl,
      stock_quantity: p.stockQuantity,
      is_active: p.isActive,
      description: p.description,
      discount: p.discount,
      is_bogo: p.isBogo,
      sort_order: p.sortOrder
    }));

    const { error } = await supabase.from('products').upsert(payloads);
    
    // Wenn Sortierung in DB fehlt, können wir hier nichts tun außer zu warnen
    if (error && error.message.includes('column')) {
      console.error("Sortierung kann nicht gespeichert werden, da Spalten in Supabase fehlen.");
    }
  },

  async getCurrentUser(): Promise<Customer | null> {
    const s = localStorage.getItem('eifel_gemuese_auth');
    return s ? JSON.parse(s) : null;
  },

  async login(firstName: string, lastName: string) {
    const user = { id: firstName.toLowerCase() + '-' + lastName.toLowerCase(), firstName, lastName, registeredAt: new Date().toISOString(), status: 'active' as const };
    localStorage.setItem('eifel_gemuese_auth', JSON.stringify(user));
    return user;
  },

  async logout() {
    localStorage.removeItem('eifel_gemuese_auth');
  },

  async getOrdersForUser(customerName: string, weekLabel: string): Promise<Order | null> {
    const ordersStr = localStorage.getItem('eifel_gemuese_orders_mock');
    if (!ordersStr) return null;
    const orders: Order[] = JSON.parse(ordersStr);
    return orders.find(o => o.customerName.toLowerCase().trim() === customerName.toLowerCase().trim() && o.weekLabel === weekLabel) || null;
  },

  async submitOrder(customer: Customer, newItems: OrderItem[], totalAmount: number, week: string) {
    const fullName = `${customer.firstName} ${customer.lastName}`;
    const ordersStr = localStorage.getItem('eifel_gemuese_orders_mock');
    let orders: Order[] = ordersStr ? JSON.parse(ordersStr) : [];
    const existingIdx = orders.findIndex(o => o.customerName.toLowerCase().trim() === fullName.toLowerCase().trim() && o.weekLabel === week);
    
    let finalOrder: Order;
    if (existingIdx > -1) {
      const mergedItems = [...orders[existingIdx].items];
      newItems.forEach(n => {
        const found = mergedItems.find(m => m.productId === n.productId);
        if (found) found.quantity += n.quantity; else mergedItems.push(n);
      });
      finalOrder = { ...orders[existingIdx], items: mergedItems, totalAmount };
      orders[existingIdx] = finalOrder;
    } else {
      finalOrder = { id: Math.random().toString(36).substr(2, 9), customerName: fullName, createdAt: new Date().toISOString(), weekLabel: week, items: newItems, totalAmount };
      orders.push(finalOrder);
    }
    localStorage.setItem('eifel_gemuese_orders_mock', JSON.stringify(orders));
    return finalOrder;
  },

  async getOrders(): Promise<Order[]> {
    const s = localStorage.getItem('eifel_gemuese_orders_mock');
    return s ? JSON.parse(s) : [];
  },

  async saveSettings(s: StoreSettings) {
    if (supabase) {
      await supabase.from('settings').upsert({ id: 1, pickup_day: s.pickupDay, pickup_time: s.pickupTime, open_day: s.openDay, max_slots: s.maxSlots, current_pickup_date: s.currentPickupDate });
    } else {
      localStorage.setItem('eifel_gemuese_settings_mock', JSON.stringify(s));
    }
  },

  async clearAllOrders() {
    localStorage.removeItem('eifel_gemuese_orders_mock');
  },

  async getHarvestedStatus(): Promise<string[]> {
    const s = localStorage.getItem('eifel_gemuese_harvested_mock');
    return s ? JSON.parse(s) : [];
  },

  async toggleHarvested(name: string) {
    const current = await this.getHarvestedStatus();
    const next = current.includes(name) ? current.filter(n => n !== name) : [...current, name];
    localStorage.setItem('eifel_gemuese_harvested_mock', JSON.stringify(next));
  },

  async togglePackedStatus(orderId: string, itemIdx: number) {
    const s = localStorage.getItem('eifel_gemuese_orders_mock');
    if (!s) return;
    let orders: Order[] = JSON.parse(s);
    const oIdx = orders.findIndex(o => o.id === orderId);
    if (oIdx > -1) {
      orders[oIdx].items[itemIdx].packed = !orders[oIdx].items[itemIdx].packed;
      localStorage.setItem('eifel_gemuese_orders_mock', JSON.stringify(orders));
    }
  }
};

const mapProduct = (p: any): Product => ({
  id: p.id,
  name: p.name || 'Unbekannt',
  pricePerUnit: p.price_per_unit ? Number(p.price_per_unit) : 0,
  unit: p.unit || 'Stück',
  imageUrl: p.image_url || 'https://images.unsplash.com/photo-1566385908041-9c9ca335606d?w=400',
  stockQuantity: p.stock_quantity !== undefined ? Number(p.stock_quantity) : 0,
  isActive: p.is_active ?? true,
  description: p.description || '',
  discount: p.discount ? Number(p.discount) : 0,
  isBogo: p.is_bogo ?? false,
  sortOrder: p.sort_order ?? 0
});
