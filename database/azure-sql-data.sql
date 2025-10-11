-- =====================================================
-- Hotel Ordering System - Sample Data for Azure SQL Server
-- Inserts sample users, companies, and menu items
-- =====================================================

-- =====================================================
-- INSERT SAMPLE COMPANIES
-- =====================================================
INSERT INTO companies (name, category, contact_email, phone, address)
VALUES
    ('Hotel Restaurant', 'Main Dining', 'restaurant@hotel.com', '555-0101', '123 Hotel Ave'),
    ('Room Service', 'In-Room Dining', 'roomservice@hotel.com', '555-0102', '123 Hotel Ave'),
    ('Pool Bar', 'Bar & Lounge', 'poolbar@hotel.com', '555-0103', '123 Hotel Ave');
GO

-- =====================================================
-- INSERT SAMPLE USERS
-- Note: Password is 'password123' hashed with bcrypt
-- Hash: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7i9S4xBrqy
-- =====================================================
INSERT INTO users (email, password_hash, full_name, role)
VALUES
    ('admin@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7i9S4xBrqy', 'Admin User', 'admin'),
    ('server@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7i9S4xBrqy', 'Server User', 'server'),
    ('kitchen@hotel.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7i9S4xBrqy', 'Kitchen User', 'kitchen');
GO

-- =====================================================
-- INSERT SAMPLE MENU ITEMS
-- =====================================================

-- Appetizers
INSERT INTO menu_items (name, description, price, category, company, food_category, available, image_url)
VALUES
    ('Caesar Salad', 'Fresh romaine lettuce with parmesan and croutons', 12.99, 'appetizer', 'Hotel Restaurant', 'Raw', 1, 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg'),
    ('Bruschetta', 'Toasted bread with tomatoes, garlic, and basil', 10.99, 'appetizer', 'Hotel Restaurant', 'Cooked', 1, 'https://images.pexels.com/photos/1647163/pexels-photo-1647163.jpeg'),
    ('Soup of the Day', 'Chef''s daily soup creation', 8.99, 'appetizer', 'Hotel Restaurant', 'Cooked', 1, 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg');
GO

-- Main Courses
INSERT INTO menu_items (name, description, price, category, company, food_category, available, image_url)
VALUES
    ('Grilled Salmon', 'Atlantic salmon with seasonal vegetables', 28.99, 'main', 'Hotel Restaurant', 'Cooked', 1, 'https://images.pexels.com/photos/1516415/pexels-photo-1516415.jpeg'),
    ('Ribeye Steak', '12oz USDA Prime ribeye with mashed potatoes', 42.99, 'main', 'Hotel Restaurant', 'Cooked', 1, 'https://images.pexels.com/photos/769289/pexels-photo-769289.jpeg'),
    ('Chicken Parmesan', 'Breaded chicken with marinara and mozzarella', 22.99, 'main', 'Hotel Restaurant', 'Cooked', 1, 'https://images.pexels.com/photos/106343/pexels-photo-106343.jpeg'),
    ('Vegetarian Pasta', 'Penne with roasted vegetables and olive oil', 18.99, 'main', 'Hotel Restaurant', 'Cooked', 1, 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg');
GO

-- Desserts
INSERT INTO menu_items (name, description, price, category, company, food_category, available, image_url)
VALUES
    ('Chocolate Lava Cake', 'Warm chocolate cake with vanilla ice cream', 9.99, 'dessert', 'Hotel Restaurant', 'Cooked', 1, 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg'),
    ('Tiramisu', 'Classic Italian coffee-flavored dessert', 8.99, 'dessert', 'Hotel Restaurant', 'Raw', 1, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg'),
    ('Cheesecake', 'New York style cheesecake with berry compote', 8.99, 'dessert', 'Hotel Restaurant', 'Raw', 1, 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg');
GO

-- Beverages
INSERT INTO menu_items (name, description, price, category, company, food_category, available, image_url)
VALUES
    ('Coca Cola', 'Classic soft drink', 3.99, 'beverage', 'Pool Bar', 'Raw', 1, 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg'),
    ('Orange Juice', 'Freshly squeezed orange juice', 5.99, 'beverage', 'Room Service', 'Raw', 1, 'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg'),
    ('Coffee', 'Freshly brewed coffee', 3.99, 'beverage', 'Room Service', 'Cooked', 1, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg'),
    ('Red Wine', 'House red wine', 12.99, 'beverage', 'Hotel Restaurant', 'Raw', 1, 'https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg'),
    ('Beer', 'Draft beer selection', 6.99, 'beverage', 'Pool Bar', 'Raw', 1, 'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg');
GO

PRINT 'Sample data inserted successfully!';
PRINT 'Default login credentials:';
PRINT '  admin@hotel.com - password123';
PRINT '  server@hotel.com - password123';
PRINT '  kitchen@hotel.com - password123';
