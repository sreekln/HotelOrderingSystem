/*
  # Update Menu Item Categories

  1. Changes
    - Drop existing CHECK constraint
    - Migrate existing category data:
      - 'appetizer' → 'daytime'
      - 'main' → 'dinner'
      - 'dessert' → 'dessert' (no change)
      - 'beverage' → 'drinks'
    - Add new CHECK constraint with updated categories
    
  2. Purpose
    - Align category names with business requirements
    - Better organize menu items by meal period and type
    
  3. Notes
    - Order matters: drop constraint first, update data, then add new constraint
    - Preserves all existing menu items with updated categories
*/

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;

-- Step 2: Update existing data to new category names
UPDATE menu_items
SET category = CASE
  WHEN category = 'appetizer' THEN 'daytime'
  WHEN category = 'main' THEN 'dinner'
  WHEN category = 'beverage' THEN 'drinks'
  ELSE category
END
WHERE category IN ('appetizer', 'main', 'beverage');

-- Step 3: Add the new CHECK constraint with updated categories
ALTER TABLE menu_items
ADD CONSTRAINT menu_items_category_check
CHECK (category IN ('daytime', 'dinner', 'dessert', 'coffeetea', 'drinks'));
