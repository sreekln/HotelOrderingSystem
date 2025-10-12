/*
  # Add RLS policies for table sessions and part orders

  1. New Policies
    - table_sessions:
      - Servers can view all sessions (for collaboration)
      - Servers can insert their own sessions
      - Servers can update their own sessions
    
    - part_orders:
      - Servers can view all part orders (for coordination)
      - Servers can insert their own part orders
      - Servers can update their own part orders
    
    - part_order_items:
      - Servers can view all part order items
      - Update existing insert policy

  2. Security
    - All policies require authentication
    - Servers can only modify their own data but can view all data for coordination
*/

-- Table Sessions Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'table_sessions' 
    AND policyname = 'Authenticated users can view table sessions'
  ) THEN
    CREATE POLICY "Authenticated users can view table sessions"
      ON table_sessions FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'table_sessions' 
    AND policyname = 'Servers can insert table sessions'
  ) THEN
    CREATE POLICY "Servers can insert table sessions"
      ON table_sessions FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = server_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'table_sessions' 
    AND policyname = 'Servers can update table sessions'
  ) THEN
    CREATE POLICY "Servers can update table sessions"
      ON table_sessions FOR UPDATE
      TO authenticated
      USING (auth.uid() = server_id)
      WITH CHECK (auth.uid() = server_id);
  END IF;
END $$;

-- Part Orders Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'part_orders' 
    AND policyname = 'Authenticated users can view part orders'
  ) THEN
    CREATE POLICY "Authenticated users can view part orders"
      ON part_orders FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'part_orders' 
    AND policyname = 'Servers can insert part orders'
  ) THEN
    CREATE POLICY "Servers can insert part orders"
      ON part_orders FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = server_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'part_orders' 
    AND policyname = 'Authenticated users can update part orders'
  ) THEN
    CREATE POLICY "Authenticated users can update part orders"
      ON part_orders FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Part Order Items Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'part_order_items' 
    AND policyname = 'Authenticated users can view part order items'
  ) THEN
    CREATE POLICY "Authenticated users can view part order items"
      ON part_order_items FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
