-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/uyzsuvfjcypkmfohnkwn/sql/new)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: shops
-- ============================================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  owner_email TEXT,
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  base_sedan_price NUMERIC NOT NULL DEFAULT 150,
  base_suv_price NUMERIC NOT NULL DEFAULT 200,
  base_truck_price NUMERIC NOT NULL DEFAULT 250,
  is_weekend_pricing_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_info TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'detailing';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS provides_protection BOOLEAN DEFAULT false;

-- ============================================
-- Table: protection_services
-- ============================================
CREATE TABLE IF NOT EXISTS protection_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vehicle_size TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(shop_id, name, vehicle_size)
);

-- ============================================
-- Table: addon_services
-- ============================================
CREATE TABLE IF NOT EXISTS addon_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(shop_id, name)
);

-- ============================================
-- Table: schedule_settings
-- ============================================
CREATE TABLE IF NOT EXISTS schedule_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE UNIQUE,
  work_start TEXT NOT NULL DEFAULT '09:00',
  work_end TEXT NOT NULL DEFAULT '17:00',
  working_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  bays INT NOT NULL DEFAULT 1,
  slot_duration INT NOT NULL DEFAULT 60
);

-- ============================================
-- Table: job_time_estimates
-- ============================================
CREATE TABLE IF NOT EXISTS job_time_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  vehicle_size TEXT NOT NULL,
  interior_condition TEXT NOT NULL,
  exterior_condition TEXT NOT NULL,
  estimated_minutes INT NOT NULL DEFAULT 60,
  UNIQUE(shop_id, vehicle_size, interior_condition, exterior_condition)
);

-- ============================================
-- Table: pricing_rules
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
-- Table: quotes (bookings)
-- booking_id is a human-readable code like DW-XXXXXX
-- ============================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  booking_id TEXT UNIQUE,
  vehicle_size TEXT NOT NULL,
  interior_condition TEXT NOT NULL,
  exterior_condition TEXT NOT NULL,
  estimated_total_price NUMERIC NOT NULL,
  deposit_required_amount NUMERIC NOT NULL,
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS booking_id TEXT UNIQUE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS appointment_time TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'detailing';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS addon_ids TEXT[];
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS final_status TEXT DEFAULT 'booked';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS actual_vehicle_size TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS actual_interior_condition TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS actual_exterior_condition TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS price_adjustment_note TEXT;

-- ============================================
-- Table: inspections
-- ============================================
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id TEXT NOT NULL REFERENCES quotes(booking_id) ON DELETE CASCADE,
  front_image TEXT,
  rear_image TEXT,
  driver_image TEXT,
  passenger_image TEXT,
  roof_image TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- ============================================
-- Seed: demo shop
-- ============================================
INSERT INTO shops (id, business_name, owner_email, base_sedan_price, base_suv_price, base_truck_price, is_weekend_pricing_active, payment_info, service_type, provides_protection)
VALUES (
  '4a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  'Premium Detailing Co.',
  'touthangj38@gmail.com',
  150, 200, 250, false,
  'UPI: premium@upi',
  'both', true
)
ON CONFLICT (id) DO UPDATE SET
  owner_email = EXCLUDED.owner_email,
  stripe_account_id = COALESCE(EXCLUDED.stripe_account_id, shops.stripe_account_id),
  stripe_onboarding_complete = COALESCE(EXCLUDED.stripe_onboarding_complete, shops.stripe_onboarding_complete);

-- ============================================
-- Seed: Pricing rules
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
-- RLS
-- ============================================
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE protection_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_time_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_can_read_shops" ON shops;
CREATE POLICY "anon_can_read_shops" ON shops FOR SELECT USING (true);

DROP POLICY IF EXISTS "owner_can_update_shops" ON shops;
CREATE POLICY "owner_can_update_shops" ON shops FOR UPDATE USING (
  owner_email = auth.jwt() ->> 'email'
);

DROP POLICY IF EXISTS "anon_can_read_pricing" ON pricing_rules;
CREATE POLICY "anon_can_read_pricing" ON pricing_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "owner_can_manage_pricing" ON pricing_rules;
CREATE POLICY "owner_can_manage_pricing" ON pricing_rules FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE owner_email = auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "anon_can_insert_customers" ON customers;
CREATE POLICY "anon_can_insert_customers" ON customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon_can_insert_quotes" ON quotes;
CREATE POLICY "anon_can_insert_quotes" ON quotes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon_can_select_quotes" ON quotes;
CREATE POLICY "anon_can_select_quotes" ON quotes FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_can_manage_inspections" ON inspections;
CREATE POLICY "anon_can_manage_inspections" ON inspections FOR ALL USING (true);

DROP POLICY IF EXISTS "anon_can_read_protection" ON protection_services;
CREATE POLICY "anon_can_read_protection" ON protection_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "owner_can_manage_protection" ON protection_services;
CREATE POLICY "owner_can_manage_protection" ON protection_services FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE owner_email = auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "anon_can_read_addons" ON addon_services;
CREATE POLICY "anon_can_read_addons" ON addon_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "owner_can_manage_addons" ON addon_services;
CREATE POLICY "owner_can_manage_addons" ON addon_services FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE owner_email = auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "anon_can_read_schedule" ON schedule_settings;
CREATE POLICY "anon_can_read_schedule" ON schedule_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "owner_can_manage_schedule" ON schedule_settings;
CREATE POLICY "owner_can_manage_schedule" ON schedule_settings FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE owner_email = auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "anon_can_read_job_times" ON job_time_estimates;
CREATE POLICY "anon_can_read_job_times" ON job_time_estimates FOR SELECT USING (true);

DROP POLICY IF EXISTS "owner_can_manage_job_times" ON job_time_estimates;
CREATE POLICY "owner_can_manage_job_times" ON job_time_estimates FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE owner_email = auth.jwt() ->> 'email')
);
