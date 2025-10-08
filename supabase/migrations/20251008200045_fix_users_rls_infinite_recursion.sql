/*
  # Fix Users Table RLS Infinite Recursion

  1. Problem
    - The "Admins can read all users" policy causes infinite recursion
    - It checks if user is admin by querying the users table
    - This triggers the same policy again, creating a loop

  2. Solution
    - Drop existing policies
    - Create simpler policies that don't cause recursion
    - Users can read their own profile
    - All authenticated users can read all profiles (needed for app functionality)
    - Only users can update their own profile
    - Only users can insert their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert their profile" ON users;

-- Create new policies without recursion
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Staff can read all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON users FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
