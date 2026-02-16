
export interface Product {
  id: string;
  name: string;
  pricePerUnit: number;
  unit: string;
  imageUrl: string;
  stockQuantity: number;
  isActive: boolean;
  description?: string;
  discount?: number; 
  isBogo?: boolean;  
  sortOrder?: number; 
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
  currentPickupDate: string;
  isShopOpen: boolean; // NEU: Shop-Status
  nextOpeningText: string; // NEU: Info-Text für Kunden
}

export type TabView = 'products' | 'orders' | 'harvest' | 'customers' | 'settings';
