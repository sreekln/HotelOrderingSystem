import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'server' | 'kitchen' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'daytime' | 'dinner' | 'dessert' | 'coffeetea' | 'drinks';
  company: string;
  tax_rate: number;
  food_category: 'Raw' | 'Cooked';
  image_url?: string;
  available: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  payment_status: 'paid' | 'cash';
  special_instructions?: string;
  table_number?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  menu_item?: MenuItem;
}