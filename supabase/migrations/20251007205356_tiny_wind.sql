/*
# Hotel Ordering System - PostgreSQL Database Schema

This script creates a complete PostgreSQL database for the Hotel Ordering System
with all necessary tables, relationships, indexes, and sample data.

## Features:
- Complete table structure with proper relationships
- Custom types (enums) for status fields
- Optimized indexes for performance
- Business logic functions and triggers
- Sample data for immediate testing
- Security with application user permissions

## Usage:
1. Ensure PostgreSQL is running
2. Run: psql -f database/postgresql-schema.sql
3. Or use: ./database/setup-postgresql.sh
*/

-- =====================================================
-- DATABASE AND USER SETUP
-- =====================================================

-- Create database (if running as superuser)
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
-- CUSTOM TYPES (ENUMS)
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
-- CORE TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'server',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Companies table (suppliers/vendors)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    contact_email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
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
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table sessions table (for server workflow)
CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INTEGER NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    status table_session_status NOT NULL DEFAULT 'active',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Part orders table (individual orders within a table session)
CREATE TABLE IF NOT EXISTS part_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
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
CREATE INDEX IF NOT EXISTS idx_table_sessions_deleted_at ON table_sessions(deleted_at);

-- Part orders indexes
CREATE INDEX IF NOT EXISTS idx_part_orders_table_session_id ON part_orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_part_orders_table_number ON part_orders(table_number);
CREATE INDEX IF NOT EXISTS idx_part_orders_status ON part_orders(status);
CREATE INDEX IF NOT EXISTS idx_part_orders_created_at ON part_orders(created_at);

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals(order_id UUID)
RETURNS TABLE(subtotal DECIMAL, tax_amount DECIMAL, total_amount DECIMAL) AS $$
DECLARE
    calc_subtotal DECIMAL := 0;
    calc_tax DECIMAL := 0;
    calc_total DECIMAL := 0;
BEGIN
    SELECT 
        COALESCE(SUM(oi.quantity * oi.price), 0),
        COALESCE(SUM(oi.quantity * oi.price * (mi.tax_rate / 100)), 0)
    INTO calc_subtotal, calc_tax
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE oi.order_id = calculate_order_totals.order_id;
    
    calc_total := calc_subtotal + calc_tax;
    
    RETURN QUERY SELECT calc_subtotal, calc_tax, calc_total;
END;
$$ LANGUAGE plpgsql;

-- Function to update table session total
CREATE OR REPLACE FUNCTION update_table_session_total(session_id UUID)
RETURNS VOID AS $$
DECLARE
    calc_subtotal DECIMAL := 0;
    calc_tax DECIMAL := 0;
    calc_total DECIMAL := 0;
    part_order RECORD;
    item RECORD;
BEGIN
    -- Calculate totals from all part orders in the session
    FOR part_order IN 
        SELECT items FROM part_orders 
        WHERE table_session_id = session_id
    LOOP
        FOR item IN 
            SELECT * FROM jsonb_to_recordset(part_order.items) AS x(
                item jsonb,
                quantity integer
            )
        LOOP
            DECLARE
                item_price DECIMAL;
                item_tax_rate DECIMAL;
                item_subtotal DECIMAL;
                item_tax DECIMAL;
            BEGIN
                item_price := (item.item->>'price')::DECIMAL;
                item_tax_rate := (item.item->>'tax_rate')::DECIMAL;
                item_subtotal := item_price * item.quantity;
                item_tax := item_subtotal * (item_tax_rate / 100);
                
                calc_subtotal := calc_subtotal + item_subtotal;
                calc_tax := calc_tax + item_tax;
            END;
        END LOOP;
    END LOOP;
    
    calc_total := calc_subtotal + calc_tax;
    
    -- Update the table session
    UPDATE table_sessions 
    SET 
        subtotal = calc_subtotal,
        tax_amount = calc_tax,
        total_amount = calc_total,
        updated_at = NOW()
    WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
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

-- Order details view
CREATE OR REPLACE VIEW order_details AS
SELECT 
    o.*,
    u.full_name as customer_name,
    u.email as customer_email,
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
    ) as order_items
FROM orders o
LEFT JOIN users u ON o.customer_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE o.deleted_at IS NULL
GROUP BY o.id, u.full_name, u.email;

-- Menu items with company info view
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
-- SAMPLE DATA
-- =====================================================

-- Insert sample companies
INSERT INTO companies (name, category, contact_email, phone, address) VALUES
('Lush & Hush', 'Hotel Restaurant', 'orders@lushandhush.com', '+44 20 7123 4567', '123 Luxury Lane, London, UK'),
('Pick D', 'Quick Service', 'orders@pickd.com', '+44 20 7234 5678', '456 Fast Food Street, London, UK'),
('SS Food Court', 'Food Court', 'orders@ssfoodcourt.com', '+44 20 7345 6789', '789 Mall Avenue, London, UK'),
('Fresh Garden Co.', 'Produce Supplier', 'fresh@garden.co.uk', '+44 20 7456 7890', '321 Green Valley, London, UK'),
('Ocean Fresh Seafood', 'Seafood Supplier', 'catch@oceanfresh.co.uk', '+44 20 7567 8901', '654 Harbor View, London, UK'),
('Premium Meats Co.', 'Meat Supplier', 'quality@premiummeats.co.uk', '+44 20 7678 9012', '987 Butcher Block, London, UK'),
('Artisan Pizza Works', 'Specialty Food', 'hello@artisanpizza.co.uk', '+44 20 7789 0123', '147 Stone Oven Street, London, UK'),
('Sweet Dreams Bakery', 'Bakery', 'orders@sweetdreams.co.uk', '+44 20 7890 1234', '258 Sugar Lane, London, UK'),
('Vineyard Select', 'Wine & Spirits', 'wine@vineyardselect.co.uk', '+44 20 7901 2345', '369 Grape Street, London, UK'),
('Local Brew Co.', 'Brewery', 'tap@localbrew.co.uk', '+44 20 7012 3456', '741 Hops Avenue, London, UK')
ON CONFLICT (name) DO NOTHING;

-- Insert sample users
INSERT INTO users (email, password_hash, full_name, role) VALUES
('server@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Server User', 'server'),
('kitchen@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Kitchen Staff', 'kitchen'),
('admin@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, company, tax_rate, food_category, available) VALUES
-- Appetizers
('Caesar Salad', 'Fresh romaine lettuce with parmesan cheese, croutons, and caesar dressing', 8.50, 'appetizer', 'Lush & Hush', 8.5, 'Raw', true),
('Buffalo Wings', 'Spicy chicken wings served with blue cheese dip and celery sticks', 12.00, 'appetizer', 'Pick D', 8.5, 'Cooked', true),
('Truffle Arancini', 'Crispy risotto balls filled with truffle and parmesan', 14.00, 'appetizer', 'Lush & Hush', 8.5, 'Cooked', true),
('Bruschetta', 'Toasted bread topped with fresh tomatoes, basil, and mozzarella', 9.50, 'appetizer', 'Artisan Pizza Works', 8.5, 'Cooked', true),

-- Main Courses
('Grilled Salmon', 'Atlantic salmon with lemon herb butter, served with seasonal vegetables', 24.00, 'main', 'Ocean Fresh Seafood', 8.5, 'Cooked', true),
('Beef Tenderloin', 'Prime cut beef tenderloin with red wine jus and roasted potatoes', 32.00, 'main', 'Premium Meats Co.', 8.5, 'Cooked', true),
('Lobster Risotto', 'Creamy arborio rice with fresh lobster and white wine', 28.00, 'main', 'Lush & Hush', 8.5, 'Cooked', true),
('Margherita Pizza', 'Traditional pizza with tomato sauce, mozzarella, and fresh basil', 16.00, 'main', 'Artisan Pizza Works', 8.5, 'Cooked', true),
('Chicken Parmesan', 'Breaded chicken breast with marinara sauce and melted cheese', 22.00, 'main', 'SS Food Court', 8.5, 'Cooked', true),
('Fish & Chips', 'Beer-battered cod with hand-cut chips and mushy peas', 18.00, 'main', 'Pick D', 8.5, 'Cooked', true),

-- Desserts
('Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 9.00, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Cooked', true),
('Tiramisu', 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone', 8.50, 'dessert', 'Lush & Hush', 8.5, 'Raw', true),
('Crème Brûlée', 'Vanilla custard with caramelized sugar crust', 8.00, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Cooked', true),
('New York Cheesecake', 'Rich and creamy cheesecake with berry compote', 7.50, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Raw', true),

-- Beverages
('House Wine', 'Selection of red or white wine by the glass', 8.00, 'beverage', 'Vineyard Select', 20.0, 'Raw', true),
('Craft Beer', 'Local brewery selection on tap', 6.50, 'beverage', 'Local Brew Co.', 20.0, 'Raw', true),
('Fresh Orange Juice', 'Freshly squeezed orange juice', 4.50, 'beverage', 'Fresh Garden Co.', 8.5, 'Raw', true),
('Espresso', 'Double shot of premium espresso', 3.50, 'beverage', 'Lush & Hush', 8.5, 'Cooked', true),
('Sparkling Water', 'Premium sparkling mineral water', 3.00, 'beverage', 'Lush & Hush', 8.5, 'Raw', true),
('Signature Cocktail', 'House special cocktail with premium spirits', 12.00, 'beverage', 'Lush & Hush', 20.0, 'Raw', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant permissions to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hotel_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hotel_app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO hotel_app_user;

-- Grant permissions on views
GRANT SELECT ON order_details TO hotel_app_user;
GRANT SELECT ON menu_items_with_company TO hotel_app_user;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

\echo ''
\echo '=========================================='
\echo 'Hotel Ordering System Database Setup Complete!'
\echo '=========================================='
\echo ''
\echo 'Database: hotel_ordering_system'
\echo 'Tables created: 7'
\echo 'Sample companies: 10'
\echo 'Sample menu items: 20'
\echo 'Sample users: 3'
\echo ''
\echo 'Sample Login Credentials:'
\echo '  server@hotel.com (password: password123)'
\echo '  kitchen@hotel.com (password: password123)'
\echo '  admin@hotel.com (password: password123)'
\echo ''
\echo 'Ready to use!'
\echo '=========================================='