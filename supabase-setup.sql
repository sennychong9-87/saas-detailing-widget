-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/uyzsuvfjcypkmfohnkwn/sql/new)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: shops
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
-- ============================================
INSERT INTO shops (id, business_name, base_sedan_price, base_suv_price, base_truck_price, is_weekend_pricing_active)
VALUES (
  '4a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  'Premium Detailing Co.',
  150,
  200,
  250,
  false
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS: Allow anonymous reads on shops, writes on customers/quotes
-- ============================================
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_can_read_shops" ON shops;
CREATE POLICY "anon_can_read_shops" ON shops FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_can_insert_customers" ON customers;
CREATE POLICY "anon_can_insert_customers" ON customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon_can_insert_quotes" ON quotes;
CREATE POLICY "anon_can_insert_quotes" ON quotes FOR INSERT WITH CHECK (true);
