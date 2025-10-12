/*
  # Add customer_name to table_sessions

  1. Changes
    - Add customer_name column to table_sessions table to track customer information
  
  2. Notes
    - Using DO block with IF NOT EXISTS check to make migration idempotent
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'table_sessions' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE table_sessions ADD COLUMN customer_name text;
  END IF;
END $$;
