/*
  # Fix Users Table for Supabase Auth Integration

  1. Changes
    - Drop existing users table
    - Recreate users table with proper auth.users reference
    - Recreate all foreign key constraints
    - Reapply RLS policies
    - Update triggers

  2. Security
    - Maintain all existing RLS policies
    - Users can only manage their own data
    - Admins have elevated permissions
*/

-- Drop dependent foreign keys first
ALTER TABLE table_sessions DROP CONSTRAINT IF EXISTS table_sessions_server_id_fkey;
ALTER TABLE part_orders DROP CONSTRAINT IF EXISTS part_orders_server_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Drop existing users table
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users table with proper auth reference
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('server', 'kitchen', 'admin', 'customer')),
    password_hash TEXT,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert their profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Recreate trigger for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recreate foreign key constraints
ALTER TABLE table_sessions 
  ADD CONSTRAINT table_sessions_server_id_fkey 
  FOREIGN KEY (server_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE part_orders 
  ADD CONSTRAINT part_orders_server_id_fkey 
  FOREIGN KEY (server_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE orders 
  ADD CONSTRAINT orders_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
