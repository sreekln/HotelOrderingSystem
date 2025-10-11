export interface User {
  id: string;
  email: string;
  role: 'server' | 'kitchen' | 'admin';
  full_name: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'appetizer' | 'main' | 'dessert' | 'beverage';
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
  payment_status: 'pending' | 'paid' | 'failed';
  special_instructions?: string;
  table_number?: number;
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

// Helper function to calculate tax
export const calculateTax = (subtotal: number, taxRate: number): number => {
  return Math.round(subtotal * taxRate * 100) / 100;
};

// Helper function to calculate total with tax
export const calculateTotal = (subtotal: number, taxRate: number): number => {
  return subtotal + calculateTax(subtotal, taxRate / 100);
};

// Helper function to calculate tax for cart items with individual tax rates
export const calculateCartTax = (cartItems: { item: MenuItem; quantity: number }[]): number => {
  return cartItems.reduce((totalTax, cartItem) => {
    const itemSubtotal = cartItem.item.price * cartItem.quantity;
    const itemTax = calculateTax(itemSubtotal, cartItem.item.tax_rate / 100);
    return totalTax + itemTax;
  }, 0);
};

// Helper function to calculate total for cart items with individual tax rates
export const calculateCartTotal = (cartItems: { item: MenuItem; quantity: number }[]): { subtotal: number; tax: number; total: number } => {
  const subtotal = cartItems.reduce((sum, cartItem) => sum + (cartItem.item.price * cartItem.quantity), 0);
  const tax = calculateCartTax(cartItems);
  const total = subtotal + tax;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};