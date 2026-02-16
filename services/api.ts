
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Order, StoreSettings, Customer, OrderItem } from '../types';

const getEnvVar = (key: string): string => {
  return (import.meta as any).env?.[key] || 
          (process as any).env?.[key] || 
          (window as any)?._env_?.[key] || 
          '';
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

const isSupabaseConfigured = 
  SUPABASE_URL && 
  SUPABASE_URL.startsWith('http') && 
  !SUPABASE_URL.includes('DEINE_SUPABASE_URL_HIER');

let supabase: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Supabase Init Fehler:", e);
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
  isLive: () => !!supabase,
  
  getDebugStatus: () => ({
    isConfigured: isSupabaseConfigured,
    urlSet: !!SUPABASE_URL,
    keySet: !!SUPABASE_ANON_KEY,
    urlPreview: SUPABASE_URL ? SUPABASE_URL.substring(0, 12) + '...' : 'n/a'
  }),

  async getSettings(): Promise<StoreSettings> {
    const fallback: StoreSettings = { 
      pickupDay: 'Donnerstag', pickupTime: '17:00', openDay: 'Sonntag', maxSlots: 50, 
      currentPickupDate: new Date().toISOString().split('T')[0],
      isShopOpen: true,
      nextOpeningText: 'Montag Abend'
    };
    if (!supabase) return fallback;
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data ? {
        pickupDay: data.pickup_day || fallback.pickupDay,
        pickupTime: data.pickup_time || fallback.pickupTime,
        openDay: data.open_day || fallback.openDay,
        maxSlots: data.max_slots || fallback.maxSlots,
        currentPickupDate: data.current_pickup_date || fallback.currentPickupDate,
        isShopOpen: data.is_shop_open ?? true,
        nextOpeningText: data.next_opening_text || fallback.nextOpeningText
      } : fallback;
    } catch (e) { return fallback; }
  },

  async getProducts(): Promise<Product[]> {
    if (!supabase) return JSON.parse(localStorage.getItem('eifel_gemuese_products_mock') || '[]');
    const { data, error } = await supabase.from('products').select('*').order('sort_order', { ascending: true });
    if (error) return [];
    return (data || []).map(mapProduct);
  },

  async saveProduct(p: Product) {
    if (!supabase) {
      const products = await this.getProducts();
      if (!p.id || p.id.length < 5) p.id = 'p' + Date.now();
      const idx = products.findIndex(prod => prod.id === p.id);
      if (idx > -1) products[idx] = p; else products.push(p);
      localStorage.setItem('eifel_gemuese_products_mock', JSON.stringify(products));
      return;
    }
    const payload = {
      name: p.name,
      price_per_unit: p.pricePerUnit,
      unit: p.unit,
      image_url: p.imageUrl,
      stock_quantity: p.stockQuantity,
      is_active: p.isActive,
      description: p.description,
      discount: p.discount || 0,
      is_bogo: p.isBogo || false,
      sort_order: p.sortOrder || 0
    };
    if (p.id && (p.id.includes('-') || p.id.length > 20)) (payload as any).id = p.id;
    const { error } = await supabase.from('products').upsert(payload);
    if (error) throw error;
  },

  async getOrders(): Promise<Order[]> {
    if (supabase) {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).map(mapOrder);
    }
    return JSON.parse(localStorage.getItem('eifel_gemuese_orders_mock') || '[]');
  },

  async deleteOrdersForWeek() {
    if (supabase) {
      // WICHTIG: Wir nutzen .neq auf ein Textfeld, um sicherzustellen, dass 
      // PostgREST die Anfrage als gültig akzeptiert und alle Zeilen löscht.
      const { error } = await supabase
        .from('orders')
        .delete()
        .neq('customer_name', 'NICHT_VORHANDEN_XYZ_123');
      
      if (error) {
        console.error("Löschfehler Details:", error);
        throw error;
      }
    } else {
      localStorage.setItem('eifel_gemuese_orders_mock', '[]');
    }
  },

  async submitOrder(user: Customer, items: OrderItem[], totalAmount: number, weekLabel: string): Promise<Order> {
    if (supabase) {
      const { data, error } = await supabase.from('orders').insert({
        customer_name: `${user.firstName} ${user.lastName}`,
        items: items,
        total_amount: totalAmount,
        week_label: weekLabel
      }).select().single();
      if (error) throw error;
      return mapOrder(data);
    }
    return { id: 'mock', customerName: 'test', createdAt: '', weekLabel, items, totalAmount };
  },

  async saveSettings(s: StoreSettings) {
    if (supabase) {
      const { error } = await supabase.from('settings').upsert({ 
        id: 1, pickup_day: s.pickupDay, pickup_time: s.pickupTime, open_day: s.openDay, 
        max_slots: s.maxSlots, current_pickup_date: s.currentPickupDate,
        is_shop_open: s.isShopOpen, next_opening_text: s.nextOpeningText
      });
      if (error) throw error;
    }
  },

  async togglePackedStatus(orderId: string, itemIdx: number) {
    if (supabase) {
      const { data: order } = await supabase.from('orders').select('items').eq('id', orderId).single();
      if (order && order.items) {
        const items = [...order.items];
        items[itemIdx].packed = !items[itemIdx].packed;
        await supabase.from('orders').update({ items }).eq('id', orderId);
      }
    }
  },

  async deleteProduct(id: string) {
    if (supabase) await supabase.from('products').delete().eq('id', id);
  },

  async getCurrentUser(): Promise<Customer | null> {
    const s = localStorage.getItem('eifel_gemuese_auth');
    return s ? JSON.parse(s) : null;
  },

  async login(firstName: string, lastName: string) {
    const user = { id: Date.now().toString(), firstName, lastName, registeredAt: new Date().toISOString(), status: 'active' as const };
    localStorage.setItem('eifel_gemuese_auth', JSON.stringify(user));
    return user;
  },

  async logout() { localStorage.removeItem('eifel_gemuese_auth'); },
  
  async getOrdersForUser(customerName: string, weekLabel: string): Promise<Order | null> {
    if (supabase) {
      const { data } = await supabase.from('orders').select('*').ilike('customer_name', customerName.trim()).eq('week_label', weekLabel).maybeSingle();
      return data ? mapOrder(data) : null;
    }
    return null;
  }
};

const mapProduct = (p: any): Product => ({
  id: p.id,
  name: p.name || 'Unbenannt',
  pricePerUnit: Number(p.price_per_unit ?? p.pricePerUnit ?? 0),
  unit: p.unit || 'Stück',
  imageUrl: p.image_url ?? p.imageUrl ?? '',
  stockQuantity: p.stock_quantity ?? p.stockQuantity ?? 0,
  isActive: p.is_active ?? p.isActive ?? true,
  description: p.description || '',
  discount: p.discount ?? 0,
  isBogo: p.is_bogo ?? p.isBogo ?? false,
  sortOrder: p.sort_order ?? p.sortOrder ?? 0
});

const mapOrder = (o: any): Order => ({
  id: o.id,
  customerName: o.customer_name ?? o.customerName,
  createdAt: o.created_at ?? o.createdAt,
  weekLabel: o.week_label ?? o.weekLabel,
  totalAmount: Number(o.total_amount ?? o.totalAmount ?? 0),
  items: o.items || []
});
