-- =====================================================
-- Hotel Ordering System - Azure SQL Server Database Schema
-- Microsoft SQL Server (Azure SQL Database)
-- =====================================================

-- Drop existing tables if they exist (in correct order due to foreign keys)
IF OBJECT_ID('part_order_items', 'U') IS NOT NULL DROP TABLE part_order_items;
IF OBJECT_ID('part_orders', 'U') IS NOT NULL DROP TABLE part_orders;
IF OBJECT_ID('order_items', 'U') IS NOT NULL DROP TABLE order_items;
IF OBJECT_ID('orders', 'U') IS NOT NULL DROP TABLE orders;
IF OBJECT_ID('table_sessions', 'U') IS NOT NULL DROP TABLE table_sessions;
IF OBJECT_ID('menu_items', 'U') IS NOT NULL DROP TABLE menu_items;
IF OBJECT_ID('companies', 'U') IS NOT NULL DROP TABLE companies;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
GO

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL DEFAULT 'customer' CHECK (role IN ('server', 'kitchen', 'admin', 'customer')),
    last_login DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
GO

-- =====================================================
-- COMPANIES TABLE
-- =====================================================
CREATE TABLE companies (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL UNIQUE,
    category NVARCHAR(255),
    contact_email NVARCHAR(255),
    phone NVARCHAR(50),
    address NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL
);

CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_category ON companies(category);
GO

-- =====================================================
-- MENU ITEMS TABLE
-- =====================================================
CREATE TABLE menu_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category NVARCHAR(50) NOT NULL CHECK (category IN ('appetizer', 'main', 'dessert', 'beverage')),
    company NVARCHAR(255) NOT NULL,
    food_category NVARCHAR(50) CHECK (food_category IN ('Raw', 'Cooked')),
    available BIT DEFAULT 1,
    image_url NVARCHAR(1000),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL
);

CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_company ON menu_items(company);
CREATE INDEX idx_menu_items_available ON menu_items(available);
GO

-- =====================================================
-- TABLE SESSIONS TABLE
-- =====================================================
CREATE TABLE table_sessions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    table_number INT NOT NULL,
    server_id UNIQUEIDENTIFIER,
    status NVARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ready_to_close', 'closed')),
    payment_status NVARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    opened_at DATETIME2 DEFAULT GETDATE(),
    closed_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (server_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create unique index for active table sessions (only one active session per table)
CREATE UNIQUE INDEX idx_active_table_sessions
    ON table_sessions(table_number)
    WHERE status = 'active';

CREATE INDEX idx_table_sessions_table_number ON table_sessions(table_number);
CREATE INDEX idx_table_sessions_status ON table_sessions(status);
CREATE INDEX idx_table_sessions_server_id ON table_sessions(server_id);
GO

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER,
    table_number INT,
    status NVARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
    payment_status NVARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    notes NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_table_number ON orders(table_number);
GO

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE order_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL,
    menu_item_id UNIQUEIDENTIFIER NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    special_instructions NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);
GO

-- =====================================================
-- PART ORDERS TABLE
-- =====================================================
CREATE TABLE part_orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    table_session_id UNIQUEIDENTIFIER NOT NULL,
    server_id UNIQUEIDENTIFIER,
    table_number INT NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent_to_kitchen', 'preparing', 'ready', 'served')),
    printed_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (table_session_id) REFERENCES table_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (server_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_part_orders_table_session_id ON part_orders(table_session_id);
CREATE INDEX idx_part_orders_status ON part_orders(status);
CREATE INDEX idx_part_orders_table_number ON part_orders(table_number);
CREATE INDEX idx_part_orders_server_id ON part_orders(server_id);
GO

-- =====================================================
-- PART ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE part_order_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    part_order_id UNIQUEIDENTIFIER NOT NULL,
    menu_item_id UNIQUEIDENTIFIER NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    special_instructions NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (part_order_id) REFERENCES part_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE INDEX idx_part_order_items_part_order_id ON part_order_items(part_order_id);
CREATE INDEX idx_part_order_items_menu_item_id ON part_order_items(menu_item_id);
GO

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Users update trigger
CREATE TRIGGER trg_users_updated_at
ON users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE users
    SET updated_at = GETDATE()
    FROM users u
    INNER JOIN inserted i ON u.id = i.id;
END;
GO

-- Companies update trigger
CREATE TRIGGER trg_companies_updated_at
ON companies
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE companies
    SET updated_at = GETDATE()
    FROM companies c
    INNER JOIN inserted i ON c.id = i.id;
END;
GO

-- Menu items update trigger
CREATE TRIGGER trg_menu_items_updated_at
ON menu_items
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE menu_items
    SET updated_at = GETDATE()
    FROM menu_items m
    INNER JOIN inserted i ON m.id = i.id;
END;
GO

-- Table sessions update trigger
CREATE TRIGGER trg_table_sessions_updated_at
ON table_sessions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE table_sessions
    SET updated_at = GETDATE()
    FROM table_sessions t
    INNER JOIN inserted i ON t.id = i.id;
END;
GO

-- Orders update trigger
CREATE TRIGGER trg_orders_updated_at
ON orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE orders
    SET updated_at = GETDATE()
    FROM orders o
    INNER JOIN inserted i ON o.id = i.id;
END;
GO

-- Part orders update trigger
CREATE TRIGGER trg_part_orders_updated_at
ON part_orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE part_orders
    SET updated_at = GETDATE()
    FROM part_orders p
    INNER JOIN inserted i ON p.id = i.id;
END;
GO

PRINT 'Hotel Ordering System schema created successfully!';
