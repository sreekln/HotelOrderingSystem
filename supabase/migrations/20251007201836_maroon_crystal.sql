-- =====================================================
-- Hotel Ordering System - PostgreSQL Database Schema
-- Converted from Supabase to native PostgreSQL
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CUSTOM TYPES (ENUMS)
-- =====================================================

-- User roles enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('server', 'kitchen', 'admin', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Order status enum
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment status enum
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Menu item category enum
DO $$ BEGIN
    CREATE TYPE menu_category AS ENUM ('appetizer', 'main', 'dessert', 'beverage');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Food category enum
DO $$ BEGIN
    CREATE TYPE food_category AS ENUM ('Raw', 'Cooked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table session status enum
DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('active', 'ready_to_close', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Part order status enum
DO $$ BEGIN
    CREATE TYPE part_order_status AS ENUM ('draft', 'sent_to_kitchen', 'preparing', 'ready', 'served');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category TEXT,
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category menu_category NOT NULL,
    company TEXT NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 8.5 CHECK (tax_rate >= 0 AND tax_rate <= 100),
    food_category food_category NOT NULL DEFAULT 'Cooked',
    image_url TEXT,
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) NOT NULL CHECK (tax_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status order_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    special_instructions TEXT,
    table_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Order items table (junction table)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table sessions table (for server workflow)
CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status session_status NOT NULL DEFAULT 'active',
    payment_status payment_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Part orders table (individual orders within table sessions)
CREATE TABLE IF NOT EXISTS part_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    items JSONB NOT NULL,
    special_instructions TEXT,
    status part_order_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    printed_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(category);
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);

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
CREATE INDEX IF NOT EXISTS idx_part_orders_table_number ON part_orders(table_number);
CREATE INDEX IF NOT EXISTS idx_part_orders_status ON part_orders(status);
CREATE INDEX IF NOT EXISTS idx_part_orders_created_at ON part_orders(created_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_table_sessions_updated_at ON table_sessions;
CREATE TRIGGER update_table_sessions_updated_at
    BEFORE UPDATE ON table_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_part_orders_updated_at ON part_orders;
CREATE TRIGGER update_part_orders_updated_at
    BEFORE UPDATE ON part_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Order details view with customer and items
CREATE OR REPLACE VIEW order_details AS
SELECT 
    o.*,
    u.full_name as customer_name,
    u.email as customer_email,
    COALESCE(
        json_agg(
            json_build_object(
                'id', oi.id,
                'menu_item_id', oi.menu_item_id,
                'quantity', oi.quantity,
                'price', oi.price,
                'menu_item', json_build_object(
                    'id', mi.id,
                    'name', mi.name,
                    'description', mi.description,
                    'category', mi.category,
                    'company', mi.company,
                    'tax_rate', mi.tax_rate,
                    'food_category', mi.food_category
                )
            )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
    ) as order_items
FROM orders o
LEFT JOIN users u ON o.customer_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE o.deleted_at IS NULL
GROUP BY o.id, u.full_name, u.email;

-- Menu items with company details view
CREATE OR REPLACE VIEW menu_items_with_company AS
SELECT 
    mi.*,
    c.category as company_category,
    c.contact_email as company_email,
    c.phone as company_phone
FROM menu_items mi
LEFT JOIN companies c ON mi.company = c.name
WHERE mi.deleted_at IS NULL;

-- Active table sessions view
CREATE OR REPLACE VIEW active_table_sessions AS
SELECT 
    ts.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', po.id,
                'table_number', po.table_number,
                'items', po.items,
                'special_instructions', po.special_instructions,
                'status', po.status,
                'created_at', po.created_at,
                'printed_at', po.printed_at
            )
            ORDER BY po.created_at
        ) FILTER (WHERE po.id IS NOT NULL),
        '[]'::json
    ) as part_orders
FROM table_sessions ts
LEFT JOIN part_orders po ON ts.id = po.table_session_id
WHERE ts.status != 'closed'
GROUP BY ts.id;

-- =====================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- =====================================================

-- Insert sample companies
INSERT INTO companies (name, category, contact_email, phone) VALUES
('Lush & Hush', 'Hotel Restaurant', 'orders@lushandhush.com', '+44 20 7123 4567'),
('Pick D', 'Quick Service', 'orders@pickd.com', '+44 20 7234 5678'),
('SS Food Court', 'Food Court', 'orders@ssfoodcourt.com', '+44 20 7345 6789'),
('Fresh Garden Co.', 'Produce & Salads', 'orders@freshgarden.com', '+44 20 7456 7890'),
('Ocean Fresh Seafood', 'Seafood & Fish', 'orders@oceanfresh.com', '+44 20 7567 8901'),
('Premium Meats Co.', 'Meat & Poultry', 'sales@premiummeats.co.uk', '+44 20 7678 9012'),
('Artisan Pizza Works', 'Italian & Pizza', 'info@artisanpizza.co.uk', '+44 20 7789 0123'),
('Sweet Dreams Bakery', 'Desserts & Pastries', 'orders@sweetdreams.com', '+44 20 7890 1234'),
('Vineyard Select', 'Wine & Spirits', 'sales@vineyardselect.com', '+44 20 7901 2345'),
('Local Brew Co.', 'Craft Beer', 'orders@localbrew.co.uk', '+44 20 7012 3456')
ON CONFLICT (name) DO NOTHING;

-- Insert sample users
INSERT INTO users (email, password_hash, full_name, role) VALUES
('server@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'John Smith', 'server'),
('kitchen@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Chef Maria', 'kitchen'),
('admin@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Manager David', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, company, tax_rate, food_category, available) VALUES
-- Appetizers
('Caesar Salad', 'Fresh romaine lettuce with parmesan cheese, croutons, and our signature Caesar dressing', 12.99, 'appetizer', 'Fresh Garden Co.', 8.5, 'Raw', true),
('Buffalo Wings', 'Crispy chicken wings tossed in spicy buffalo sauce, served with blue cheese dip', 14.99, 'appetizer', 'Lush & Hush', 8.5, 'Cooked', true),
('Truffle Arancini', 'Crispy risotto balls filled with truffle and parmesan, served with marinara sauce', 16.99, 'appetizer', 'Lush & Hush', 8.5, 'Cooked', true),
('Bruschetta Trio', 'Three varieties of toasted bread with tomato basil, mushroom, and olive tapenade', 11.99, 'appetizer', 'Artisan Pizza Works', 8.5, 'Cooked', true),

-- Main Courses
('Grilled Atlantic Salmon', 'Fresh salmon fillet with lemon herb seasoning, served with roasted vegetables and quinoa', 28.99, 'main', 'Ocean Fresh Seafood', 8.5, 'Cooked', true),
('Beef Tenderloin', 'Prime cut beef tenderloin cooked to perfection, served with garlic mashed potatoes', 34.99, 'main', 'Premium Meats Co.', 8.5, 'Cooked', true),
('Lobster Risotto', 'Creamy arborio rice with fresh lobster, asparagus, and white wine reduction', 32.99, 'main', 'Ocean Fresh Seafood', 8.5, 'Cooked', true),
('Margherita Pizza', 'Wood-fired pizza with fresh mozzarella, basil, and San Marzano tomatoes', 18.99, 'main', 'Artisan Pizza Works', 8.5, 'Cooked', true),
('Chicken Parmesan', 'Breaded chicken breast with marinara sauce and melted mozzarella, served with pasta', 24.99, 'main', 'Lush & Hush', 8.5, 'Cooked', true),
('Vegetarian Curry', 'Aromatic curry with seasonal vegetables, chickpeas, and basmati rice', 19.99, 'main', 'SS Food Court', 8.5, 'Cooked', true),

-- Desserts
('Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 8.99, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Cooked', true),
('Tiramisu', 'Traditional Italian dessert with coffee-soaked ladyfingers and mascarpone', 9.99, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Raw', true),
('Crème Brûlée', 'Classic French custard with caramelized sugar crust and fresh berries', 10.99, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Cooked', true),
('Cheesecake', 'New York style cheesecake with berry compote', 7.99, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Raw', true),

-- Beverages
('House Wine (Glass)', 'Selection of premium red or white wine from our curated collection', 8.99, 'beverage', 'Vineyard Select', 10.0, 'Raw', true),
('Craft Beer', 'Local brewery selection featuring seasonal and signature brews', 6.99, 'beverage', 'Local Brew Co.', 10.0, 'Raw', true),
('Fresh Orange Juice', 'Freshly squeezed orange juice from premium Valencia oranges', 4.99, 'beverage', 'Fresh Garden Co.', 8.5, 'Raw', true),
('Artisan Coffee', 'Single-origin coffee beans expertly roasted and brewed to perfection', 3.99, 'beverage', 'Lush & Hush', 8.5, 'Cooked', true),
('Sparkling Water', 'Premium sparkling water with lemon or lime', 2.99, 'beverage', 'Lush & Hush', 8.5, 'Raw', true),
('Signature Cocktail', 'House special cocktail crafted by our mixologist', 12.99, 'beverage', 'Lush & Hush', 10.0, 'Raw', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =====================================================

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals(order_uuid UUID)
RETURNS TABLE(subtotal DECIMAL, tax_amount DECIMAL, total_amount DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(oi.price * oi.quantity), 0) as subtotal,
        COALESCE(SUM(oi.price * oi.quantity * (mi.tax_rate / 100)), 0) as tax_amount,
        COALESCE(SUM(oi.price * oi.quantity * (1 + mi.tax_rate / 100)), 0) as total_amount
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE oi.order_id = order_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to update table session total
CREATE OR REPLACE FUNCTION update_table_session_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the table session total when part orders change
    UPDATE table_sessions 
    SET total_amount = (
        SELECT COALESCE(SUM(
            (items->>'total_amount')::DECIMAL
        ), 0)
        FROM part_orders 
        WHERE table_session_id = COALESCE(NEW.table_session_id, OLD.table_session_id)
    )
    WHERE id = COALESCE(NEW.table_session_id, OLD.table_session_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update table session totals
DROP TRIGGER IF EXISTS update_session_total_trigger ON part_orders;
CREATE TRIGGER update_session_total_trigger
    AFTER INSERT OR UPDATE OR DELETE ON part_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_table_session_total();

-- =====================================================
-- SECURITY AND PERMISSIONS
-- =====================================================

-- Create application user (for connection pooling)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hotel_app') THEN
        CREATE ROLE hotel_app WITH LOGIN PASSWORD 'secure_app_password_change_in_production';
    END IF;
END
$$;

-- Grant necessary permissions to application user
GRANT USAGE ON SCHEMA public TO hotel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hotel_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hotel_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO hotel_app;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hotel_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO hotel_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO hotel_app;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Hotel Ordering System Database Setup Complete!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables created: %', (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');
    RAISE NOTICE 'Views created: %', (SELECT count(*) FROM information_schema.views WHERE table_schema = 'public');
    RAISE NOTICE 'Functions created: %', (SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION');
    RAISE NOTICE 'Sample companies: %', (SELECT count(*) FROM companies);
    RAISE NOTICE 'Sample menu items: %', (SELECT count(*) FROM menu_items);
    RAISE NOTICE 'Sample users: %', (SELECT count(*) FROM users);
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Ready for Hotel Ordering System!';
    RAISE NOTICE '==============================================';
END $$;