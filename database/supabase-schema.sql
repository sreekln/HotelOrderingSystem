-- =====================================================
-- Hotel Ordering System - Supabase PostgreSQL Schema
-- PostgreSQL with Supabase Auth Integration
-- =====================================================

/*
  # Hotel Ordering System Database Schema

  1. New Tables
    - `users` - User profiles with roles
    - `companies` - Supplier/vendor information
    - `menu_items` - Restaurant menu with categories and pricing
    - `table_sessions` - Table occupancy and session management
    - `orders` - Customer orders
    - `order_items` - Line items for orders
    - `part_orders` - Sub-orders within table sessions
    - `part_order_items` - Line items for part orders

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Integrate with Supabase Auth for user management

  3. Performance
    - Indexes on frequently queried columns
    - Foreign key constraints
    - Automatic timestamp updates
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS part_order_items CASCADE;
DROP TABLE IF EXISTS part_orders CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS table_sessions CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('server', 'kitchen', 'admin', 'customer')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Public can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- COMPANIES TABLE
-- =====================================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_category ON companies(category);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read companies"
  ON companies FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete companies"
  ON companies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- MENU ITEMS TABLE
-- =====================================================
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL CHECK (category IN ('appetizer', 'main', 'dessert', 'beverage')),
    company TEXT NOT NULL,
    food_category TEXT CHECK (food_category IN ('Raw', 'Cooked')),
    available BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_company ON menu_items(company);
CREATE INDEX idx_menu_items_available ON menu_items(available);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read available menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can insert menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- TABLE SESSIONS TABLE
-- =====================================================
CREATE TABLE table_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number INTEGER NOT NULL,
    server_id UUID,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ready_to_close', 'closed')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (server_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_active_table_sessions
    ON table_sessions(table_number)
    WHERE status = 'active';

CREATE INDEX idx_table_sessions_table_number ON table_sessions(table_number);
CREATE INDEX idx_table_sessions_status ON table_sessions(status);
CREATE INDEX idx_table_sessions_server_id ON table_sessions(server_id);

ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read all table sessions"
  ON table_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Servers can insert table sessions"
  ON table_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'admin')
    )
  );

CREATE POLICY "Staff can update table sessions"
  ON table_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    table_number INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_table_number ON orders(table_number);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text OR deleted_at IS NULL);

CREATE POLICY "Staff can read all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Authenticated users can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    menu_item_id UUID NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id::text = auth.uid()::text OR orders.deleted_at IS NULL)
    )
  );

CREATE POLICY "Staff can read all order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Authenticated users can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- PART ORDERS TABLE
-- =====================================================
CREATE TABLE part_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_session_id UUID NOT NULL,
    server_id UUID,
    table_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent_to_kitchen', 'preparing', 'ready', 'served')),
    printed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (table_session_id) REFERENCES table_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (server_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_part_orders_table_session_id ON part_orders(table_session_id);
CREATE INDEX idx_part_orders_status ON part_orders(status);
CREATE INDEX idx_part_orders_table_number ON part_orders(table_number);
CREATE INDEX idx_part_orders_server_id ON part_orders(server_id);

ALTER TABLE part_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read all part orders"
  ON part_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Servers can insert part orders"
  ON part_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'admin')
    )
  );

CREATE POLICY "Staff can update part orders"
  ON part_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

-- =====================================================
-- PART ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE part_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_order_id UUID NOT NULL,
    menu_item_id UUID NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (part_order_id) REFERENCES part_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE INDEX idx_part_order_items_part_order_id ON part_order_items(part_order_id);
CREATE INDEX idx_part_order_items_menu_item_id ON part_order_items(menu_item_id);

ALTER TABLE part_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read all part order items"
  ON part_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Servers can insert part order items"
  ON part_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role IN ('server', 'admin')
    )
  );

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_part_orders_updated_at
    BEFORE UPDATE ON part_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
