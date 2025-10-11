# Supabase Migration Guide

This guide explains how to migrate the Hotel Ordering System from Azure SQL Server to Supabase PostgreSQL.

## Overview

The Hotel Ordering System can run on either:
- **Azure SQL Server / SQL Server** (default configuration)
- **Supabase PostgreSQL** (alternative configuration)

This guide covers the Supabase PostgreSQL option.

## Why Supabase?

Supabase offers several advantages:
- **Managed PostgreSQL**: No server management required
- **Built-in Authentication**: Integrated user auth system
- **Row Level Security**: Database-level security policies
- **Real-time Subscriptions**: Live data updates
- **Auto-generated APIs**: REST and GraphQL endpoints
- **Free Tier**: Generous free tier for development and small projects

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js 18 or higher
- npm or yarn

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: hotel-ordering-system
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
4. Click "Create new project"
5. Wait for project to finish provisioning (2-3 minutes)

## Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `database/supabase-schema.sql`
4. Paste into the SQL Editor
5. Click "Run" or press Ctrl+Enter
6. Verify success: You should see "Success. No rows returned"

## Step 3: Load Sample Data

1. In the SQL Editor, create another new query
2. Copy the entire contents of `database/supabase-data.sql`
3. Paste into the SQL Editor
4. Click "Run"
5. Verify: Go to **Table Editor** and check that tables have data

## Step 4: Get Supabase Credentials

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** section
3. Copy the following:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon public** key (under "Project API keys")

## Step 5: Configure Environment Variables

Update your `.env` file:

```env
# Comment out or remove SQL Server config
# DB_SERVER=...
# DB_NAME=...
# DB_USER=...
# DB_PASSWORD=...

# Add Supabase configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Keep these
VITE_API_URL=http://localhost:3001/api
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Step 6: Update Backend Connection (Optional)

The current backend uses SQL Server with Express.js. To use Supabase directly:

### Option A: Keep Express.js Backend (Recommended for migration)

1. Install Supabase client in server:
```bash
cd server
npm install @supabase/supabase-js
```

2. Create `server/config/supabase.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
```

3. Update models to use Supabase client instead of mssql

### Option B: Use Supabase Client Directly in Frontend

For simpler applications, you can use Supabase client directly in the frontend:

1. Install in frontend:
```bash
npm install @supabase/supabase-js
```

2. Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

3. Use in components:
```typescript
import { supabase } from '@/lib/supabase';

// Example: Fetch menu items
const { data, error } = await supabase
  .from('menu_items')
  .select('*')
  .eq('available', true);
```

## Database Schema Differences

### Data Type Conversions

| SQL Server | PostgreSQL |
|------------|------------|
| UNIQUEIDENTIFIER | UUID |
| NVARCHAR | TEXT |
| DATETIME2 | TIMESTAMPTZ |
| BIT | BOOLEAN |
| DECIMAL | DECIMAL |

### Function Conversions

| SQL Server | PostgreSQL |
|------------|------------|
| NEWID() | uuid_generate_v4() |
| GETDATE() | now() |
| @@VERSION | version() |
| DB_NAME() | current_database() |

### Trigger Syntax

**SQL Server:**
```sql
CREATE TRIGGER trg_users_updated_at
ON users
AFTER UPDATE
AS
BEGIN
    UPDATE users SET updated_at = GETDATE()
    FROM users u INNER JOIN inserted i ON u.id = i.id;
END;
```

**PostgreSQL:**
```sql
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Row Level Security (RLS)

Supabase uses PostgreSQL's Row Level Security for data protection:

### Example: Users Table

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);
```

### Key RLS Concepts

- `auth.uid()` - Returns the authenticated user's ID from Supabase Auth
- `TO authenticated` - Policy applies to authenticated users only
- `USING` - Condition for SELECT, UPDATE, DELETE operations
- `WITH CHECK` - Condition for INSERT, UPDATE operations

## Authentication Integration

### Current System
The application currently uses JWT tokens with bcrypt password hashing.

### Supabase Auth Integration

To use Supabase's built-in authentication:

1. **Sign Up:**
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'John Doe',
      role: 'customer'
    }
  }
});
```

2. **Sign In:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

3. **Get Current User:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

4. **Sign Out:**
```typescript
const { error } = await supabase.auth.signOut();
```

## Testing the Migration

### 1. Verify Database Connection

```sql
-- Run in Supabase SQL Editor
SELECT version();
SELECT current_database();
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM menu_items;
SELECT COUNT(*) FROM companies;
```

### 2. Test RLS Policies

```sql
-- This should return only authenticated user's data
SELECT * FROM users WHERE id = auth.uid();
```

### 3. Test Application

1. Start the application:
```bash
npm run dev:full
```

2. Test login with sample credentials:
   - admin@hotel.com / password123
   - server@hotel.com / password123
   - kitchen@hotel.com / password123

3. Verify functionality:
   - View menu items
   - Create orders
   - Update order status
   - Manage table sessions

## Troubleshooting

### Issue: "relation does not exist"

**Solution:** Make sure you ran both schema and data SQL files in order.

### Issue: "permission denied for table"

**Solution:** Check RLS policies. You may need to add policies for your use case.

### Issue: "auth.uid() is null"

**Solution:** Ensure user is authenticated. RLS policies depend on `auth.uid()`.

### Issue: Connection refused

**Solution:**
- Check `VITE_SUPABASE_URL` is correct
- Verify `VITE_SUPABASE_ANON_KEY` is the anon public key (not service key)
- Check project is not paused in Supabase dashboard

### Issue: "Invalid API key"

**Solution:**
- Copy the "anon public" key from API settings
- Do not use the service_role key in frontend code
- Check for typos in the key

## Performance Optimization

### Indexes

The schema includes indexes on:
- Email lookups
- Foreign key relationships
- Status fields for filtering
- Created_at for sorting

### Query Optimization

Use Supabase's query builder efficiently:

```typescript
// Good: Select only needed columns
const { data } = await supabase
  .from('orders')
  .select('id, status, total_amount, created_at')
  .eq('user_id', userId);

// Bad: Select all columns when not needed
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', userId);
```

### Connection Pooling

Supabase automatically handles connection pooling. No configuration needed.

## Backup and Recovery

### Automated Backups

Supabase provides:
- Daily backups (retained for 7 days on free tier)
- Point-in-time recovery on paid plans

### Manual Backup

Export data via Supabase dashboard:
1. Go to **Database** → **Backups**
2. Click "Create backup"
3. Download when ready

### Import Backup

```bash
# Using psql (requires direct database access on paid plan)
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" < backup.sql
```

## Migration Checklist

- [ ] Create Supabase project
- [ ] Run schema SQL file
- [ ] Run data SQL file
- [ ] Copy Supabase credentials
- [ ] Update .env file
- [ ] Test database connection
- [ ] Verify RLS policies work
- [ ] Test user authentication
- [ ] Test all CRUD operations
- [ ] Test role-based permissions
- [ ] Update deployment configuration
- [ ] Set up production environment variables
- [ ] Configure backup strategy
- [ ] Update monitoring and logging

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

## Support

For issues specific to this migration:
1. Check this guide's troubleshooting section
2. Review Supabase documentation
3. Check application logs
4. Verify RLS policies in Supabase dashboard
5. Test queries in SQL Editor

## Next Steps

After successful migration:
1. Implement real-time features using Supabase subscriptions
2. Add Supabase Storage for menu item images
3. Set up Supabase Edge Functions for complex business logic
4. Configure Supabase Auth for OAuth providers
5. Set up monitoring and alerts
6. Plan for production deployment
