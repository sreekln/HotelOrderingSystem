@@ .. @@
 -- Hotel Ordering System Database Schema
 -- PostgreSQL Database Schema
 -- Created: 2024
--- Updated: Latest version with Supabase compatibility
+-- Updated: Latest version with PostgreSQL integration

 -- Enable UUID extension
@@ .. @@
 -- Drop existing tables if they exist (for clean reinstall)
-DROP TABLE IF EXISTS stripe_orders CASCADE;
-DROP TABLE IF EXISTS stripe_subscriptions CASCADE;
-DROP TABLE IF EXISTS stripe_customers CASCADE;
 DROP TABLE IF EXISTS part_orders CASCADE;
@@ .. @@
 DROP TABLE IF EXISTS companies CASCADE;
 DROP TABLE IF EXISTS users CASCADE;

--- Drop existing types
-DROP TYPE IF EXISTS stripe_subscription_status CASCADE;
-DROP TYPE IF EXISTS stripe_order_status CASCADE;
 DROP TYPE IF EXISTS order_status CASCADE;
@@ .. @@
 -- Create custom types
 CREATE TYPE user_role AS ENUM ('server', 'kitchen', 'admin', 'customer');
 CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
 CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'cash');
 CREATE TYPE food_category AS ENUM ('Raw', 'Cooked');
 CREATE TYPE menu_category AS ENUM ('appetizer', 'main', 'dessert', 'beverage');
-CREATE TYPE stripe_subscription_status AS ENUM ('not_started', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused');
-CREATE TYPE stripe_order_status AS ENUM ('pending', 'completed', 'canceled');

 -- Users table (extends Supabase auth.users)
@@ .. @@
   deleted_at TIMESTAMPTZ DEFAULT NULL
 );

--- Stripe integration tables
-CREATE TABLE stripe_customers (
-  id BIGSERIAL PRIMARY KEY,
-  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
-  customer_id TEXT NOT NULL UNIQUE,
-  created_at TIMESTAMPTZ DEFAULT NOW(),
-  updated_at TIMESTAMPTZ DEFAULT NOW(),
-  deleted_at TIMESTAMPTZ DEFAULT NULL
-);
-
-CREATE TABLE stripe_subscriptions (
-  id BIGSERIAL PRIMARY KEY,
-  customer_id TEXT NOT NULL UNIQUE,
-  subscription_id TEXT,
-  price_id TEXT,
-  current_period_start BIGINT,
-  current_period_end BIGINT,
-  cancel_at_period_end BOOLEAN DEFAULT FALSE,
-  payment_method_brand TEXT,
-  payment_method_last4 TEXT,
-  status stripe_subscription_status NOT NULL,
-  created_at TIMESTAMPTZ DEFAULT NOW(),
-  updated_at TIMESTAMPTZ DEFAULT NOW(),
-  deleted_at TIMESTAMPTZ DEFAULT NULL
-);
-
-CREATE TABLE stripe_orders (
-  id BIGSERIAL PRIMARY KEY,
-  checkout_session_id TEXT NOT NULL,
-  payment_intent_id TEXT NOT NULL,
-  customer_id TEXT NOT NULL,
-  amount_subtotal BIGINT NOT NULL,
-  amount_total BIGINT NOT NULL,
-  currency TEXT NOT NULL,
-  payment_status TEXT NOT NULL,
-  status stripe_order_status DEFAULT 'pending',
-  created_at TIMESTAMPTZ DEFAULT NOW(),
-  updated_at TIMESTAMPTZ DEFAULT NOW(),
-  deleted_at TIMESTAMPTZ DEFAULT NULL
-);
-
 -- Create indexes for performance
 CREATE INDEX idx_users_email ON users(email);
 CREATE INDEX idx_users_role ON users(role);
@@ .. @@
 CREATE INDEX idx_part_orders_table_number ON part_orders(table_number);
 CREATE INDEX idx_part_orders_status ON part_orders(status);
 CREATE INDEX idx_part_orders_created_at ON part_orders(created_at);
-CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
-CREATE INDEX idx_stripe_customers_customer_id ON stripe_customers(customer_id);
-CREATE INDEX idx_stripe_subscriptions_customer_id ON stripe_subscriptions(customer_id);
-CREATE INDEX idx_stripe_orders_customer_id ON stripe_orders(customer_id);

 -- Create triggers for updated_at timestamps
@@ .. @@
 CREATE TRIGGER update_part_orders_updated_at
   BEFORE UPDATE ON part_orders
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-CREATE TRIGGER update_stripe_customers_updated_at
-  BEFORE UPDATE ON stripe_customers
-  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-CREATE TRIGGER update_stripe_subscriptions_updated_at
-  BEFORE UPDATE ON stripe_subscriptions
-  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-CREATE TRIGGER update_stripe_orders_updated_at
-  BEFORE UPDATE ON stripe_orders
-  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

 -- Row Level Security (RLS) Policies
@@ .. @@
 ALTER TABLE part_orders ENABLE ROW LEVEL SECURITY;
 ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
-ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
-ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

 -- Users policies
@@ .. @@
 CREATE POLICY "Admins can manage companies" ON companies
   FOR ALL TO authenticated
   USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
-
--- Stripe customers policies
-CREATE POLICY "Users can view their own customer data" ON stripe_customers
-  FOR SELECT TO authenticated
-  USING (user_id = auth.uid() AND deleted_at IS NULL);
-
--- Stripe subscriptions policies
-CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions
-  FOR SELECT TO authenticated
-  USING (customer_id IN (
-    SELECT customer_id FROM stripe_customers 
-    WHERE user_id = auth.uid() AND deleted_at IS NULL
-  ) AND deleted_at IS NULL);
-
--- Stripe orders policies
-CREATE POLICY "Users can view their own order data" ON stripe_orders
-  FOR SELECT TO authenticated
-  USING (customer_id IN (
-    SELECT customer_id FROM stripe_customers 
-    WHERE user_id = auth.uid() AND deleted_at IS NULL
-  ) AND deleted_at IS NULL);
-
--- Create views for common queries
-CREATE OR REPLACE VIEW stripe_user_subscriptions AS
-SELECT 
-  sc.customer_id,
-  ss.subscription_id,
-  ss.status as subscription_status,
-  ss.price_id,
-  ss.current_period_start,
-  ss.current_period_end,
-  ss.cancel_at_period_end,
-  ss.payment_method_brand,
-  ss.payment_method_last4
-FROM stripe_customers sc
-LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
-WHERE sc.deleted_at IS NULL AND (ss.deleted_at IS NULL OR ss.deleted_at IS NULL);
-
-CREATE OR REPLACE VIEW stripe_user_orders AS
-SELECT 
-  sc.customer_id,
-  so.id as order_id,
-  so.checkout_session_id,
-  so.payment_intent_id,
-  so.amount_subtotal,
-  so.amount_total,
-  so.currency,
-  so.payment_status,
-  so.status as order_status,
-  so.created_at as order_date
-FROM stripe_customers sc
-LEFT JOIN stripe_orders so ON sc.customer_id = so.customer_id
-WHERE sc.deleted_at IS NULL AND (so.deleted_at IS NULL OR so.deleted_at IS NULL);