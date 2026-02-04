
import { createClient } from '@supabase/supabase-js';
import { Product, Order, StoreSettings, Customer, OrderItem } from '../types';

// Platzhalter für Netlify Environment Variables
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'DEINE_SUPABASE_URL'; 
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'DEIN_SUPABASE_ANON_KEY';

const isConfigured = SUPABASE_URL !== 'DEINE_SUPABASE_URL' && SUPABASE_URL.startsWith('http');

let supabase: any = null;
if (isConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Supabase Init Error:", e);
  }
}

const STORAGE_KEYS = {
  PRODUCTS: 'eifel_gemuese_products',
  ORDERS: 'eifel_gemuese_orders',
  SETTINGS: 'eifel_gemuese_settings',
  CUSTOMERS: 'eifel_gemuese_customers',
  CURRENT_USER: 'eifel_gemuese_auth',
  HARVESTED: 'eifel_gemuese_harvested'
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Möhren', pricePerUnit: 2.2, unit: 'Bund', imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400', stockQuantity: 20, isActive: true, description: 'Knackig & Süß direkt vom Feld.' },
  { id: 'p2', name: 'Kartoffeln', pricePerUnit: 4.5, unit: 'kg', imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f02bad675?w=400', stockQuantity: 50, isActive: true, description: 'Festkochende Sorte aus der Eifel.' },
  { id: 'p3', name: 'Gurken', pricePerUnit: 1.5, unit: 'Stück', imageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d02d?w=400', stockQuantity: 15, isActive: true, description: 'Frische Landgurken.' }
];

const getLocal = <T>(key: string, def: T): T => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : def;
  } catch { return def; }
};
const setLocal = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));

export const getWeekLabel = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `KW ${weekNo}/${d.getUTCFullYear()}`;
};

const DAY_MAP: Record<string, number> = { 'Sonntag': 0, 'Montag': 1, 'Dienstag': 2, 'Mittwoch': 3, 'Donnerstag': 4, 'Freitag': 5, 'Samstag': 6 };

export const ApiService = {
  async isShopOpen() {
    try {
      const settings = await this.getSettings();
      const now = new Date();
      const currentDay = now.getDay();
      const openDayIdx = DAY_MAP[settings.openDay] ?? 0;
      const pickupDayIdx = DAY_MAP[settings.pickupDay] ?? 3;

      if (currentDay === pickupDayIdx) {
        const [h, m] = settings.pickupTime.split(':').map(Number);
        const pTime = new Date();
        pTime.setHours(h, m, 0, 0);
        if (now >= pTime) return { isOpen: false, nextOpen: settings.openDay };
      }
      const isOpen = openDayIdx <= pickupDayIdx 
        ? (currentDay >= openDayIdx && currentDay <= pickupDayIdx)
        : (currentDay >= openDayIdx || currentDay <= pickupDayIdx);
      return { isOpen, nextOpen: settings.openDay };
    } catch (e) {
      return { isOpen: true };
    }
  },

  async getCurrentUser() { return getLocal<Customer | null>(STORAGE_KEYS.CURRENT_USER, null); },
  
  async logout() { localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); },

  async login(firstName: string, lastName: string) {
    let customer: Customer;
    if (isConfigured && supabase) {
      const { data } = await supabase.from('customers').select('*').ilike('firstName', firstName).ilike('lastName', lastName);
      if (data && data.length > 0) {
        customer = data[0];
      } else {
        const { data: neu, error } = await supabase.from('customers').insert([{ firstName, lastName, registeredAt: new Date().toISOString(), status: 'active' }]).select().single();
        if (error) throw error;
        customer = neu;
      }
    } else {
      const customers = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
      let found = customers.find(c => c.firstName.toLowerCase() === firstName.toLowerCase() && c.lastName.toLowerCase() === lastName.toLowerCase());
      if (!found) {
        found = { id: Math.random().toString(36).substr(2, 9), firstName, lastName, registeredAt: new Date().toISOString(), status: 'active' };
        customers.push(found);
        setLocal(STORAGE_KEYS.CUSTOMERS, customers);
      }
      customer = found;
    }
    setLocal(STORAGE_KEYS.CURRENT_USER, customer);
    return customer;
  },

  async getProducts(): Promise<Product[]> {
    if (isConfigured && supabase) {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) return getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      if (!data || data.length === 0) return getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      return data;
    }
    return getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  },

  async saveProduct(p: Product) {
    if (isConfigured && supabase) {
      await supabase.from('products').upsert(p);
    } else {
      const products = await this.getProducts();
      const idx = products.findIndex(x => x.id === p.id);
      if (idx > -1) products[idx] = p; else products.push(p);
      setLocal(STORAGE_KEYS.PRODUCTS, products);
    }
  },

  async getOrders() {
    if (isConfigured && supabase) {
      const { data } = await supabase.from('orders').select('*').order('createdAt', { ascending: false });
      return data || [];
    }
    return getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  },

  async submitOrder(customer: Customer, items: OrderItem[], total: number, week: string) {
    const settings = await this.getSettings();
    const finalWeek = settings.currentPickupDate ? getWeekLabel(new Date(settings.currentPickupDate)) : week;
    const name = `${customer.firstName} ${customer.lastName}`;
    
    if (isConfigured && supabase) {
      const { data: existing } = await supabase.from('orders').select('*').eq('customerName', name).eq('weekLabel', finalWeek);
      if (existing && existing.length > 0) {
        const order = existing[0];
        items.forEach(newItem => {
          const found = order.items.find((i: any) => i.productId === newItem.productId);
          if (found) { found.quantity += newItem.quantity; found.packed = false; }
          else { order.items.push(newItem); }
        });
        const { data, error } = await supabase.from('orders').update({ items: order.items, totalAmount: order.totalAmount + total, createdAt: new Date().toISOString() }).eq('id', order.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from('orders').insert([{ customerName: name, createdAt: new Date().toISOString(), weekLabel: finalWeek, items, totalAmount: total }]).select().single();
        if (error) throw error;
        return data;
      }
    } else {
      const orders = await this.getOrders();
      const newOrder = { id: Math.random().toString(36).substr(2, 9), customerName: name, createdAt: new Date().toISOString(), weekLabel: finalWeek, items, totalAmount: total };
      orders.push(newOrder);
      setLocal(STORAGE_KEYS.ORDERS, orders);
      return newOrder;
    }
  },

  async togglePackedStatus(id: string, idx: number) {
    if (isConfigured && supabase) {
      const { data } = await supabase.from('orders').select('items').eq('id', id).single();
      if (data) {
        const items = [...data.items];
        items[idx].packed = !items[idx].packed;
        await supabase.from('orders').update({ items }).eq('id', id);
      }
    } else {
      const orders = await this.getOrders();
      const o = orders.find(x => x.id === id);
      if (o) { o.items[idx].packed = !o.items[idx].packed; setLocal(STORAGE_KEYS.ORDERS, orders); }
    }
  },

  async getSettings(): Promise<StoreSettings> {
    const fallback = { pickupDay: 'Mittwoch', pickupTime: '17:00', openDay: 'Sonntag', maxSlots: 50, currentPickupDate: '' };
    if (isConfigured && supabase) {
      const { data } = await supabase.from('settings').select('*').single();
      return data || fallback;
    }
    return getLocal<StoreSettings>(STORAGE_KEYS.SETTINGS, fallback);
  },

  async saveSettings(s: StoreSettings) {
    if (isConfigured && supabase) {
      await supabase.from('settings').upsert({ id: 1, ...s });
    } else {
      setLocal(STORAGE_KEYS.SETTINGS, s);
    }
  },

  async getHarvestedStatus() { return getLocal<string[]>(STORAGE_KEYS.HARVESTED, []); },
  
  async toggleHarvested(name: string) {
    const h = await this.getHarvestedStatus();
    const i = h.indexOf(name);
    if (i > -1) h.splice(i, 1); else h.push(name);
    setLocal(STORAGE_KEYS.HARVESTED, h);
  }
};
