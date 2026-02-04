
export interface Product {
  id: string;
  name: string;
  pricePerUnit: number;
  unit: string;
  imageUrl: string;
  stockQuantity: number;
  isActive: boolean;
  description?: string;
  discount?: number; // Prozentsatz, z.B. 20 für 20%
  isBogo?: boolean;  // Buy One Get One (1+1 Gratis)
}

export interface OrderItem {
  productId: string;
  quantity: number;
  productName: string;
  priceAtOrder: number;
  packed?: boolean;
}

export interface Order {
  id: string;
  customerName: string; 
  createdAt: string;
  weekLabel: string;
  items: OrderItem[];
  totalAmount: number;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  registeredAt: string;
  status: 'active' | 'waitlist';
}

export interface StoreSettings {
  pickupDay: string; 
  pickupTime: string; 
  openDay: string; 
  maxSlots: number;
  currentPickupDate: string; // Das konkret eingestellte Datum für die nächste Abholung
}

export type TabView = 'products' | 'orders' | 'harvest' | 'customers' | 'settings';
