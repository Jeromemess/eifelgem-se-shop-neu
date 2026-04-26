
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Order, StoreSettings, Customer, OrderItem } from '../types';

const SUPABASE_URL = 'https://rxlfmxwywnecvsxsidol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bGZteHd5d25lY3ZzeHNpZG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDQyODgsImV4cCI6MjA4NTYyMDI4OH0.F9VKlEpgxYinixy1JVjSlHS9x5bXSLE5ZPixr_RCYEk';

let supabase: SupabaseClient | null = null;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: { params: { eventsPerSecond: -1 } },
  });
  // Verbindung sofort vorwärmen — TCP+TLS Handshake passiert jetzt,
  // nicht erst wenn der Nutzer wartet
  supabase.from('settings').select('id').limit(1).then(() => {});
} catch (e) {
  console.error("Supabase Init Fehler:", e);
}

export const getWeekLabel = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `KW ${weekNo}/${d.getUTCFullYear()}`;
};

async function deductStock(sb: SupabaseClient, items: OrderItem[]) {
  await Promise.all(items.map(async item => {
    const { data: prod } = await sb.from('products').select('stock_quantity').eq('id', item.productId).single();
    if (!prod) return;
    const newQty = Math.max(0, (prod.stock_quantity ?? 0) - item.quantity);
    await sb.from('products').update({ stock_quantity: newQty }).eq('id', item.productId);
  }));
}

export const ApiService = {
  isLive: () => !!supabase,
  
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
    const { data, error } = await supabase.from('products').select('*');
    if (error) { console.error('getProducts Fehler:', error); return []; }
    return (data || []).map(mapProduct);
  },

  async saveProduct(p: Product) {
    if (!supabase) {
      const products = await this.getProducts();
      if (!p.id || p.id.length < 5) p.id = 'p' + Date.now();
      const idx = products.findIndex((prod: Product) => prod.id === p.id);
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

  async submitOrder(user: Customer, items: OrderItem[], totalAmount: number, weekLabel: string, isShipping: boolean = false): Promise<Order> {
    const baseName = `${user.firstName} ${user.lastName}`;
    const customerName = isShipping ? `${baseName} (VERSAND)` : baseName;
    
    if (supabase) {
      // Wir suchen nach Bestellungen für diesen Kunden in dieser Woche.
      // Wir suchen sowohl nach dem Namen mit als auch ohne (VERSAND) Zusatz.
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('*')
        .ilike('customer_name', `${baseName}%`)
        .eq('week_label', weekLabel);

      const existingOrder = existingOrders && existingOrders.length > 0 ? existingOrders[0] : null;

      if (existingOrder) {
        // Artikel zusammenführen — packed-Status bleibt erhalten (Admin hat ggf. schon gepackt)
        const mergedItems = [...existingOrder.items];
        items.forEach(newItem => {
          const existingItemIdx = mergedItems.findIndex(i => i.productId === newItem.productId);
          if (existingItemIdx > -1) {
            mergedItems[existingItemIdx].quantity += newItem.quantity;
          } else {
            mergedItems.push(newItem);
          }
        });

        const combinedTotal = Number(existingOrder.total_amount) + totalAmount;

        const { data, error } = await supabase
          .from('orders')
          .update({ items: mergedItems, total_amount: combinedTotal, customer_name: customerName })
          .eq('id', existingOrder.id)
          .select()
          .single();
        if (error) throw error;

        // Bestand für neu hinzugefügte Artikel reduzieren
        await deductStock(supabase, items);

        return mapOrder(data);
      } else {
        // Neue Bestellung anlegen
        const { data, error } = await supabase.from('orders').insert({
          customer_name: customerName,
          items: items,
          total_amount: totalAmount,
          week_label: weekLabel
        }).select().single();
        if (error) throw error;

        // Bestand reduzieren
        await deductStock(supabase, items);

        return mapOrder(data);
      }
    }

    // Mock implementation (Lokal)
    const orders = JSON.parse(localStorage.getItem('eifel_gemuese_orders_mock') || '[]');
    const existingIdx = orders.findIndex((o: any) => o.customerName.startsWith(baseName) && o.weekLabel === weekLabel);
    
    if (existingIdx > -1) {
      const existing = orders[existingIdx];
      const mergedItems = [...existing.items];
      items.forEach(newItem => {
        const existingItemIdx = mergedItems.findIndex(i => i.productId === newItem.productId);
        if (existingItemIdx > -1) {
          mergedItems[existingItemIdx].quantity += newItem.quantity;
          // packed-Status erhalten
        } else {
          mergedItems.push(newItem);
        }
      });
      const combinedTotal = Number(existing.totalAmount) + totalAmount;
      orders[existingIdx] = { ...existing, items: mergedItems, totalAmount: combinedTotal, customerName };
      localStorage.setItem('eifel_gemuese_orders_mock', JSON.stringify(orders));

      // Bestand für neu hinzugefügte Artikel reduzieren
      const products = JSON.parse(localStorage.getItem('eifel_gemuese_products_mock') || '[]');
      items.forEach((item: OrderItem) => {
        const idx = products.findIndex((p: Product) => p.id === item.productId);
        if (idx > -1) products[idx].stockQuantity = Math.max(0, (products[idx].stockQuantity ?? 0) - item.quantity);
      });
      localStorage.setItem('eifel_gemuese_products_mock', JSON.stringify(products));

      return orders[existingIdx];
    }

    const newOrder = {
      id: 'mock-' + Date.now(),
      customerName,
      createdAt: new Date().toISOString(),
      weekLabel,
      items,
      totalAmount
    };
    orders.push(newOrder);
    localStorage.setItem('eifel_gemuese_orders_mock', JSON.stringify(orders));

    // Bestand im Mock-Modus reduzieren
    const products = JSON.parse(localStorage.getItem('eifel_gemuese_products_mock') || '[]');
    items.forEach((item: OrderItem) => {
      const idx = products.findIndex((p: Product) => p.id === item.productId);
      if (idx > -1) products[idx].stockQuantity = Math.max(0, (products[idx].stockQuantity ?? 0) - item.quantity);
    });
    localStorage.setItem('eifel_gemuese_products_mock', JSON.stringify(products));

    return newOrder;
  },

  async saveSettings(s: StoreSettings) {
    if (supabase) {
      const payload = {
        id: 1, pickup_day: s.pickupDay, pickup_time: s.pickupTime, open_day: s.openDay,
        max_slots: s.maxSlots, current_pickup_date: s.currentPickupDate,
        is_shop_open: s.isShopOpen, next_opening_text: s.nextOpeningText
      };
      // Try update first; if no row exists yet, insert
      const { data: updated, error: updateErr } = await supabase
        .from('settings').update(payload).eq('id', 1).select();
      if (updateErr) throw updateErr;
      if (!updated || updated.length === 0) {
        const { error: insertErr } = await supabase.from('settings').insert(payload);
        if (insertErr) throw insertErr;
      }
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

  async deleteOrder(orderId: string) {
    if (supabase) await supabase.from('orders').delete().eq('id', orderId);
  },

  async deleteItemFromOrder(orderId: string, itemIdx: number) {
    if (!supabase) return;
    const { data: order } = await supabase.from('orders').select('items, total_amount').eq('id', orderId).single();
    if (!order) return;
    const items = [...order.items];
    const removed = items.splice(itemIdx, 1)[0];
    const newTotal = Math.max(0, Number(order.total_amount) - (removed.priceAtOrder * removed.quantity));
    if (items.length === 0) {
      await supabase.from('orders').delete().eq('id', orderId);
    } else {
      await supabase.from('orders').update({ items, total_amount: newTotal }).eq('id', orderId);
    }
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
      const { data } = await supabase.from('orders').select('*').ilike('customer_name', `${customerName.trim()}%`).eq('week_label', weekLabel).maybeSingle();
      return data ? mapOrder(data) : null;
    }
    // Mock-Modus: aus localStorage laden
    const orders: Order[] = JSON.parse(localStorage.getItem('eifel_gemuese_orders_mock') || '[]');
    const found = orders.find(o => o.customerName.startsWith(customerName.trim()) && o.weekLabel === weekLabel);
    return found || null;
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
  items: o.items || [],
  isShipping: (o.customer_name ?? o.customerName ?? '').includes('(VERSAND)'),
  shippingCost: 0
});
