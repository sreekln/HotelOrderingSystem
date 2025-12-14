/*
  # Fix Users Insert Policy for Signup
  
  1. Problem
    - New users cannot insert their profile during signup
    - The INSERT policy requires 'authenticated' role but signup happens before full authentication
    - This causes "new row violates row-level security policy" error
  
  2. Solution
    - Allow users to insert their profile if auth.uid() matches the id being inserted
    - This works during signup because Supabase auth creates the user first
    - The auth.uid() function returns the ID even during the signup flow
    - Add explicit check to ensure id matches auth.uid() for security
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their profile" ON users;

-- Create new insert policy that works during signup
-- This allows the profile to be created immediately after auth user creation
CREATE POLICY "Users can insert their profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Note: We removed the "TO authenticated" clause to allow the insert during signup
-- Security is maintained by checking auth.uid() = id
