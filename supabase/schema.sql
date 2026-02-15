-- UPDATED SCHEMA FOR SYSTEM SETTINGS
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS font_family text default 'Montserrat',
ADD COLUMN IF NOT EXISTS font_weight text default 'normal',
ADD COLUMN IF NOT EXISTS theme_color text default 'purp',
ADD COLUMN IF NOT EXISTS panel_width text default 'full',
ADD COLUMN IF NOT EXISTS font_scale text default 'medium';

-- Ensure we have the base table if not exists (from previous step)
CREATE TABLE IF NOT EXISTS system_settings (
  id bigint primary key generated always as identity,
  site_title text default 'Z-Gate CRM',
  logo_url text default '',
  theme_preference text default 'modern-purple',
  font_size text default 'normal',
  whatsapp_number text default '',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- PROCESS TYPES (Service Management)
CREATE TABLE IF NOT EXISTS process_types (
  id bigint primary key generated always as identity,
  name text not null,
  price numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Admin All Settings" ON system_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Process" ON process_types FOR ALL USING (auth.role() = 'authenticated');

-- PAYMENT SCHEDULES (Taksit / Ödeme Takibi)
CREATE TABLE IF NOT EXISTS payment_schedules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  amount numeric not null default 0,
  due_date timestamp with time zone not null,
  is_paid boolean default false,
  paid_at timestamp with time zone,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for payment_schedules
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payment_schedules" ON payment_schedules FOR ALL USING (auth.role() = 'authenticated');
