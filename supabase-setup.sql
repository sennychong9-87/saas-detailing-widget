-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/uyzsuvfjcypkmfohnkwn/sql/new)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: shops
-- owner_email links a Supabase Auth user to this shop
-- ============================================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  base_sedan_price NUMERIC NOT NULL DEFAULT 150,
  base_suv_price NUMERIC NOT NULL DEFAULT 200,
  base_truck_price NUMERIC NOT NULL DEFAULT 250,
  is_weekend_pricing_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add owner_email column if missing (for existing tables)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- ============================================
-- Table: pricing_rules
-- Condition modifiers per shop (interior/exterior)
-- ============================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('interior_condition', 'exterior_condition')),
  option_name TEXT NOT NULL CHECK (option_name IN ('clean', 'dirty', 'disaster')),
  price_adjustment NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(shop_id, category, option_name)
);

-- ============================================
-- Table: customers
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: quotes
-- ============================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_size TEXT NOT NULL,
  interior_condition TEXT NOT NULL,
  exterior_condition TEXT NOT NULL,
  estimated_total_price NUMERIC NOT NULL,
  deposit_required_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Seed: Insert a demo shop with the default UUID
-- IMPORTANT: Change 'you@email.com' to YOUR email address so you can access the dashboard
-- ============================================
INSERT INTO shops (id, business_name, owner_email, base_sedan_price, base_suv_price, base_truck_price, is_weekend_pricing_active)
VALUES (
  '4a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  'Premium Detailing Co.',
  'joshua.touthang.87@email.com',
  150,
  200,
  250,
  false
)
ON CONFLICT (id) DO UPDATE SET owner_email = EXCLUDED.owner_email;

-- ============================================
-- Seed: Pricing rules for demo shop
-- ============================================
INSERT INTO pricing_rules (shop_id, category, option_name, price_adjustment) VALUES
  ('4a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'interior_condition', 'clean',    0),
  ('4a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'interior_condition', 'dirty',    50),
  ('4a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'interior_condition', 'disaster', 120),
  ('4a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'exterior_condition', 'clean',    0),
  ('4a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'exterior_condition', 'dirty',    40),
  ('4a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'exterior_condition', 'disaster', 150)
ON CONFLICT (shop_id, category, option_name) DO NOTHING;

-- ============================================
-- RLS: Row-level security
-- ============================================
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Shops: anyone can read, only owner (by email) can update
DROP POLICY IF EXISTS "anon_can_read_shops" ON shops;
CREATE POLICY "anon_can_read_shops" ON shops FOR SELECT USING (true);

DROP POLICY IF EXISTS "owner_can_update_shops" ON shops;
CREATE POLICY "owner_can_update_shops" ON shops FOR UPDATE USING (
  owner_email = auth.jwt() ->> 'email'
);

-- Pricing rules: anyone can read, only owner can manage
DROP POLICY IF EXISTS "anon_can_read_pricing" ON pricing_rules;
CREATE POLICY "anon_can_read_pricing" ON pricing_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "owner_can_manage_pricing" ON pricing_rules;
CREATE POLICY "owner_can_manage_pricing" ON pricing_rules FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE owner_email = auth.jwt() ->> 'email')
);

-- Customers/Quotes: anonymous insert
DROP POLICY IF EXISTS "anon_can_insert_customers" ON customers;
CREATE POLICY "anon_can_insert_customers" ON customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon_can_insert_quotes" ON quotes;
CREATE POLICY "anon_can_insert_quotes" ON quotes FOR INSERT WITH CHECK (true);
