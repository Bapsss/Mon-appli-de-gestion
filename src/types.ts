export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role?: 'admin' | 'user';
}

export interface Inventory {
  userId: string;
  initialStock: number;
  currentStock: number;
  lowStockThreshold: number;
}

export interface Sale {
  id?: string;
  userId: string;
  date: string; // ISO 8601
  bagsSold: number;
  pricePerBag: number;
  total: number;
}

export interface AppState {
  profile: UserProfile | null;
  inventory: Inventory | null;
  sales: Sale[];
  loading: boolean;
  authReady: boolean;
}
