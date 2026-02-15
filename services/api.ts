import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Order, StoreSettings, Customer, OrderItem } from '../types';

const getEnvVar = (key: string): string => {
  return (import.meta as any).env?.[key] || '';
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

const isValidConfig = SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;

let supabase: SupabaseClient | null = null;
if (isValidConfig) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Supabase Offline-Modus");
  }
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Dicke Dinger (Kartoffeln)',
    pricePerUnit: 4.50,
    unit: '5kg Sack',
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500',
    stockQuantity: 12,
    isActive: true,
    description: 'Beste Eifeler Knollen. Halten ewig, schmecken immer.',
    discount: 0
  },
  {
    id: 'p2',
    name: 'Knack-Möhren',
    pricePerUnit: 2.20,
    unit: 'Bund',
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=500',
    stockQuantity: 25,
    isActive: true,
    description: 'So orange, dass man eine Sonnenbrille braucht.',
    discount: 10
  },
  {
    id: 'p3',
    name: 'Acker-Salat',
    pricePerUnit: 1.80,
    unit: 'Kopf',
    imageUrl: 'https://images.unsplash.com/photo-1556801712-76c82666701d?w=500',
    stockQuantity: 8,
    isActive: true,
    description: 'Frischer geht nur, wenn man ihn selbst ausbuddelt.',
    isBogo: true
  }
];

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
      pickupDay: 'Mittwoch', pickupTime: '17:00', openDay: 'Sonntag', maxSlots: 50, currentPickupDate: new Date().toISOString() 
    };
    if (!supabase) return fallback;
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    return data ? {
      pickupDay: data.pickup_day,
      pickupTime: data.pickup_time,
      openDay: data.open_day,
      maxSlots: data.max_slots,
      currentPickupDate: data.current_pickup_date
    } : fallback;
  },

  async getProducts(): Promise<Product[]> {
    if (!supabase) return MOCK_PRODUCTS;
    const { data } = await supabase.from('products').select('*').order('name');
    return (data || []).map(mapProduct);
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
    return orders.find(o => o.customerName === customerName && o.weekLabel === weekLabel) || null;
  },

  async submitOrder(customer: Customer, newItems: OrderItem[], totalAmount: number, week: string) {
    const fullName = `${customer.firstName} ${customer.lastName}`;
    const ordersStr = localStorage.getItem('eifel_gemuese_orders_mock');
    let orders: Order[] = ordersStr ? JSON.parse(ordersStr) : [];
    
    const existingOrderIndex = orders.findIndex(o => o.customerName === fullName && o.weekLabel === week);
    
    let finalOrder: Order;
    if (existingOrderIndex > -1) {
      // Bestehende Bestellung erweitern
      const existingOrder = orders[existingOrderIndex];
      // Wir führen die Items zusammen (Einfachheit halber hängen wir sie an oder summieren Mengen)
      const mergedItems = [...existingOrder.items];
      newItems.forEach(newItem => {
        const found = mergedItems.find(m => m.productId === newItem.productId);
        if (found) found.quantity += newItem.quantity;
        else mergedItems.push(newItem);
      });
      
      finalOrder = {
        ...existingOrder,
        items: mergedItems,
        totalAmount: totalAmount // Der vom Frontend berechnete Gesamtbetrag
      };
      orders[existingOrderIndex] = finalOrder;
    } else {
      finalOrder = {
        id: Math.random().toString(36).substr(2, 9),
        customerName: fullName,
        createdAt: new Date().toISOString(),
        weekLabel: week,
        items: newItems,
        totalAmount: totalAmount
      };
      orders.push(finalOrder);
    }
    
    localStorage.setItem('eifel_gemuese_orders_mock', JSON.stringify(orders));
    return finalOrder;
  },
  
  async getHarvestedStatus(): Promise<string[]> { return []; },
  async toggleHarvested(name: string) {},
  async togglePackedStatus(id: string, idx: number) {},
  async saveProduct(p: Product) {},
  async getOrders(): Promise<Order[]> { return []; },
  async saveSettings(s: StoreSettings) {},
  async clearAllOrders() {
    localStorage.removeItem('eifel_gemuese_orders_mock');
  }
};
