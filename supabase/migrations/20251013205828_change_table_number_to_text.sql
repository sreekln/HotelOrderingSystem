/*
  # Change table_number to TEXT for alphanumeric support

  1. Changes
    - Modify `table_sessions.table_number` from INTEGER to TEXT
    - Modify `part_orders.table_number` from INTEGER to TEXT
    - Modify `orders.table_number` from INTEGER to TEXT
    
  2. Purpose
    - Allow alphanumeric table identifiers (e.g., "A1", "Table 5", "Patio-3")
    - Support table names from the `tables` table
    - Enable dropdown selection of table names in the UI
    
  3. Notes
    - Uses ALTER TABLE to safely modify existing columns
    - Existing numeric values will be automatically cast to text
    - No data loss expected
*/

-- Modify table_sessions table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'table_sessions' AND column_name = 'table_number' AND data_type = 'integer'
  ) THEN
    ALTER TABLE table_sessions ALTER COLUMN table_number TYPE TEXT;
  END IF;
END $$;

-- Modify part_orders table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'part_orders' AND column_name = 'table_number' AND data_type = 'integer'
  ) THEN
    ALTER TABLE part_orders ALTER COLUMN table_number TYPE TEXT;
  END IF;
END $$;

-- Modify orders table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'table_number' AND data_type = 'integer'
  ) THEN
    ALTER TABLE orders ALTER COLUMN table_number TYPE TEXT;
  END IF;
END $$;
