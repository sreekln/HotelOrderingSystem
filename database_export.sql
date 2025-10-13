-- ============================================
-- SUPABASE DATABASE SCHEMA AND DATA EXPORT
-- Generated: 2025-10-13
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CUSTOM TYPES
-- ============================================

CREATE TYPE stripe_subscription_status AS ENUM (
    'not_started',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);

CREATE TYPE stripe_order_status AS ENUM (
    'pending',
    'completed',
    'canceled'
);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLES
-- ============================================

-- Users Table (references auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('server', 'kitchen', 'admin', 'customer')),
    password_hash TEXT,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL CHECK (category IN ('appetizer', 'main', 'dessert', 'beverage')),
    company TEXT NOT NULL,
    food_category TEXT CHECK (food_category IN ('Raw', 'Cooked')),
    tax_rate NUMERIC DEFAULT 20,
    available BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

-- Tables Management Table
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Table Sessions Table
CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INTEGER NOT NULL,
    server_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ready_to_close', 'closed')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    customer_name TEXT,
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Part Orders Table
CREATE TABLE IF NOT EXISTS part_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_session_id UUID NOT NULL REFERENCES table_sessions(id),
    server_id UUID REFERENCES users(id) ON DELETE SET NULL,
    table_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent_to_kitchen', 'preparing', 'ready', 'served')),
    printed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Part Order Items Table
CREATE TABLE IF NOT EXISTS part_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_order_id UUID NOT NULL REFERENCES part_orders(id),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    table_number INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Stripe Customers Table
CREATE TABLE IF NOT EXISTS stripe_customers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    customer_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Stripe Subscriptions Table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_id TEXT UNIQUE NOT NULL,
    subscription_id TEXT DEFAULT NULL,
    price_id TEXT DEFAULT NULL,
    current_period_start BIGINT DEFAULT NULL,
    current_period_end BIGINT DEFAULT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    payment_method_brand TEXT DEFAULT NULL,
    payment_method_last4 TEXT DEFAULT NULL,
    status stripe_subscription_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Stripe Orders Table
CREATE TABLE IF NOT EXISTS stripe_orders (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    checkout_session_id TEXT NOT NULL,
    payment_intent_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount_subtotal BIGINT NOT NULL,
    amount_total BIGINT NOT NULL,
    currency TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    status stripe_order_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- ============================================
-- TRIGGERS
-- ============================================

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

CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
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

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Users Table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Staff can read all profiles"
    ON users FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their profile"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
    ON users FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- Companies Table RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read companies"
    ON companies FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Menu Items Table RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read menu items"
    ON menu_items FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Tables Management RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read active tables"
    ON tables FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Admins can insert tables"
    ON tables FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admins can update tables"
    ON tables FOR UPDATE
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

CREATE POLICY "Admins can delete tables"
    ON tables FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Orders Table RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders"
    ON orders FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Order Items Table RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Table Sessions Table RLS
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Servers can view their own table sessions"
    ON table_sessions FOR SELECT
    TO authenticated
    USING (server_id = auth.uid());

CREATE POLICY "Servers can insert table sessions"
    ON table_sessions FOR INSERT
    TO authenticated
    WITH CHECK (server_id = auth.uid());

CREATE POLICY "Servers can update their own table sessions"
    ON table_sessions FOR UPDATE
    TO authenticated
    USING (server_id = auth.uid())
    WITH CHECK (server_id = auth.uid());

-- Part Orders Table RLS
ALTER TABLE part_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Servers can view part orders for their sessions"
    ON part_orders FOR SELECT
    TO authenticated
    USING (
        server_id = auth.uid() OR
        table_session_id IN (
            SELECT id FROM table_sessions WHERE server_id = auth.uid()
        )
    );

CREATE POLICY "Servers can insert part orders"
    ON part_orders FOR INSERT
    TO authenticated
    WITH CHECK (
        server_id = auth.uid() OR
        table_session_id IN (
            SELECT id FROM table_sessions WHERE server_id = auth.uid()
        )
    );

CREATE POLICY "Servers can update part orders for their sessions"
    ON part_orders FOR UPDATE
    TO authenticated
    USING (
        server_id = auth.uid() OR
        table_session_id IN (
            SELECT id FROM table_sessions WHERE server_id = auth.uid()
        )
    );

-- Part Order Items Table RLS
ALTER TABLE part_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Servers can view part order items"
    ON part_order_items FOR SELECT
    TO authenticated
    USING (
        part_order_id IN (
            SELECT id FROM part_orders WHERE server_id = auth.uid()
        )
    );

CREATE POLICY "Servers can insert part order items"
    ON part_order_items FOR INSERT
    TO authenticated
    WITH CHECK (
        part_order_id IN (
            SELECT id FROM part_orders WHERE server_id = auth.uid()
        )
    );

CREATE POLICY "Servers can update part order items"
    ON part_order_items FOR UPDATE
    TO authenticated
    USING (
        part_order_id IN (
            SELECT id FROM part_orders WHERE server_id = auth.uid()
        )
    );

-- Stripe Customers Table RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customer data"
    ON stripe_customers FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Stripe Subscriptions Table RLS
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription data"
    ON stripe_subscriptions FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

-- Stripe Orders Table RLS
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order data"
    ON stripe_orders FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

-- ============================================
-- VIEWS
-- ============================================

CREATE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

GRANT SELECT ON stripe_user_subscriptions TO authenticated;

CREATE VIEW stripe_user_orders WITH (security_invoker) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND o.deleted_at IS NULL;

GRANT SELECT ON stripe_user_orders TO authenticated;

-- ============================================
-- DATA INSERTS
-- ============================================

-- Companies Data
INSERT INTO companies (id, name, category, contact_email, phone, address, created_at, updated_at) VALUES
('059d395c-0250-4e55-a633-65f028c01daa', 'Hotel Restaurant', 'Main Dining', 'restaurant@hotel.com', '555-0101', '123 Hotel Ave', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('b3da4543-0b06-407d-af74-1dd4773d52f1', 'Room Service', 'In-Room Dining', 'roomservice@hotel.com', '555-0102', '123 Hotel Ave', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('58cbff45-c170-4ec3-acef-c7b8bf7ab024', 'Pool Bar', 'Bar & Lounge', 'poolbar@hotel.com', '555-0103', '123 Hotel Ave', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00')
ON CONFLICT (id) DO NOTHING;

-- Menu Items Data
INSERT INTO menu_items (id, name, description, price, category, company, food_category, tax_rate, available, image_url, created_at, updated_at) VALUES
('27565b5f-8406-4c76-b7a4-7ac821f5e945', 'Bruschetta', 'Toasted bread with tomatoes, garlic, and basil', 10.99, 'appetizer', 'Hotel Restaurant', 'Cooked', 20, true, 'https://images.pexels.com/photos/1647163/pexels-photo-1647163.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('95b5c8a7-50ba-4c85-bb82-083eb9862849', 'Caesar Salad', 'Fresh romaine lettuce with parmesan and croutons', 12.99, 'appetizer', 'Hotel Restaurant', 'Raw', 20, true, 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('ef9f6784-a48f-4554-828e-4c3654552385', 'Soup of the Day', 'Chef''s daily soup creation', 8.99, 'appetizer', 'Hotel Restaurant', 'Cooked', 20, true, 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('6e84ada7-0b97-405a-af5c-89732ba875d6', 'Chicken Parmesan', 'Breaded chicken with marinara and mozzarella', 22.99, 'main', 'Hotel Restaurant', 'Cooked', 20, true, 'https://images.pexels.com/photos/106343/pexels-photo-106343.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('d09286ff-e784-4c6e-b107-ca3ba21bdd67', 'Grilled Salmon', 'Atlantic salmon with seasonal vegetables', 28.99, 'main', 'Hotel Restaurant', 'Cooked', 20, true, 'https://images.pexels.com/photos/1516415/pexels-photo-1516415.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('5cb24060-fe9d-411e-b0d1-3f8cf52ac7cb', 'Ribeye Steak', '12oz USDA Prime ribeye with mashed potatoes', 42.99, 'main', 'Hotel Restaurant', 'Cooked', 20, true, 'https://images.pexels.com/photos/769289/pexels-photo-769289.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('a3cb1bf9-887a-49fb-8f3c-1a365e7eac2f', 'Vegetarian Pasta', 'Penne with roasted vegetables and olive oil', 18.99, 'main', 'Hotel Restaurant', 'Cooked', 20, true, 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('3f2dcd9e-99ff-42c2-928b-f470166ccee3', 'Cheesecake', 'New York style cheesecake with berry compote', 8.99, 'dessert', 'Hotel Restaurant', 'Raw', 20, true, 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('33f1d7d4-4754-455b-bc7c-6cb92f2fb750', 'Chocolate Lava Cake', 'Warm chocolate cake with vanilla ice cream', 9.99, 'dessert', 'Hotel Restaurant', 'Cooked', 20, true, 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('fa7b49f6-78ce-4bb6-b243-a5ddb6d385af', 'Tiramisu', 'Classic Italian coffee-flavored dessert', 8.99, 'dessert', 'Hotel Restaurant', 'Raw', 20, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('fcecf02a-c889-4d14-896a-e84132a5e022', 'Red Wine', 'House red wine', 12.99, 'beverage', 'Hotel Restaurant', 'Raw', 20, true, 'https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('7eda43c1-c51f-4cd9-84b8-5029c133283e', 'Coffee', 'Freshly brewed coffee', 3.99, 'beverage', 'Room Service', 'Cooked', 20, true, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('57b1ad75-92e3-40b9-8be2-5b20943e23b3', 'Orange Juice', 'Freshly squeezed orange juice', 5.99, 'beverage', 'Room Service', 'Raw', 20, true, 'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('26927a33-2218-475c-8dcc-bfa6f70acea0', 'Beer', 'Draft beer selection', 6.99, 'beverage', 'Pool Bar', 'Raw', 20, true, 'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00'),
('0617e60e-d8ab-46a5-b9f5-213ad0c6a47d', 'Coca Cola', 'Classic soft drink', 3.99, 'beverage', 'Pool Bar', 'Raw', 20, true, 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg', '2025-10-08 18:30:50.696077+00', '2025-10-08 18:30:50.696077+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- NOTES
-- ============================================

-- Note: User data is stored in auth.users (Supabase Auth) and referenced in the public.users table.
-- The users table must be populated after users register through Supabase Auth.

-- Note: Stripe customers, subscriptions, and orders are populated dynamically through
-- the application's Stripe integration and webhook handlers.

-- Note: Tables are managed by admins through the application and can be dynamically
-- added, edited, or soft-deleted.

-- Sample data included:
-- - 3 companies (Hotel Restaurant, Room Service, Pool Bar)
-- - 15 menu items across different categories with tax rates

-- Schema features:
-- - Table management for dynamic table creation
-- - Part orders system for managing table sessions
-- - Item-level and session-level discount support
-- - Tax rate support per menu item
-- - Comprehensive RLS policies for security
-- - Soft delete support for data preservation
-- - Customer name tracking for table sessions

-- ============================================
-- END OF EXPORT
-- ============================================
