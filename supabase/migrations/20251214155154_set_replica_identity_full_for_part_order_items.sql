/*
  # Set replica identity to FULL for part_order_items
  
  1. Changes
    - Set replica identity to FULL for part_order_items table
    - This enables Supabase Realtime to send both old and new values in UPDATE events
  
  2. Purpose
    - Allow notification system to detect status changes more reliably
    - Include complete row data in realtime events for better debugging
*/

ALTER TABLE part_order_items REPLICA IDENTITY FULL;
