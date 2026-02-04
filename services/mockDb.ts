
import { Product, Order, OrderItem, StoreSettings } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'eifel_gemuese_products',
  ORDERS: 'eifel_gemuese_orders',
  SETTINGS: 'eifel_gemuese_settings',
};

// Helfer für die Kalenderwoche
export const getWeekLabel = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `KW ${weekNo}/${d.getUTCFullYear()}`;
};

// Die gewünschten Start-Produkte
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Möhren',
    pricePerUnit: 2.20,
    unit: 'Bund',
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=400',
    stockQuantity: 25,
    isActive: true,
    description: 'Frisch gebündelt mit viel Grün. Süß und knackig.',
    discount: 0,
    isBogo: false
  },
  {
    id: 'p2',
    name: 'Tomaten',
    pricePerUnit: 3.80,
    unit: 'kg',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400',
    stockQuantity: 15,
    isActive: true,
    description: 'Sonnengereifte Strauchtomaten mit intensivem Aroma.',
    discount: 0,
    isBogo: false
  },
  {
    id: 'p3',
    name: 'Gurke',
    pricePerUnit: 1.50,
    unit: 'Stück',
    imageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d02d?auto=format&fit=crop&q=80&w=400',
    stockQuantity: 20,
    isActive: true,
    description: 'Frische Landgurken, perfekt für Salat.',
    discount: 0,
    isBogo: false
  }
];

// Fixed error: Removed undefined whatsappNumber property from INITIAL_SETTINGS
const INITIAL_SETTINGS: StoreSettings = {
  pickupDay: 'Mittwoch',
  pickupTime: '17:00',
  openDay: 'Sonntag',
  maxSlots: 50,
  currentPickupDate: new Date().toISOString().split('T')[0]
};

export const MockDB = {
  getProducts: (): Product[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(stored);
  },

  saveProduct: (product: Product): void => {
    const products = MockDB.getProducts();
    const existingIndex = products.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
      products[existingIndex] = product;
    } else {
      products.push(product);
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  deleteProduct: (id: string): void => {
    const products = MockDB.getProducts();
    const updated = products.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
  },

  getOrders: (): Order[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return stored ? JSON.parse(stored) : [];
  },

  submitOrder: async (customerName: string, items: { productId: string; quantity: number }[]): Promise<Order> => {
    await new Promise(resolve => setTimeout(resolve, 600));

    const products = MockDB.getProducts();
    const orders = MockDB.getOrders();
    const settings = MockDB.getSettings();
    const orderItems: OrderItem[] = [];
    let totalAmount = 0;

    // Bestandsprüfung
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Produkt nicht gefunden: ${item.productId}`);
      if (product.stockQuantity < item.quantity) {
        throw new Error(`Nicht genug Bestand für: ${product.name}`);
      }
    }

    // Bestand reduzieren & OrderItem erstellen
    for (const item of items) {
      const productIndex = products.findIndex(p => p.id === item.productId);
      const product = products[productIndex];
      products[productIndex].stockQuantity -= item.quantity;
      
      const lineTotal = product.pricePerUnit * item.quantity;
      totalAmount += lineTotal;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        productName: product.name,
        priceAtOrder: product.pricePerUnit
      });
    }

    const finalWeekLabel = settings.currentPickupDate ? getWeekLabel(new Date(settings.currentPickupDate)) : getWeekLabel(new Date());

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      customerName,
      createdAt: new Date().toISOString(),
      weekLabel: finalWeekLabel,
      items: orderItems,
      totalAmount
    };

    orders.push(newOrder);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    return newOrder;
  },

  getSettings: (): StoreSettings => {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!stored) {
      return INITIAL_SETTINGS;
    }
    return JSON.parse(stored);
  },

  saveSettings: (settings: StoreSettings): void => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
};