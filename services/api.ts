
import { createClient } from '@supabase/supabase-js';
import { Product, Order, StoreSettings, Customer, OrderItem } from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = SUPABASE_URL.length > 10 && SUPABASE_ANON_KEY.length > 10;
const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const STORAGE_KEYS = {
  CURRENT_USER: 'eifel_gemuese_auth',
  HARVESTED: 'eifel_gemuese_harvested'
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
  isBogo: p.is_bogo ?? false
});

const mapOrder = (o: any): Order => ({
  id: o.id,
  customerName: o.customer_name,
  createdAt: o.created_at,
  weekLabel: o.week_label,
  items: Array.isArray(o.items) ? o.items : [],
  totalAmount: Number(o.total_amount)
});

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
    if (!isConfigured) return { isOpen: true };
    try {
      const settings = await this.getSettings();
      const now = new Date();
      const currentDay = now.getDay();
      const openDayIdx = DAY_MAP[settings.openDay] ?? 0;
      const pickupDayIdx = DAY_MAP[settings.pickupDay] ?? 3;
      const isOpen = openDayIdx <= pickupDayIdx 
        ? (currentDay >= openDayIdx && currentDay <= pickupDayIdx)
        : (currentDay >= openDayIdx || currentDay <= pickupDayIdx);
      return { isOpen, nextOpen: settings.openDay };
    } catch (e) {
      return { isOpen: true };
    }
  },

  async getCurrentUser(): Promise<Customer | null> {
    const s = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return s ? JSON.parse(s) : null;
  },

  async logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  async login(firstName: string, lastName: string) {
    if (!supabase) throw new Error("Supabase nicht konfiguriert!");
    const { data: existing } = await supabase.from('customers').select('*').ilike('first_name', firstName).ilike('last_name', lastName);
    let customer: Customer;
    if (existing && existing.length > 0) {
      customer = {
        id: existing[0].id,
        firstName: existing[0].first_name,
        lastName: existing[0].last_name,
        registeredAt: existing[0].registered_at,
        status: 'active'
      };
    } else {
      const { data: neu, error } = await supabase.from('customers').insert([{ first_name: firstName, last_name: lastName }]).select().single();
      if (error) throw error;
      customer = {
        id: neu.id,
        firstName: neu.first_name,
        lastName: neu.last_name,
        registeredAt: neu.registered_at,
        status: 'active'
      };
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(customer));
    return customer;
  },

  async getProducts(): Promise<Product[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) return [];
    return (data || []).map(mapProduct);
  },

  async saveProduct(p: Product) {
    if (!supabase) throw new Error("Keine DB-Verbindung");
    const dbProduct: any = {
      name: p.name,
      price_per_unit: Number(p.pricePerUnit),
      unit: p.unit,
      image_url: p.imageUrl,
      stock_quantity: Number(p.stockQuantity),
      is_active: p.isActive,
      description: p.description,
      discount: Number(p.discount || 0),
      is_bogo: !!p.isBogo
    };
    if (p.id && p.id.length > 10) { dbProduct.id = p.id; }
    const { error } = await supabase.from('products').upsert(dbProduct);
    if (error) throw error;
  },

  async getOrders(): Promise<Order[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(mapOrder);
  },

  async getOrdersForUser(customerName: string, weekLabel: string): Promise<Order | null> {
    if (!supabase) return null;
    const { data } = await supabase.from('orders')
      .select('*')
      .eq('customer_name', customerName)
      .eq('week_label', weekLabel)
      .maybeSingle();
    return data ? mapOrder(data) : null;
  },

  async clearAllOrders() {
    if (!supabase) return;
    const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  },

  async submitOrder(customer: Customer, items: OrderItem[], total: number, week: string) {
    if (!supabase) throw new Error("Keine Verbindung");
    const settings = await this.getSettings();
    const finalWeek = settings.currentPickupDate ? getWeekLabel(new Date(settings.currentPickupDate)) : week;
    const customerFullName = `${customer.firstName} ${customer.lastName}`;

    const existingOrder = await this.getOrdersForUser(customerFullName, finalWeek);

    let resultOrder: Order;
    if (existingOrder) {
      // Zusammenführen der Items
      const mergedItems = [...existingOrder.items];
      items.forEach(newItem => {
        const existingItem = mergedItems.find(mi => mi.productId === newItem.productId);
        if (existingItem) {
          existingItem.quantity += newItem.quantity;
          // Preis anpassen falls sich was geändert hat (Gewichtung)
          existingItem.priceAtOrder = newItem.priceAtOrder;
        } else {
          mergedItems.push(newItem);
        }
      });

      const { data, error } = await supabase.from('orders')
        .update({
          items: mergedItems,
          total_amount: existingOrder.totalAmount + total
        })
        .eq('id', existingOrder.id)
        .select()
        .single();
      
      if (error) throw error;
      resultOrder = mapOrder(data);
    } else {
      const { data, error } = await supabase.from('orders').insert([{
        customer_name: customerFullName,
        week_label: finalWeek,
        items: items,
        total_amount: total
      }]).select().single();
      
      if (error) throw error;
      resultOrder = mapOrder(data);
    }

    // Bestand abziehen
    for (const item of items) {
      const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.productId).single();
      if (prod) {
        const newQty = Math.max(0, Number(prod.stock_quantity) - item.quantity);
        await supabase.from('products').update({ stock_quantity: newQty }).eq('id', item.productId);
      }
    }
    return resultOrder;
  },

  async getSettings(): Promise<StoreSettings> {
    const fallback: StoreSettings = { pickupDay: 'Mittwoch', pickupTime: '17:00', openDay: 'Sonntag', maxSlots: 50, currentPickupDate: '' };
    if (!supabase) return fallback;
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    if (!data) return fallback;
    return {
      pickupDay: data.pickup_day || 'Mittwoch',
      pickupTime: data.pickup_time || '17:00',
      openDay: data.open_day || 'Sonntag',
      maxSlots: data.max_slots || 50,
      currentPickupDate: data.current_pickup_date || ''
    };
  },

  async saveSettings(s: StoreSettings) {
    if (!supabase) return;
    const dbSettings = {
      id: 1,
      pickup_day: s.pickupDay,
      pickup_time: s.pickupTime,
      open_day: s.openDay,
      max_slots: s.maxSlots,
      current_pickup_date: s.currentPickupDate
    };
    await supabase.from('settings').upsert(dbSettings);
  },

  async getHarvestedStatus(): Promise<string[]> {
    const s = localStorage.getItem(STORAGE_KEYS.HARVESTED);
    return s ? JSON.parse(s) : [];
  },

  async toggleHarvested(name: string) {
    const h = await this.getHarvestedStatus();
    const i = h.indexOf(name);
    if (i > -1) h.splice(i, 1); else h.push(name);
    localStorage.setItem(STORAGE_KEYS.HARVESTED, JSON.stringify(h));
  },

  async togglePackedStatus(id: string, idx: number) {
    if (!supabase) return;
    const { data } = await supabase.from('orders').select('items').eq('id', id).single();
    if (data && Array.isArray(data.items)) {
      const items = [...data.items];
      if (items[idx]) {
        items[idx].packed = !items[idx].packed;
        await supabase.from('orders').update({ items }).eq('id', id);
      }
    }
  }
};
