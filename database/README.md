# Hotel Ordering System Database

This directory contains the database schema and data files for the Hotel Ordering System.

## 📁 Files

### Database Files

#### Azure SQL Server Files
- `azure-sql-schema.sql` - Complete database schema for Azure SQL Server / SQL Server
- `azure-sql-data.sql` - Sample data for development and testing

#### Supabase PostgreSQL Files
- `supabase-schema.sql` - Complete database schema for Supabase PostgreSQL
- `supabase-data.sql` - Sample data for Supabase development

**Schema Includes:**
- **Tables**: Users, menu items, orders, companies, table sessions
- **Indexes**: Performance optimization
- **Triggers**: Automatic timestamp updates
- **Sample Data**: Development and testing data

## 🚀 Quick Setup

### Azure SQL Server Setup

1. Create an Azure SQL Database or local SQL Server database
2. Run the schema script: `database/azure-sql-schema.sql`
3. Run the data script: `database/azure-sql-data.sql`
4. Update your `.env` file with connection details

### Supabase PostgreSQL Setup

1. Create a Supabase project at https://supabase.com
2. In the SQL Editor, run: `database/supabase-schema.sql`
3. Then run: `database/supabase-data.sql`
4. Copy your connection details from Supabase project settings

## 📊 Database Schema Overview

### Core Tables

#### **users**
- User profiles with authentication
- Roles: server, kitchen, admin, customer
- Soft delete support

#### **companies**
- Supplier/vendor information
- Categories and contact details
- Used for menu item sourcing

#### **menu_items**
- Restaurant menu with pricing
- Categories: appetizer, main, dessert, beverage
- Company associations
- Availability status

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

### Security Features

#### **Security Features**

**Supabase PostgreSQL:**
- Row Level Security (RLS) enabled on all tables
- User-specific data access through RLS policies
- Role-based permissions
- Authenticated user policies with Supabase Auth integration

**Azure SQL Server:**
- Application-level security through JWT tokens
- Role-based access control in application layer
- Parameterized queries to prevent SQL injection

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

## 🔧 Configuration

### Environment Variables

**For Azure SQL Server:**
```env
DB_SERVER=your-server.database.windows.net
DB_NAME=hotel_ordering_system
DB_USER=your_db_admin_user
DB_PASSWORD=your_db_password
JWT_SECRET=your-super-secret-jwt-key-change-in-production
VITE_API_URL=http://localhost:3001/api
```

**For Supabase:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001/api
```

## 📈 Sample Data

The schema includes sample data for development:

### **Companies**
- Hotel Restaurant (Main Dining)
- Room Service (In-Room Dining)
- Pool Bar (Bar & Lounge)

### **Users**
- Server: server@hotel.com
- Kitchen: kitchen@hotel.com
- Admin: admin@hotel.com

### **Menu Items**
- 15 sample items across all categories
- Realistic pricing and descriptions
- Different companies
- Stock photos from Pexels

## 🛠️ Maintenance

### **Backup**

**Azure SQL Server:**
```bash
# Azure SQL Database has automated backups
# Point-in-time restore available through Azure Portal
```

**Supabase:**
```bash
# Supabase provides automated daily backups
# Manual backups available through Supabase Dashboard
```

### **Migrations**
For schema changes, create migration files in `database/migrations/`:
```sql
-- Example migration: add_column_to_orders.sql
ALTER TABLE orders ADD COLUMN delivery_notes TEXT;
```

### **Monitoring**

**Azure SQL Server:**
- Monitor through Azure Portal Query Performance Insights
- Check execution plans with SQL Server Management Studio
- Use Dynamic Management Views (DMVs) for monitoring

**Supabase:**
- Monitor query performance through Supabase Dashboard
- Use PostgreSQL EXPLAIN ANALYZE for query optimization
- Check index usage with pg_stat_user_indexes

## 🔍 Troubleshooting

### Common Issues

#### **Connection Issues**

**Azure SQL Server:**
```sql
-- Test database connection
SELECT @@VERSION;
SELECT DB_NAME();
```

**Supabase:**
```sql
-- Test database connection
SELECT version();
SELECT current_database();
```

#### **Authentication Issues**
- Verify JWT_SECRET is set in environment
- Check user credentials in database
- Ensure proper password hashing

## 📞 Support

For database-related issues:
1. Check database logs (Azure Portal or Supabase Dashboard)
2. Verify database connection settings in .env file
3. Monitor query performance
4. Check application server logs
5. Review the SUPABASE-MIGRATION.md guide for Supabase-specific issues

🎉 **Your Hotel Ordering System database is ready for production!**
