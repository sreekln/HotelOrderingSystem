/*
  # Restaurant Ordering System Database Schema

  This migration creates the complete database structure for a restaurant ordering system
  with multi-role support (customer, server, kitchen, admin), table session management,
  and part order tracking.

  ## New Tables

  ### 1. `users`
  - `id` (uuid, primary key) - References auth.users(id)
  - `email` (text, unique, not null) - User email
  - `role` (text, not null) - User role: 'customer', 'server', 'kitchen', 'admin'
  - `full_name` (text, not null) - Full name
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `companies`
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text, unique, not null) - Company name
  - `category` (text, not null) - Company category
  - `contact_email` (text) - Contact email
  - `phone` (text) - Phone number
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. `menu_items`
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text, not null) - Item name
  - `description` (text) - Item description
  - `price` (numeric, not null) - Item price
  - `category` (text, not null) - Category: 'appetizer', 'main', 'dessert', 'beverage'
  - `company` (text, not null) - Company name
  - `tax_rate` (numeric, not null) - Tax rate percentage (e.g., 8.5 for 8.5%)
  - `food_category` (text, not null) - Food category: 'Raw' or 'Cooked'
  - `image_url` (text) - Optional image URL
  - `available` (boolean, not null) - Availability status
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. `table_sessions`
  - `id` (uuid, primary key) - Unique identifier
  - `table_number` (integer, not null) - Table number
  - `customer_name` (text, not null) - Customer name
  - `server_id` (uuid) - References users(id) - Server who created session
  - `total_amount` (numeric, not null) - Total amount for all part orders
  - `status` (text, not null) - Status: 'active', 'ready_to_close', 'closed'
  - `payment_status` (text) - Payment status: 'pending', 'paid', 'failed'
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. `part_orders`
  - `id` (uuid, primary key) - Unique identifier
  - `table_session_id` (uuid, not null) - References table_sessions(id)
  - `table_number` (integer, not null) - Table number (denormalized for quick access)
  - `special_instructions` (text) - Special instructions for kitchen
  - `status` (text, not null) - Status: 'draft', 'sent_to_kitchen', 'preparing', 'ready', 'served'
  - `printed_at` (timestamptz) - When order was sent to kitchen
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 6. `part_order_items`
  - `id` (uuid, primary key) - Unique identifier
  - `part_order_id` (uuid, not null) - References part_orders(id)
  - `menu_item_id` (uuid, not null) - References menu_items(id)
  - `quantity` (integer, not null) - Quantity ordered
  - `price` (numeric, not null) - Price at time of order
  - `created_at` (timestamptz) - Creation timestamp

  ### 7. `orders`
  - `id` (uuid, primary key) - Unique identifier
  - `customer_id` (uuid, not null) - References users(id)
  - `table_number` (integer) - Optional table number
  - `subtotal` (numeric, not null) - Order subtotal
  - `tax_amount` (numeric, not null) - Total tax amount
  - `total_amount` (numeric, not null) - Total amount including tax
  - `status` (text, not null) - Status: 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'
  - `payment_status` (text, not null) - Payment status: 'pending', 'paid', 'failed'
  - `special_instructions` (text) - Special instructions
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 8. `order_items`
  - `id` (uuid, primary key) - Unique identifier
  - `order_id` (uuid, not null) - References orders(id)
  - `menu_item_id` (uuid, not null) - References menu_items(id)
  - `quantity` (integer, not null) - Quantity ordered
  - `price` (numeric, not null) - Price at time of order
  - `created_at` (timestamptz) - Creation timestamp

  ## Security

  - RLS enabled on all tables
  - Policies created for each role type (customer, server, kitchen, admin)
  - Authenticated users can read menu items and companies
  - Servers can create and manage table sessions and part orders
  - Kitchen staff can view and update order statuses
  - Admins have full access to all data
  - Users can only access their own data unless they have elevated permissions

  ## Indexes

  - Performance indexes on frequently queried columns
  - Foreign key relationships for data integrity
*/

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'server', 'kitchen', 'admin')),
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  contact_email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  category text NOT NULL CHECK (category IN ('appetizer', 'main', 'dessert', 'beverage')),
  company text NOT NULL,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 8.5 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  food_category text NOT NULL CHECK (food_category IN ('Raw', 'Cooked')),
  image_url text,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table_sessions table
CREATE TABLE IF NOT EXISTS table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number integer NOT NULL CHECK (table_number > 0),
  customer_name text NOT NULL,
  server_id uuid REFERENCES users(id) ON DELETE SET NULL,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ready_to_close', 'closed')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create part_orders table
CREATE TABLE IF NOT EXISTS part_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_session_id uuid NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  table_number integer NOT NULL CHECK (table_number > 0),
  special_instructions text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent_to_kitchen', 'preparing', 'ready', 'served')),
  printed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create part_order_items table
CREATE TABLE IF NOT EXISTS part_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_order_id uuid NOT NULL REFERENCES part_orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  table_number integer CHECK (table_number > 0),
  subtotal numeric(10, 2) NOT NULL CHECK (subtotal >= 0),
  tax_amount numeric(10, 2) NOT NULL CHECK (tax_amount >= 0),
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  special_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(available);
CREATE INDEX IF NOT EXISTS idx_menu_items_company ON menu_items(company);
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_number ON table_sessions(table_number);
CREATE INDEX IF NOT EXISTS idx_part_orders_table_session_id ON part_orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_part_orders_status ON part_orders(status);
CREATE INDEX IF NOT EXISTS idx_part_order_items_part_order_id ON part_order_items(part_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for companies table
CREATE POLICY "Anyone can view companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for menu_items table
CREATE POLICY "Anyone can view available menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (available = true OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'kitchen', 'server')
  ));

CREATE POLICY "Admins can insert menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for table_sessions table
CREATE POLICY "Servers and admins can view table sessions"
  ON table_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'admin', 'kitchen')
    )
  );

CREATE POLICY "Servers can create table sessions"
  ON table_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'admin')
    )
  );

CREATE POLICY "Servers and admins can update table sessions"
  ON table_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'admin')
    )
  );

-- RLS Policies for part_orders table
CREATE POLICY "Staff can view part orders"
  ON part_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Servers can create part orders"
  ON part_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'admin')
    )
  );

CREATE POLICY "Staff can update part orders"
  ON part_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

-- RLS Policies for part_order_items table
CREATE POLICY "Staff can view part order items"
  ON part_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Servers can create part order items"
  ON part_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'admin')
    )
  );

CREATE POLICY "Servers can update part order items"
  ON part_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'admin')
    )
  );

CREATE POLICY "Servers can delete part order items"
  ON part_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('server', 'admin')
    )
  );

-- RLS Policies for orders table
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('kitchen', 'admin', 'server')
    )
  );

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Staff can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('kitchen', 'admin', 'server')
    )
  )
  WITH CHECK (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('kitchen', 'admin', 'server')
    )
  );

-- RLS Policies for order_items table
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.customer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('kitchen', 'admin', 'server')
        )
      )
    )
  );

CREATE POLICY "Authenticated users can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_table_sessions_updated_at
  BEFORE UPDATE ON table_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_part_orders_updated_at
  BEFORE UPDATE ON part_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
