-- =====================================================
-- Hotel Ordering System - PostgreSQL Database Schema
-- =====================================================

-- Create database (run this separately if needed)
-- CREATE DATABASE hotel_ordering_system;

-- Connect to the database
\c hotel_ordering_system;

-- Create application user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hotel_app_user') THEN
        CREATE ROLE hotel_app_user WITH LOGIN PASSWORD 'hotel_app_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE hotel_ordering_system TO hotel_app_user;
GRANT USAGE ON SCHEMA public TO hotel_app_user;
GRANT CREATE ON SCHEMA public TO hotel_app_user;

-- =====================================================
-- Custom Types (Enums)
-- =====================================================

-- User roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('server', 'kitchen', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Order status
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment status
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Menu categories
DO $$ BEGIN
    CREATE TYPE menu_category AS ENUM ('appetizer', 'main', 'dessert', 'beverage');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Food categories
DO $$ BEGIN
    CREATE TYPE food_category AS ENUM ('Raw', 'Cooked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Part order status
DO $$ BEGIN
    CREATE TYPE part_order_status AS ENUM ('draft', 'sent_to_kitchen', 'preparing', 'ready', 'served');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table session status
DO $$ BEGIN
    CREATE TYPE table_session_status AS ENUM ('active', 'ready_to_close', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- Core Tables
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'server',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    contact_email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category menu_category NOT NULL,
    company VARCHAR(255) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 8.5,
    food_category food_category NOT NULL DEFAULT 'Cooked',
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    special_instructions TEXT,
    table_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table sessions table
CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INTEGER NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status table_session_status NOT NULL DEFAULT 'active',
    payment_status payment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Part orders table
CREATE TABLE IF NOT EXISTS part_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    items JSONB NOT NULL,
    special_instructions TEXT,
    status part_order_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    printed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- Indexes for Performance
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
CREATE INDEX IF NOT EXISTS idx_table_sessions_deleted_at ON table_sessions(deleted_at);

-- Part orders indexes
CREATE INDEX IF NOT EXISTS idx_part_orders_table_session_id ON part_orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_part_orders_table_number ON part_orders(table_number);
CREATE INDEX IF NOT EXISTS idx_part_orders_status ON part_orders(status);
CREATE INDEX IF NOT EXISTS idx_part_orders_created_at ON part_orders(created_at);

-- =====================================================
-- Business Logic Functions
-- =====================================================

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals(order_items JSONB)
RETURNS TABLE(subtotal DECIMAL, tax_amount DECIMAL, total_amount DECIMAL) AS $$
DECLARE
    item JSONB;
    item_subtotal DECIMAL;
    item_tax DECIMAL;
    total_subtotal DECIMAL := 0;
    total_tax DECIMAL := 0;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(order_items)
    LOOP
        item_subtotal := (item->>'price')::DECIMAL * (item->>'quantity')::INTEGER;
        item_tax := item_subtotal * ((item->>'tax_rate')::DECIMAL / 100);
        total_subtotal := total_subtotal + item_subtotal;
        total_tax := total_tax + item_tax;
    END LOOP;
    
    RETURN QUERY SELECT total_subtotal, total_tax, total_subtotal + total_tax;
END;
$$ LANGUAGE plpgsql;

-- Function to update table session total
CREATE OR REPLACE FUNCTION update_table_session_total(session_id UUID)
RETURNS VOID AS $$
DECLARE
    total DECIMAL := 0;
    part_order RECORD;
    item JSONB;
    item_total DECIMAL;
BEGIN
    -- Calculate total from all part orders
    FOR part_order IN 
        SELECT items FROM part_orders 
        WHERE table_session_id = session_id
    LOOP
        FOR item IN SELECT * FROM jsonb_array_elements(part_order.items)
        LOOP
            item_total := (item->>'price')::DECIMAL * (item->>'quantity')::INTEGER;
            -- Add tax
            item_total := item_total * (1 + (item->>'tax_rate')::DECIMAL / 100);
            total := total + item_total;
        END LOOP;
    END LOOP;
    
    -- Update table session
    UPDATE table_sessions 
    SET total_amount = total, updated_at = NOW()
    WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to tables
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
-- Views for Common Queries
-- =====================================================

-- Order details view
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

-- =====================================================
-- Grant Permissions to Application User
-- =====================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hotel_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hotel_app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO hotel_app_user;

-- Grant permissions on views
GRANT SELECT ON order_details TO hotel_app_user;
GRANT SELECT ON menu_items_with_company TO hotel_app_user;

-- =====================================================
-- Sample Data
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

-- Insert sample users (password: password123)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('server@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Server User', 'server'),
('kitchen@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Kitchen Staff', 'kitchen'),
('admin@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, company, tax_rate, food_category, available) VALUES
-- Appetizers
('Caesar Salad', 'Fresh romaine lettuce with parmesan cheese, croutons, and our signature Caesar dressing', 12.99, 'appetizer', 'Fresh Garden Co.', 8.5, 'Raw', true),
('Buffalo Wings', 'Crispy chicken wings tossed in spicy buffalo sauce, served with blue cheese dip', 14.99, 'appetizer', 'Lush & Hush', 8.5, 'Cooked', true),
('Truffle Arancini', 'Crispy risotto balls filled with truffle and parmesan, served with marinara sauce', 16.99, 'appetizer', 'Lush & Hush', 8.5, 'Cooked', true),
('Bruschetta', 'Grilled bread topped with fresh tomatoes, basil, and mozzarella', 10.99, 'appetizer', 'Artisan Pizza Works', 8.5, 'Cooked', true),

-- Main Courses
('Grilled Atlantic Salmon', 'Fresh salmon fillet with lemon herb seasoning, served with roasted vegetables and quinoa', 28.99, 'main', 'Ocean Fresh Seafood', 8.5, 'Cooked', true),
('Beef Tenderloin', 'Prime cut beef tenderloin cooked to perfection, served with garlic mashed potatoes', 34.99, 'main', 'Premium Meats Co.', 8.5, 'Cooked', true),
('Lobster Risotto', 'Creamy arborio rice with fresh lobster, asparagus, and white wine reduction', 32.99, 'main', 'Ocean Fresh Seafood', 8.5, 'Cooked', true),
('Margherita Pizza', 'Wood-fired pizza with fresh mozzarella, basil, and San Marzano tomatoes', 18.99, 'main', 'Artisan Pizza Works', 8.5, 'Cooked', true),
('Chicken Parmesan', 'Breaded chicken breast with marinara sauce and melted mozzarella, served with pasta', 24.99, 'main', 'Lush & Hush', 8.5, 'Cooked', true),
('Fish & Chips', 'Beer-battered cod with crispy fries and mushy peas', 19.99, 'main', 'Pick D', 8.5, 'Cooked', true),

-- Desserts
('Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 8.99, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Cooked', true),
('Tiramisu', 'Traditional Italian dessert with coffee-soaked ladyfingers and mascarpone', 9.99, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Raw', true),
('Crème Brûlée', 'Classic French custard with caramelized sugar crust and fresh berries', 10.99, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Cooked', true),
('Cheesecake', 'New York style cheesecake with berry compote', 9.99, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Raw', true),

-- Beverages
('House Wine (Glass)', 'Selection of premium red or white wine from our curated collection', 8.99, 'beverage', 'Vineyard Select', 10.0, 'Raw', true),
('Craft Beer', 'Local brewery selection featuring seasonal and signature brews', 6.99, 'beverage', 'Local Brew Co.', 10.0, 'Raw', true),
('Fresh Orange Juice', 'Freshly squeezed orange juice from premium Valencia oranges', 4.99, 'beverage', 'Fresh Garden Co.', 8.5, 'Raw', true),
('Artisan Coffee', 'Single-origin coffee beans expertly roasted and brewed to perfection', 3.99, 'beverage', 'Lush & Hush', 8.5, 'Cooked', true),
('Sparkling Water', 'Premium sparkling water with lemon', 2.99, 'beverage', 'Lush & Hush', 8.5, 'Raw', true),
('Signature Cocktail', 'House special cocktail with premium spirits', 12.99, 'beverage', 'Lush & Hush', 10.0, 'Raw', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Database Setup Complete
-- =====================================================

\echo 'PostgreSQL database schema setup complete!'
\echo 'Sample data inserted successfully.'
\echo ''
\echo 'Sample login credentials:'
\echo '  server@hotel.com (password: password123)'
\echo '  kitchen@hotel.com (password: password123)'
\echo '  admin@hotel.com (password: password123)'
\echo ''
\echo 'Database is ready for use!'