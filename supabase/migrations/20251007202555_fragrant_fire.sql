-- =====================================================
-- Hotel Ordering System - PostgreSQL Database Schema
-- Streamlined for Current Application Functionality
-- =====================================================

-- Drop database if exists and create new one
-- Note: Run this section manually if needed
-- DROP DATABASE IF EXISTS hotel_ordering_system;
-- CREATE DATABASE hotel_ordering_system;

-- Connect to the database
\c hotel_ordering_system;

-- Create application user (optional, for production)
-- CREATE USER hotel_app WITH PASSWORD 'secure_password_here';

-- =====================================================
-- CUSTOM TYPES
-- =====================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('server', 'kitchen', 'admin');

-- Order status enum
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');

-- Payment status enum  
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');

-- Menu item category enum
CREATE TYPE menu_category AS ENUM ('appetizer', 'main', 'dessert', 'beverage');

-- Food category enum
CREATE TYPE food_category AS ENUM ('Raw', 'Cooked');

-- Part order status enum
CREATE TYPE part_order_status AS ENUM ('draft', 'sent_to_kitchen', 'preparing', 'ready', 'served');

-- Table session status enum
CREATE TYPE table_session_status AS ENUM ('active', 'ready_to_close', 'closed');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (extends authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'server',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Companies table (suppliers/vendors)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category TEXT,
    contact_email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Menu items table
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category menu_category NOT NULL,
    company TEXT NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 8.5,
    food_category food_category NOT NULL DEFAULT 'Cooked',
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    special_instructions TEXT,
    table_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Order items table (junction table)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table sessions table (for server workflow)
CREATE TABLE table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status table_session_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Part orders table (individual orders within table sessions)
CREATE TABLE part_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    items JSONB NOT NULL, -- Store items as JSON for flexibility
    special_instructions TEXT,
    status part_order_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    printed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- Menu items indexes
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_available ON menu_items(available);
CREATE INDEX idx_menu_items_company ON menu_items(company);
CREATE INDEX idx_menu_items_deleted_at ON menu_items(deleted_at);

-- Orders indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_table_number ON orders(table_number);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

-- Table sessions indexes
CREATE INDEX idx_table_sessions_table_number ON table_sessions(table_number);
CREATE INDEX idx_table_sessions_status ON table_sessions(status);
CREATE INDEX idx_table_sessions_created_at ON table_sessions(created_at);
CREATE INDEX idx_table_sessions_deleted_at ON table_sessions(deleted_at);

-- Part orders indexes
CREATE INDEX idx_part_orders_table_session_id ON part_orders(table_session_id);
CREATE INDEX idx_part_orders_status ON part_orders(status);
CREATE INDEX idx_part_orders_created_at ON part_orders(created_at);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_table_sessions_updated_at BEFORE UPDATE ON table_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals(order_uuid UUID)
RETURNS TABLE(subtotal DECIMAL, tax_amount DECIMAL, total_amount DECIMAL) AS $$
DECLARE
    item_record RECORD;
    calc_subtotal DECIMAL := 0;
    calc_tax DECIMAL := 0;
    calc_total DECIMAL := 0;
BEGIN
    -- Calculate totals from order items and menu items
    FOR item_record IN
        SELECT oi.quantity, oi.price, mi.tax_rate
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.order_id = order_uuid
    LOOP
        calc_subtotal := calc_subtotal + (item_record.quantity * item_record.price);
        calc_tax := calc_tax + (item_record.quantity * item_record.price * item_record.tax_rate / 100);
    END LOOP;
    
    calc_total := calc_subtotal + calc_tax;
    
    RETURN QUERY SELECT calc_subtotal, calc_tax, calc_total;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Order details view (orders with customer and items)
CREATE VIEW order_details AS
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
                    'price', mi.price,
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

-- Menu items with company info view
CREATE VIEW menu_items_with_company AS
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
('Local Brew Co.', 'Craft Beer', 'orders@localbrew.co.uk', '+44 20 7012 3456');

-- Insert sample users (password is 'password123' hashed with bcrypt)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('server@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'John Smith', 'server'),
('kitchen@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Chef Maria', 'kitchen'),
('admin@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Manager David', 'admin');

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, company, tax_rate, food_category, available) VALUES
-- Appetizers
('Caesar Salad', 'Fresh romaine lettuce with parmesan cheese, croutons, and our signature Caesar dressing', 12.99, 'appetizer', 'Fresh Garden Co.', 8.5, 'Raw', true),
('Buffalo Wings', 'Crispy chicken wings tossed in spicy buffalo sauce, served with blue cheese dip', 14.99, 'appetizer', 'Lush & Hush', 8.5, 'Cooked', true),
('Truffle Arancini', 'Crispy risotto balls filled with truffle and parmesan, served with marinara sauce', 16.99, 'appetizer', 'Lush & Hush', 8.5, 'Cooked', true),
('Bruschetta Trio', 'Three varieties of toasted bread with fresh toppings', 11.99, 'appetizer', 'Artisan Pizza Works', 8.5, 'Cooked', true),

-- Main Courses
('Grilled Atlantic Salmon', 'Fresh salmon fillet with lemon herb seasoning, served with roasted vegetables and quinoa', 28.99, 'main', 'Ocean Fresh Seafood', 8.5, 'Cooked', true),
('Beef Tenderloin', 'Prime cut beef tenderloin cooked to perfection, served with garlic mashed potatoes', 34.99, 'main', 'Premium Meats Co.', 8.5, 'Cooked', true),
('Lobster Risotto', 'Creamy arborio rice with fresh lobster, asparagus, and white wine reduction', 32.99, 'main', 'Ocean Fresh Seafood', 8.5, 'Cooked', true),
('Margherita Pizza', 'Wood-fired pizza with fresh mozzarella, basil, and San Marzano tomatoes', 18.99, 'main', 'Artisan Pizza Works', 8.5, 'Cooked', true),
('Chicken Parmesan', 'Breaded chicken breast with marinara sauce and melted mozzarella', 24.99, 'main', 'Lush & Hush', 8.5, 'Cooked', true),
('Fish and Chips', 'Beer-battered cod with crispy fries and mushy peas', 19.99, 'main', 'Pick D', 8.5, 'Cooked', true),

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
('Sparkling Water', 'Premium sparkling water with lemon', 2.99, 'beverage', 'Lush & Hush', 8.5, 'Raw', true),
('Signature Cocktail', 'House special cocktail with premium spirits', 12.99, 'beverage', 'Lush & Hush', 10.0, 'Raw', true);

-- =====================================================
-- PERMISSIONS (Optional - for production)
-- =====================================================

-- Grant permissions to application user
-- GRANT CONNECT ON DATABASE hotel_ordering_system TO hotel_app;
-- GRANT USAGE ON SCHEMA public TO hotel_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hotel_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hotel_app;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

\echo '✅ Hotel Ordering System PostgreSQL Database Setup Complete!'
\echo ''
\echo '📊 Database Statistics:'
\echo '  - Tables Created: 7'
\echo '  - Sample Companies: 10'
\echo '  - Sample Menu Items: 20'
\echo '  - Sample Users: 3'
\echo ''
\echo '🔐 Sample User Credentials (password: password123):'
\echo '  - server@hotel.com (Server)'
\echo '  - kitchen@hotel.com (Kitchen)'
\echo '  - admin@hotel.com (Admin)'
\echo ''
\echo '🚀 Ready for application integration!'