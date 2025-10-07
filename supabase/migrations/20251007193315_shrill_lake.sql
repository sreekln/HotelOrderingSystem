@@ .. @@
 -- Create users table (extends auth functionality)
 CREATE TABLE IF NOT EXISTS users (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   email TEXT UNIQUE NOT NULL,
+  password_hash TEXT NOT NULL,
   full_name TEXT NOT NULL,
   role TEXT NOT NULL DEFAULT 'server' CHECK (role IN ('server', 'kitchen', 'admin')),
+  last_login TIMESTAMPTZ,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW(),
   deleted_at TIMESTAMPTZ