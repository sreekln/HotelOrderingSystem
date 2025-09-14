// Mock data for the hotel ordering system
export interface User {
  id: string;
  email: string;
  role: 'customer' | 'kitchen' | 'admin';
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
  payment_status: 'paid' | 'cash' | 'pending';
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

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'customer-1',
    email: 'customer@hotel.com',
    role: 'customer',
    full_name: 'John Smith',
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'kitchen-1',
    email: 'kitchen@hotel.com',
    role: 'kitchen',
    full_name: 'Chef Maria',
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'admin-1',
    email: 'admin@hotel.com',
    role: 'admin',
    full_name: 'Manager David',
    created_at: '2024-01-01T10:00:00Z'
  }
];

// Mock Menu Items
export const mockMenuItems: MenuItem[] = [
  {
    id: 'menu-1',
    name: 'Caesar Salad',
    description: 'Fresh romaine lettuce with parmesan cheese, croutons, and our signature Caesar dressing',
    price: 12.99,
    category: 'appetizer',
    company: 'Fresh Garden Co.',
    tax_rate: 8.5,
    food_category: 'Raw',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-2',
    name: 'Buffalo Wings',
    description: 'Crispy chicken wings tossed in spicy buffalo sauce, served with blue cheese dip',
    price: 14.99,
    category: 'appetizer',
    company: 'Wing Masters Inc.',
    tax_rate: 8.5,
    food_category: 'Cooked',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-3',
    name: 'Truffle Arancini',
    description: 'Crispy risotto balls filled with truffle and parmesan, served with marinara sauce',
    price: 16.99,
    category: 'appetizer',
    company: 'Gourmet Delights Ltd.',
    tax_rate: 8.5,
    food_category: 'Cooked',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-4',
    name: 'Grilled Atlantic Salmon',
    description: 'Fresh salmon fillet with lemon herb seasoning, served with roasted vegetables and quinoa',
    price: 28.99,
    category: 'main',
    company: 'Ocean Fresh Seafood',
    tax_rate: 8.5,
    food_category: 'Cooked',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-5',
    name: 'Beef Tenderloin',
    description: 'Prime cut beef tenderloin cooked to perfection, served with garlic mashed potatoes',
    price: 34.99,
    category: 'main',
    company: 'Premium Meats Co.',
    tax_rate: 8.5,
    food_category: 'Cooked',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-6',
    name: 'Lobster Risotto',
    description: 'Creamy arborio rice with fresh lobster, asparagus, and white wine reduction',
    price: 32.99,
    category: 'main',
    company: 'Coastal Cuisine Ltd.',
    tax_rate: 8.5,
    food_category: 'Cooked',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-7',
    name: 'Margherita Pizza',
    description: 'Wood-fired pizza with fresh mozzarella, basil, and San Marzano tomatoes',
    price: 18.99,
    category: 'main',
    company: 'Artisan Pizza Works',
    tax_rate: 8.5,
    food_category: 'Cooked',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-8',
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with molten center, served with vanilla ice cream',
    price: 8.99,
    category: 'dessert',
    company: 'Sweet Dreams Bakery',
    tax_rate: 8.5,
    food_category: 'Cooked',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-9',
    name: 'Tiramisu',
    description: 'Traditional Italian dessert with coffee-soaked ladyfingers and mascarpone',
    price: 9.99,
    category: 'dessert',
    company: 'Italian Delicacies Inc.',
    tax_rate: 8.5,
    food_category: 'Raw',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-10',
    name: 'Crème Brûlée',
    description: 'Classic French custard with caramelized sugar crust and fresh berries',
    price: 10.99,
    category: 'dessert',
    company: 'French Pastry House',
    tax_rate: 8.5,
    food_category: 'Cooked',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-11',
    name: 'House Wine (Glass)',
    description: 'Selection of premium red or white wine from our curated collection',
    price: 8.99,
    category: 'beverage',
    company: 'Vineyard Select',
    tax_rate: 10.0,
    food_category: 'Raw',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-12',
    name: 'Craft Beer',
    description: 'Local brewery selection featuring seasonal and signature brews',
    price: 6.99,
    category: 'beverage',
    company: 'Local Brew Co.',
    tax_rate: 10.0,
    food_category: 'Raw',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-13',
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice from premium Valencia oranges',
    price: 4.99,
    category: 'beverage',
    company: 'Citrus Fresh Ltd.',
    tax_rate: 8.5,
    food_category: 'Raw',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'menu-14',
    name: 'Artisan Coffee',
    description: 'Single-origin coffee beans expertly roasted and brewed to perfection',
    price: 3.99,
    category: 'beverage',
    company: 'Roast Masters Coffee',
    tax_rate: 8.5,
    food_category: 'Cooked',
    available: true,
    created_at: '2024-01-01T10:00:00Z'
  }
];

// Tax rate for hotel restaurant orders
export const TAX_RATE = 0.085; // 8.5% (fallback rate)

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

// Mock Orders
export const mockOrders: Order[] = [
  {
    id: 'order-1',
    customer_id: 'customer-1',
    subtotal: 43.98,
    tax_amount: 5.30,
    total_amount: 49.28,
    status: 'preparing',
    payment_status: 'paid',
    special_instructions: 'Medium rare steak, no onions',
    table_number: 12,
    created_at: '2024-01-05T18:30:00Z',
    updated_at: '2024-01-05T18:45:00Z'
  },
  {
    id: 'order-2',
    customer_id: 'customer-1',
    subtotal: 23.98,
    tax_amount: 1.29,
    total_amount: 25.27,
    status: 'ready',
    payment_status: 'paid',
    table_number: 8,
    created_at: '2024-01-05T19:15:00Z',
    updated_at: '2024-01-05T19:30:00Z'
  },
  {
    id: 'order-3',
    customer_id: 'customer-1',
    subtotal: 68.97,
    tax_amount: 7.71,
    total_amount: 76.68,
    status: 'confirmed',
    payment_status: 'paid',
    special_instructions: 'Allergic to shellfish',
    table_number: 5,
    created_at: '2024-01-05T20:00:00Z',
    updated_at: '2024-01-05T20:05:00Z'
  },
  {
    id: 'order-4',
    customer_id: 'customer-1',
    subtotal: 85.90,
    tax_amount: 8.95,
    total_amount: 94.85,
    status: 'delivered',
    payment_status: 'cash',
    table_number: 15,
    created_at: '2024-01-04T19:30:00Z',
    updated_at: '2024-01-04T20:15:00Z'
  },
  {
    id: 'order-5',
    customer_id: 'customer-1',
    subtotal: 31.97,
    tax_amount: 2.88,
    total_amount: 34.85,
    status: 'delivered',
    payment_status: 'cash',
    table_number: 3,
    created_at: '2024-01-05T20:30:00Z',
    updated_at: '2024-01-05T20:30:00Z'
  }
];

// Mock Order Items
export const mockOrderItems: OrderItem[] = [
  {
    id: 'item-1',
    order_id: 'order-1',
    menu_item_id: 'menu-5',
    quantity: 1,
    price: 34.99
  },
  {
    id: 'item-2',
    order_id: 'order-1',
    menu_item_id: 'menu-11',
    quantity: 1,
    price: 8.99
  },
  {
    id: 'item-3',
    order_id: 'order-2',
    menu_item_id: 'menu-7',
    quantity: 1,
    price: 18.99
  },
  {
    id: 'item-4',
    order_id: 'order-2',
    menu_item_id: 'menu-13',
    quantity: 1,
    price: 4.99
  },
  {
    id: 'item-5',
    order_id: 'order-3',
    menu_item_id: 'menu-4',
    quantity: 1,
    price: 28.99
  },
  {
    id: 'item-6',
    order_id: 'order-3',
    menu_item_id: 'menu-6',
    quantity: 1,
    price: 32.99
  },
  {
    id: 'item-7',
    order_id: 'order-3',
    menu_item_id: 'menu-12',
    quantity: 1,
    price: 6.99
  }
];

// Helper function to get order items with menu item details
export const getOrderItemsWithMenuItems = (orderId: string): (OrderItem & { menu_item: MenuItem })[] => {
  return mockOrderItems
    .filter(item => item.order_id === orderId)
    .map(item => ({
      ...item,
      menu_item: mockMenuItems.find(menu => menu.id === item.menu_item_id)!
    }));
};

// Helper function to get orders with customer and items
export const getOrdersWithDetails = () => {
  return mockOrders.map(order => ({
    ...order,
    customer: mockUsers.find(user => user.id === order.customer_id),
    order_items: getOrderItemsWithMenuItems(order.id)
  }));
};