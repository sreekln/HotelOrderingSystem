/*
  # Create Tables Management

  1. New Tables
    - `tables`
      - `id` (uuid, primary key)
      - `table_name` (text, unique) - The name/identifier of the table
      - `created_at` (timestamptz) - When the table was added
      - `updated_at` (timestamptz) - When the table was last updated
      - `deleted_at` (timestamptz, nullable) - Soft delete timestamp
      - `created_by` (uuid, foreign key to auth.users) - Admin who created the table

  2. Security
    - Enable RLS on `tables` table
    - Add policy for authenticated users to read active tables
    - Add policy for admin users to insert, update, and delete tables

  3. Notes
    - Tables are soft-deleted to preserve historical data
    - Only active (non-deleted) tables should be shown to users
*/

-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read active tables
CREATE POLICY "Users can read active tables"
  ON tables
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Policy: Admin users can insert tables
CREATE POLICY "Admins can insert tables"
  ON tables
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admin users can update tables
CREATE POLICY "Admins can update tables"
  ON tables
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

-- Policy: Admin users can delete tables (soft delete)
CREATE POLICY "Admins can delete tables"
  ON tables
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION update_tables_updated_at();