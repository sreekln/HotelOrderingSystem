/*
  # Remove customer_name from table_sessions

  1. Changes
    - Remove customer_name column from table_sessions table
    - This column is no longer needed as we're defaulting to 'Guest' in the application

  2. Notes
    - Using DO block with IF EXISTS check to make migration idempotent
    - Safe operation that doesn't affect existing data in other columns
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'table_sessions' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE table_sessions DROP COLUMN customer_name;
  END IF;
END $$;
