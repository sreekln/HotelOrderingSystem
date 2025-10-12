/*
  # Add tax_rate to menu_items

  1. Changes
    - Add tax_rate column to menu_items table to track tax percentage for each item
    - Default to 20 (UK VAT rate)
  
  2. Notes
    - Using DO block with IF NOT EXISTS check to make migration idempotent
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN tax_rate numeric DEFAULT 20 CHECK (tax_rate >= 0 AND tax_rate <= 100);
  END IF;
END $$;
