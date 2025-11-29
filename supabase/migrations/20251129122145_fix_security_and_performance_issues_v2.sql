/*
  # Fix Security and Performance Issues

  This migration addresses all security warnings and performance issues:

  ## Changes Made

  ### 1. Missing Foreign Key Indexes
  - Add index on `order_items.menu_item_id`
  - Add index on `part_order_items.menu_item_id`
  - Add index on `table_sessions.server_id`

  ### 2. RLS Policy Optimization
  - Replace all `auth.uid()` with `(SELECT auth.uid())` to prevent re-evaluation per row
  - This significantly improves query performance at scale

  ### 3. Function Search Path
  - Set explicit search_path on `update_updated_at_column` function

  ### 4. Consolidate Permissive Policies
  - Merge multiple SELECT policies on users table into single policy

  ## Performance Impact
  - Foreign key indexes improve JOIN performance
  - Optimized RLS policies reduce CPU overhead
  - Secure function search path prevents security vulnerabilities
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_part_order_items_menu_item_id ON part_order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_server_id ON table_sessions(server_id);

-- Drop and recreate policies for users table (consolidated SELECT policies)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON users;
  DROP POLICY IF EXISTS "Admins can view all users" ON users;
  DROP POLICY IF EXISTS "Users can update own profile" ON users;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view profiles"
  ON users FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Drop and recreate policies for companies table
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
  DROP POLICY IF EXISTS "Admins can update companies" ON companies;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
    )
  );

-- Drop and recreate policies for menu_items table
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view available menu items" ON menu_items;
  DROP POLICY IF EXISTS "Admins can insert menu items" ON menu_items;
  DROP POLICY IF EXISTS "Admins can update menu items" ON menu_items;
  DROP POLICY IF EXISTS "Admins can delete menu items" ON menu_items;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Anyone can view available menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (
    available = true OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'kitchen', 'server')
    )
  );

CREATE POLICY "Admins can insert menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
    )
  );

-- Drop and recreate policies for table_sessions table
DO $$
BEGIN
  DROP POLICY IF EXISTS "Servers and admins can view table sessions" ON table_sessions;
  DROP POLICY IF EXISTS "Servers can create table sessions" ON table_sessions;
  DROP POLICY IF EXISTS "Servers and admins can update table sessions" ON table_sessions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Staff can view table sessions"
  ON table_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'admin', 'kitchen')
    )
  );

CREATE POLICY "Servers can create table sessions"
  ON table_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'admin')
    )
  );

CREATE POLICY "Staff can update table sessions"
  ON table_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'admin')
    )
  );

-- Drop and recreate policies for part_orders table
DO $$
BEGIN
  DROP POLICY IF EXISTS "Staff can view part orders" ON part_orders;
  DROP POLICY IF EXISTS "Servers can create part orders" ON part_orders;
  DROP POLICY IF EXISTS "Staff can update part orders" ON part_orders;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Staff can view part orders"
  ON part_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Servers can create part orders"
  ON part_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'admin')
    )
  );

CREATE POLICY "Staff can update part orders"
  ON part_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

-- Drop and recreate policies for part_order_items table
DO $$
BEGIN
  DROP POLICY IF EXISTS "Staff can view part order items" ON part_order_items;
  DROP POLICY IF EXISTS "Servers can create part order items" ON part_order_items;
  DROP POLICY IF EXISTS "Servers can update part order items" ON part_order_items;
  DROP POLICY IF EXISTS "Servers can delete part order items" ON part_order_items;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Staff can view part order items"
  ON part_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Servers can create part order items"
  ON part_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'admin')
    )
  );

CREATE POLICY "Servers can update part order items"
  ON part_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'admin')
    )
  );

CREATE POLICY "Servers can delete part order items"
  ON part_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('server', 'admin')
    )
  );

-- Drop and recreate policies for orders table
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own orders" ON orders;
  DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
  DROP POLICY IF EXISTS "Staff can update orders" ON orders;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('kitchen', 'admin', 'server')
    )
  );

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (SELECT auth.uid()));

CREATE POLICY "Staff can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('kitchen', 'admin', 'server')
    )
  )
  WITH CHECK (
    customer_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('kitchen', 'admin', 'server')
    )
  );

-- Drop and recreate policies for order_items table
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
  DROP POLICY IF EXISTS "Authenticated users can create order items" ON order_items;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.customer_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = (SELECT auth.uid())
          AND users.role IN ('kitchen', 'admin', 'server')
        )
      )
    )
  );

CREATE POLICY "Authenticated users can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = (SELECT auth.uid())
    )
  );

-- Fix function search path for security
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
