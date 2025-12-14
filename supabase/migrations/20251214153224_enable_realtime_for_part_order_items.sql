/*
  # Enable Realtime for part_order_items table
  
  1. Changes
    - Add part_order_items table to supabase_realtime publication
    - This enables real-time subscriptions for order item status updates
  
  2. Purpose
    - Allow servers to receive real-time notifications when kitchen staff
      update the status of order items (pending → preparing → ready → served)
*/

ALTER PUBLICATION supabase_realtime ADD TABLE part_order_items;
