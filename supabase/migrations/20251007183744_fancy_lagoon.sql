-- Migration: Initial Hotel Ordering System Schema
-- Created: 2024-01-01
-- Description: Creates the complete database schema for the Hotel Ordering System

-- This migration creates all the necessary tables, types, indexes, and policies
-- for the Hotel Ordering System application.

-- =============================================
-- ENUMS AND CUSTOM TYPES
-- =============================================

-- Order status enumeration
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending',
        'confirmed', 
        'preparing',
        'ready',
        'delivered',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment status enumeration
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending',
        'paid',
        'failed',
        'cash'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Menu item categories
DO $$ BEGIN
    CREATE TYPE menu_category AS ENUM (
        'appetizer',
        'main',
        'dessert',
        'beverage'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Food categories for kitchen preparation
DO $$ BEGIN
    CREATE TYPE food_category AS ENUM (
        'Raw',
        'Cooked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'server',
        'kitchen',
        'admin',
        'customer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- CORE TABLES
-- =============================================

-- Companies/Suppliers table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category TEXT,
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category menu_category NOT NULL,
    company TEXT NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 8.5 CHECK (tax_rate >= 0 AND tax_rate <= 100),
    food_category food_category DEFAULT 'Cooked',
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) NOT NULL CHECK (tax_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status order_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    special_instructions TEXT,
    table_number INTEGER CHECK (table_number > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    
    -- Foreign key to users table
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order items table (junction table for orders and menu items)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    menu_item_id UUID NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Foreign keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
);

-- Table sessions for part orders (server workflow)
CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INTEGER NOT NULL CHECK (table_number > 0),
    customer_name TEXT NOT NULL,
    total_amount DECIMAL(10,2) DEFAULT 0 CHECK (total_amount >= 0),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ready_to_close', 'closed')),
    payment_status payment_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ
);

-- Part orders within table sessions
CREATE TABLE IF NOT EXISTS part_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_session_id UUID NOT NULL,
    items JSONB NOT NULL, -- Store cart items as JSON
    special_instructions TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent_to_kitchen', 'preparing', 'ready', 'served')),
    created_at TIMESTAMPTZ DEFAULT now(),
    printed_at TIMESTAMPTZ,
    
    -- Foreign key to table sessions
    FOREIGN KEY (table_session_id) REFERENCES table_sessions(id) ON DELETE CASCADE
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Menu items indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_company ON menu_items(company);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(available);
CREATE INDEX IF NOT EXISTS idx_menu_items_deleted_at ON menu_items(deleted_at);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

-- Table sessions indexes
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_number ON table_sessions(table_number);
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_table_sessions_created_at ON table_sessions(created_at);

-- Part orders indexes
CREATE INDEX IF NOT EXISTS idx_part_orders_table_session_id ON part_orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_part_orders_status ON part_orders(status);
CREATE INDEX IF NOT EXISTS idx_part_orders_created_at ON part_orders(created_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_orders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Companies policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can read companies" ON companies
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

-- Menu items policies
CREATE POLICY "Anyone can read available menu items" ON menu_items
    FOR SELECT TO authenticated
    USING (available = true AND deleted_at IS NULL);

CREATE POLICY "Admins can manage menu items" ON menu_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
            AND users.deleted_at IS NULL
        )
    );

-- Orders policies
CREATE POLICY "Users can read own orders" ON orders
    FOR SELECT TO authenticated
    USING (customer_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Staff can read all orders" ON orders
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('server', 'kitchen', 'admin')
            AND users.deleted_at IS NULL
        )
    );

CREATE POLICY "Servers can create orders" ON orders
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('server', 'admin')
            AND users.deleted_at IS NULL
        )
    );

CREATE POLICY "Staff can update orders" ON orders
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('server', 'kitchen', 'admin')
            AND users.deleted_at IS NULL
        )
    );

-- Order items policies
CREATE POLICY "Users can read order items for own orders" ON order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.customer_id = auth.uid()
            AND orders.deleted_at IS NULL
        )
    );

CREATE POLICY "Staff can read all order items" ON order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('server', 'kitchen', 'admin')
            AND users.deleted_at IS NULL
        )
    );

CREATE POLICY "Staff can manage order items" ON order_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('server', 'kitchen', 'admin')
            AND users.deleted_at IS NULL
        )
    );

-- Table sessions policies
CREATE POLICY "Staff can manage table sessions" ON table_sessions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('server', 'admin')
            AND users.deleted_at IS NULL
        )
    );

-- Part orders policies
CREATE POLICY "Staff can manage part orders" ON part_orders
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('server', 'kitchen', 'admin')
            AND users.deleted_at IS NULL
        )
    );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_table_sessions_updated_at BEFORE UPDATE ON table_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default companies
INSERT INTO companies (name, category, contact_email, phone) VALUES
    ('Lush & Hush', 'Hotel Restaurant', 'orders@lushandhush.com', '+44 20 7123 4567'),
    ('Pick D', 'Quick Service', 'orders@pickd.com', '+44 20 7234 5678'),
    ('SS Food Court', 'Food Court', 'orders@ssfoodcourt.com', '+44 20 7345 6789')
ON CONFLICT (name) DO NOTHING;

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, company, tax_rate, food_category, available) VALUES
    ('Caesar Salad', 'Fresh romaine lettuce with parmesan cheese, croutons, and our signature Caesar dressing', 12.99, 'appetizer', 'Lush & Hush', 8.5, 'Raw', true),
    ('Buffalo Wings', 'Crispy chicken wings tossed in spicy buffalo sauce, served with blue cheese dip', 14.99, 'appetizer', 'Pick D', 8.5, 'Cooked', true),
    ('Truffle Arancini', 'Crispy risotto balls filled with truffle and parmesan, served with marinara sauce', 16.99, 'appetizer', 'SS Food Court', 8.5, 'Cooked', true),
    ('Grilled Atlantic Salmon', 'Fresh salmon fillet with lemon herb seasoning, served with roasted vegetables and quinoa', 28.99, 'main', 'Lush & Hush', 8.5, 'Cooked', true),
    ('Beef Tenderloin', 'Prime cut beef tenderloin cooked to perfection, served with garlic mashed potatoes', 34.99, 'main', 'Lush & Hush', 8.5, 'Cooked', true),
    ('Margherita Pizza', 'Wood-fired pizza with fresh mozzarella, basil, and San Marzano tomatoes', 18.99, 'main', 'Pick D', 8.5, 'Cooked', true),
    ('Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 8.99, 'dessert', 'SS Food Court', 8.5, 'Cooked', true),
    ('Tiramisu', 'Traditional Italian dessert with coffee-soaked ladyfingers and mascarpone', 9.99, 'dessert', 'Lush & Hush', 8.5, 'Raw', true),
    ('House Wine (Glass)', 'Selection of premium red or white wine from our curated collection', 8.99, 'beverage', 'Lush & Hush', 10.0, 'Raw', true),
    ('Craft Beer', 'Local brewery selection featuring seasonal and signature brews', 6.99, 'beverage', 'Pick D', 10.0, 'Raw', true),
    ('Fresh Orange Juice', 'Freshly squeezed orange juice from premium Valencia oranges', 4.99, 'beverage', 'SS Food Court', 8.5, 'Raw', true),
    ('Artisan Coffee', 'Single-origin coffee beans expertly roasted and brewed to perfection', 3.99, 'beverage', 'Lush & Hush', 8.5, 'Cooked', true)
ON CONFLICT DO NOTHING;