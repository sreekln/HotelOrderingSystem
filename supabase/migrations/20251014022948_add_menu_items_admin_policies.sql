/*
  # Add Admin RLS Policies for Menu Items

  1. Changes
    - Add INSERT policy for admin users to create menu items
    - Add UPDATE policy for admin users to modify menu items
    - Add DELETE policy for admin users to soft-delete menu items
    
  2. Security
    - Policies check that the user's role is 'admin'
    - Uses auth.uid() to verify authenticated users
    - Joins with users table to check role
    
  3. Notes
    - Admin users can fully manage menu items
    - Non-admin users can only view (existing SELECT policy)
*/

-- Policy for admin users to insert new menu items
CREATE POLICY "Admin users can insert menu items"
  ON menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy for admin users to update menu items
CREATE POLICY "Admin users can update menu items"
  ON menu_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy for admin users to delete menu items (soft delete via update)
CREATE POLICY "Admin users can delete menu items"
  ON menu_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
