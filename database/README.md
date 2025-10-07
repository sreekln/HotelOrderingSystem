# Hotel Ordering System PostgreSQL Database

This directory contains the PostgreSQL database schema and related files for the Hotel Ordering System.

## 📁 Files

### `schema.sql`
Complete database schema creation script including:
- **Tables**: Users, menu items, orders, companies, table sessions
- **Types**: Enums for order status, payment status, user roles
- **Security**: Row Level Security (RLS) policies
- **Indexes**: Performance optimization
- **Sample Data**: Development and testing data

## 🚀 Quick Setup

### Automated Setup (Recommended)
```bash
# Make script executable and run
chmod +x database/setup-postgresql.sh
./database/setup-postgresql.sh
```

### Manual PostgreSQL Setup
```bash
# Create database
createdb hotel_ordering_system

# Run the PostgreSQL schema
psql -d hotel_ordering_system -f database/postgresql-schema.sql
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
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_ordering_system
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key-change-in-production
VITE_API_URL=http://localhost:3001/api
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

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
pg_dump -h localhost -U postgres hotel_ordering_system > backup.sql

# Restore backup
psql -h localhost -U postgres -d hotel_ordering_system < backup.sql
```

### **Migrations**
For schema changes, create migration files in `database/migrations/`:
```sql
-- Example migration: add_column_to_orders.sql
ALTER TABLE orders ADD COLUMN delivery_notes TEXT;
```

### **Monitoring**
- Monitor query performance: `EXPLAIN ANALYZE SELECT ...`
- Check index usage: `SELECT * FROM pg_stat_user_indexes`
- Monitor table sizes: `SELECT pg_size_pretty(pg_total_relation_size('table_name'))`

## 🔍 Troubleshooting

### Common Issues

#### **Connection Issues**
```sql
-- Test database connection
SELECT version();
SELECT current_database();
```

#### **Performance Issues**
```sql
-- Check table statistics
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables;

-- Analyze table statistics
ANALYZE table_name;
```

#### **Authentication Issues**
- Verify JWT_SECRET is set in environment
- Check user credentials in database
- Ensure proper password hashing

## 📞 Support

For database-related issues:
1. Check PostgreSQL logs
2. Verify database connection settings
3. Monitor query performance
# Hotel Ordering System PostgreSQL Database
4. Check application server logs
🎉 **Your Hotel Ordering System database is ready for production!**