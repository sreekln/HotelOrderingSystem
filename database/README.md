# Hotel Ordering System Database

This directory contains the database schema and related files for the Hotel Ordering System.

## 📁 Files

### `schema.sql`
Complete database schema creation script including:
- **Tables**: Users, menu items, orders, companies, table sessions
- **Types**: Enums for order status, payment status, user roles
- **Security**: Row Level Security (RLS) policies
- **Indexes**: Performance optimization
- **Views**: Common query patterns
- **Sample Data**: Development and testing data

## 🚀 Quick Setup

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Click "Run" to execute

### Option 2: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the schema
supabase db reset
```

### Option 3: PostgreSQL Direct
```bash
# Connect to your PostgreSQL database
psql -h your-host -U your-user -d your-database

# Run the schema file
\i database/schema.sql
```

## 📊 Database Schema Overview

### Core Tables

#### **users**
- User profiles extending Supabase auth
- Roles: server, kitchen, admin, customer
- Soft delete support

#### **companies**
- Supplier/vendor information
- Categories and contact details
- Used for menu item sourcing

#### **menu_items**
- Restaurant menu with pricing
- Categories: appetizer, main, dessert, beverage
- Tax rates and availability status
- Company associations

#### **orders**
- Customer orders with status tracking
- Payment status integration
- Table number assignment
- Special instructions

#### **order_items**
- Junction table for orders and menu items
- Quantity and pricing per item
- Historical price preservation

#### **table_sessions**
- Server workflow for part orders
- Table-based order management
- Session status tracking

#### **part_orders**
- Individual orders within table sessions
- Kitchen workflow integration
- JSON storage for flexibility

### Security Features

#### **Row Level Security (RLS)**
- ✅ Enabled on all tables
- ✅ User-specific data access
- ✅ Role-based permissions
- ✅ Authenticated user policies

#### **Access Control**
- **Servers**: Can create and manage orders
- **Kitchen**: Can view and update order status
- **Admins**: Full access to all data
- **Customers**: Can view own orders only

### Performance Optimizations

#### **Indexes**
- Primary keys and foreign keys
- Status fields for filtering
- Date fields for sorting
- Email and role lookups

#### **Views**
- `order_details`: Orders with customer and items
- `menu_items_with_company`: Menu items with supplier info

## 🔧 Configuration

### Environment Variables
Make sure these are set in your application:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Stripe Integration
The schema includes existing Stripe tables:
- `stripe_customers`
- `stripe_subscriptions` 
- `stripe_orders`

## 📈 Sample Data

The schema includes sample data for development:

### **Companies**
- Lush & Hush (Hotel Restaurant)
- Pick D (Quick Service)
- SS Food Court (Food Court)

### **Users**
- Server: server@hotel.com
- Kitchen: kitchen@hotel.com  
- Admin: admin@hotel.com

### **Menu Items**
- 12 sample items across all categories
- Realistic pricing and descriptions
- Different companies and tax rates

## 🛠️ Maintenance

### **Backup**
```bash
# Create backup
pg_dump -h your-host -U your-user your-database > backup.sql

# Restore backup
psql -h your-host -U your-user -d your-database < backup.sql
```

### **Migrations**
For schema changes, create migration files in `supabase/migrations/`:
```sql
-- Example migration: add_column_to_orders.sql
ALTER TABLE orders ADD COLUMN delivery_notes TEXT;
```

### **Monitoring**
- Monitor query performance with `EXPLAIN ANALYZE`
- Check index usage with `pg_stat_user_indexes`
- Monitor table sizes with `pg_size_pretty(pg_total_relation_size('table_name'))`

## 🔍 Troubleshooting

### Common Issues

#### **RLS Policies**
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View existing policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

#### **Performance Issues**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE table_name;
```

#### **Connection Issues**
- Verify Supabase project URL and keys
- Check database connection limits
- Ensure proper SSL configuration

## 📞 Support

For database-related issues:
1. Check Supabase dashboard logs
2. Review RLS policies for access issues
3. Monitor performance metrics
4. Consult Supabase documentation

---

🎉 **Your Hotel Ordering System database is ready for production!**