/*
  # Add Discount Field to Part Order Items

  1. Changes
    - Add `discount_percent` column to `part_order_items` table
      - Type: numeric (percentage 0-100)
      - Default: 0
      - Constraint: Must be between 0 and 100
    - Add `discount_amount` column to `part_order_items` table
      - Type: numeric (actual discount amount in currency)
      - Default: 0
      - Constraint: Must be >= 0
  
  2. Purpose
    - Enable individual discounts on order items
    - Support flexible pricing for closed table sessions
    - Allow manual price adjustments during payment
*/

-- Add discount_percent column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'part_order_items' AND column_name = 'discount_percent'
  ) THEN
    ALTER TABLE part_order_items ADD COLUMN discount_percent numeric DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);
  END IF;
END $$;

-- Add discount_amount column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'part_order_items' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE part_order_items ADD COLUMN discount_amount numeric DEFAULT 0 CHECK (discount_amount >= 0);
  END IF;
END $$;