-- Seed Data for Hotel Ordering System
-- This file contains sample data for development and testing

-- =============================================
-- COMPANIES DATA
-- =============================================

INSERT INTO companies (name, category, contact_email, phone, address) VALUES
    ('Lush & Hush', 'Hotel Restaurant', 'orders@lushandhush.com', '+44 20 7123 4567', '123 Luxury Lane, London, UK'),
    ('Pick D', 'Quick Service', 'orders@pickd.com', '+44 20 7234 5678', '456 Fast Food Street, London, UK'),
    ('SS Food Court', 'Food Court', 'orders@ssfoodcourt.com', '+44 20 7345 6789', '789 Court Plaza, London, UK'),
    ('Fresh Garden Co.', 'Produce & Salads', 'orders@freshgarden.com', '+44 20 7456 7890', '321 Garden Road, London, UK'),
    ('Ocean Fresh Seafood', 'Seafood & Fish', 'orders@oceanfresh.com', '+44 20 7567 8901', '654 Harbor View, London, UK'),
    ('Premium Meats Co.', 'Meat & Poultry', 'sales@premiummeats.co.uk', '+44 20 7678 9012', '987 Butcher Block, London, UK'),
    ('Artisan Pizza Works', 'Italian & Pizza', 'info@artisanpizza.co.uk', '+44 20 7789 0123', '147 Pizza Plaza, London, UK'),
    ('Sweet Dreams Bakery', 'Desserts & Pastries', 'orders@sweetdreams.com', '+44 20 7890 1234', '258 Baker Street, London, UK'),
    ('Vineyard Select', 'Wine & Spirits', 'sales@vineyardselect.com', '+44 20 7901 2345', '369 Wine Way, London, UK'),
    ('Local Brew Co.', 'Craft Beer', 'orders@localbrew.co.uk', '+44 20 7012 3456', '741 Brewery Lane, London, UK')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- MENU ITEMS DATA
-- =============================================

-- Appetizers
INSERT INTO menu_items (name, description, price, category, company, tax_rate, food_category, available) VALUES
    ('Caesar Salad', 'Fresh romaine lettuce with parmesan cheese, croutons, and our signature Caesar dressing', 12.99, 'appetizer', 'Fresh Garden Co.', 8.5, 'Raw', true),
    ('Buffalo Wings', 'Crispy chicken wings tossed in spicy buffalo sauce, served with blue cheese dip', 14.99, 'appetizer', 'Lush & Hush', 8.5, 'Cooked', true),
    ('Truffle Arancini', 'Crispy risotto balls filled with truffle and parmesan, served with marinara sauce', 16.99, 'appetizer', 'SS Food Court', 8.5, 'Cooked', true),
    ('Bruschetta Trio', 'Three varieties of toasted bread with tomato basil, mushroom, and olive tapenade', 11.99, 'appetizer', 'Artisan Pizza Works', 8.5, 'Cooked', true),
    ('Calamari Rings', 'Golden fried squid rings with spicy marinara and lemon aioli', 13.99, 'appetizer', 'Ocean Fresh Seafood', 8.5, 'Cooked', true),

-- Main Courses
    ('Grilled Atlantic Salmon', 'Fresh salmon fillet with lemon herb seasoning, served with roasted vegetables and quinoa', 28.99, 'main', 'Ocean Fresh Seafood', 8.5, 'Cooked', true),
    ('Beef Tenderloin', 'Prime cut beef tenderloin cooked to perfection, served with garlic mashed potatoes', 34.99, 'main', 'Premium Meats Co.', 8.5, 'Cooked', true),
    ('Lobster Risotto', 'Creamy arborio rice with fresh lobster, asparagus, and white wine reduction', 32.99, 'main', 'Lush & Hush', 8.5, 'Cooked', true),
    ('Margherita Pizza', 'Wood-fired pizza with fresh mozzarella, basil, and San Marzano tomatoes', 18.99, 'main', 'Artisan Pizza Works', 8.5, 'Cooked', true),
    ('Chicken Parmesan', 'Breaded chicken breast with marinara sauce and melted mozzarella, served with pasta', 24.99, 'main', 'Pick D', 8.5, 'Cooked', true),
    ('Vegetarian Buddha Bowl', 'Quinoa, roasted vegetables, avocado, and tahini dressing', 19.99, 'main', 'Fresh Garden Co.', 8.5, 'Raw', true),
    ('Fish and Chips', 'Beer-battered cod with hand-cut fries and mushy peas', 21.99, 'main', 'SS Food Court', 8.5, 'Cooked', true),

-- Desserts
    ('Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 8.99, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Cooked', true),
    ('Tiramisu', 'Traditional Italian dessert with coffee-soaked ladyfingers and mascarpone', 9.99, 'dessert', 'Artisan Pizza Works', 8.5, 'Raw', true),
    ('Crème Brûlée', 'Classic French custard with caramelized sugar crust and fresh berries', 10.99, 'dessert', 'Lush & Hush', 8.5, 'Cooked', true),
    ('New York Cheesecake', 'Rich and creamy cheesecake with graham cracker crust and berry compote', 9.49, 'dessert', 'Sweet Dreams Bakery', 8.5, 'Raw', true),
    ('Gelato Trio', 'Three scoops of artisan gelato: vanilla, chocolate, and seasonal flavor', 7.99, 'dessert', 'SS Food Court', 8.5, 'Cooked', true),

-- Beverages
    ('House Wine (Glass)', 'Selection of premium red or white wine from our curated collection', 8.99, 'beverage', 'Vineyard Select', 10.0, 'Raw', true),
    ('Craft Beer', 'Local brewery selection featuring seasonal and signature brews', 6.99, 'beverage', 'Local Brew Co.', 10.0, 'Raw', true),
    ('Fresh Orange Juice', 'Freshly squeezed orange juice from premium Valencia oranges', 4.99, 'beverage', 'Fresh Garden Co.', 8.5, 'Raw', true),
    ('Artisan Coffee', 'Single-origin coffee beans expertly roasted and brewed to perfection', 3.99, 'beverage', 'Lush & Hush', 8.5, 'Cooked', true),
    ('Sparkling Water', 'Premium sparkling mineral water with lemon or lime', 2.99, 'beverage', 'Lush & Hush', 8.5, 'Raw', true),
    ('Signature Cocktail', 'House special cocktail crafted by our mixologist', 12.99, 'beverage', 'Lush & Hush', 10.0, 'Raw', true),
    ('Herbal Tea Selection', 'Choice of chamomile, peppermint, or green tea', 3.49, 'beverage', 'Lush & Hush', 8.5, 'Cooked', true)
ON CONFLICT DO NOTHING;

-- =============================================
-- SAMPLE USERS (for development/testing)
-- =============================================

-- Note: In production, users are created through Supabase Auth
-- These are for development and testing purposes only
INSERT INTO users (id, email, full_name, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'server@hotel.com', 'John Smith', 'server'),
    ('22222222-2222-2222-2222-222222222222', 'kitchen@hotel.com', 'Chef Maria Rodriguez', 'kitchen'),
    ('33333333-3333-3333-3333-333333333333', 'admin@hotel.com', 'Manager David Wilson', 'admin'),
    ('44444444-4444-4444-4444-444444444444', 'server2@hotel.com', 'Sarah Johnson', 'server'),
    ('55555555-5555-5555-5555-555555555555', 'kitchen2@hotel.com', 'Chef Antonio Rossi', 'kitchen')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- SAMPLE ORDERS (for development/testing)
-- =============================================

-- Sample orders with realistic data
DO $$
DECLARE
    order_id_1 UUID := gen_random_uuid();
    order_id_2 UUID := gen_random_uuid();
    order_id_3 UUID := gen_random_uuid();
    menu_item_1 UUID;
    menu_item_2 UUID;
    menu_item_3 UUID;
    menu_item_4 UUID;
    menu_item_5 UUID;
BEGIN
    -- Get some menu item IDs
    SELECT id INTO menu_item_1 FROM menu_items WHERE name = 'Caesar Salad' LIMIT 1;
    SELECT id INTO menu_item_2 FROM menu_items WHERE name = 'Grilled Atlantic Salmon' LIMIT 1;
    SELECT id INTO menu_item_3 FROM menu_items WHERE name = 'House Wine (Glass)' LIMIT 1;
    SELECT id INTO menu_item_4 FROM menu_items WHERE name = 'Chocolate Lava Cake' LIMIT 1;
    SELECT id INTO menu_item_5 FROM menu_items WHERE name = 'Artisan Coffee' LIMIT 1;

    -- Insert sample orders
    INSERT INTO orders (id, customer_id, subtotal, tax_amount, total_amount, status, payment_status, special_instructions, table_number, created_at) VALUES
        (order_id_1, '11111111-1111-1111-1111-111111111111', 43.97, 3.74, 47.71, 'delivered', 'paid', 'Medium rare, no onions', 12, now() - interval '2 hours'),
        (order_id_2, '44444444-4444-4444-4444-444444444444', 23.98, 2.04, 26.02, 'preparing', 'pending', null, 8, now() - interval '30 minutes'),
        (order_id_3, '11111111-1111-1111-1111-111111111111', 68.96, 5.86, 74.82, 'ready', 'pending', 'Allergic to shellfish', 5, now() - interval '15 minutes');

    -- Insert order items
    INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES
        -- Order 1 items
        (order_id_1, menu_item_1, 1, 12.99),
        (order_id_1, menu_item_2, 1, 28.99),
        (order_id_1, menu_item_5, 2, 3.99),
        
        -- Order 2 items
        (order_id_2, menu_item_3, 2, 8.99),
        (order_id_2, menu_item_4, 1, 8.99),
        
        -- Order 3 items
        (order_id_3, menu_item_2, 2, 28.99),
        (order_id_3, menu_item_4, 1, 8.99),
        (order_id_3, menu_item_5, 1, 3.99);
END $$;

-- =============================================
-- SAMPLE TABLE SESSIONS (for development/testing)
-- =============================================

DO $$
DECLARE
    session_id_1 UUID := gen_random_uuid();
    session_id_2 UUID := gen_random_uuid();
BEGIN
    -- Insert sample table sessions
    INSERT INTO table_sessions (id, table_number, customer_name, total_amount, status, payment_status, created_at) VALUES
        (session_id_1, 15, 'Smith Family', 85.47, 'closed', 'paid', now() - interval '3 hours'),
        (session_id_2, 7, 'Johnson Party', 42.50, 'active', 'pending', now() - interval '45 minutes');

    -- Insert sample part orders
    INSERT INTO part_orders (table_session_id, items, special_instructions, status, created_at, printed_at) VALUES
        (session_id_1, '[{"item":{"id":"menu-1","name":"Caesar Salad","price":12.99},"quantity":2},{"item":{"id":"menu-2","name":"Buffalo Wings","price":14.99},"quantity":1}]', 'Extra dressing on the side', 'served', now() - interval '3 hours', now() - interval '2 hours 55 minutes'),
        (session_id_1, '[{"item":{"id":"menu-4","name":"Grilled Atlantic Salmon","price":28.99},"quantity":1},{"item":{"id":"menu-8","name":"Chocolate Lava Cake","price":8.99},"quantity":2}]', null, 'served', now() - interval '2 hours 30 minutes', now() - interval '2 hours 25 minutes'),
        (session_id_2, '[{"item":{"id":"menu-6","name":"Margherita Pizza","price":18.99},"quantity":1},{"item":{"id":"menu-10","name":"Craft Beer","price":6.99},"quantity":2}]', 'Extra cheese on pizza', 'preparing', now() - interval '45 minutes', now() - interval '40 minutes');
END $$;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Sample data inserted successfully!';
    RAISE NOTICE 'Companies: % records', (SELECT COUNT(*) FROM companies);
    RAISE NOTICE 'Menu Items: % records', (SELECT COUNT(*) FROM menu_items);
    RAISE NOTICE 'Users: % records', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Orders: % records', (SELECT COUNT(*) FROM orders);
    RAISE NOTICE 'Order Items: % records', (SELECT COUNT(*) FROM order_items);
    RAISE NOTICE 'Table Sessions: % records', (SELECT COUNT(*) FROM table_sessions);
    RAISE NOTICE 'Part Orders: % records', (SELECT COUNT(*) FROM part_orders);
END $$;