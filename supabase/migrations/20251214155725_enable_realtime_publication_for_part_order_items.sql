/*
  # Enable Realtime for part_order_items table
  
  1. Changes
    - Add part_order_items table to the realtime publication
    - This allows clients to subscribe to real-time updates for this table
  
  2. Purpose
    - Enable notification system to receive live updates when order item statuses change
    - Required for kitchen-to-server notifications
*/

-- Add table to realtime publication
-- Use DO block to handle case where table is already in publication
DO $$
BEGIN
  -- Try to add the table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE part_order_items;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table is already in publication, do nothing
    NULL;
END $$;
