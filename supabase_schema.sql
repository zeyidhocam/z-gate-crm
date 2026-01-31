-- BU DOSYAYI KOPYALAYIP SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
-- (Copy this file and run it in Supabase SQL Editor)

-- 1. PROCESS TYPES (İşlem Tipleri)
CREATE TABLE IF NOT EXISTS public.process_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    default_fee INTEGER DEFAULT 0,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. STATUS TYPES (Durumlar)
CREATE TABLE IF NOT EXISTS public.statuses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PAYMENT STATUS TYPES (Ödeme Durumları)
CREATE TABLE IF NOT EXISTS public.payment_statuses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. LEADS TABLE (Müşteri Adayları / Kayıtlar)
-- Uses gen_random_uuid() which is built-in (no extension needed)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    source TEXT,
    process_name TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reservation_at TIMESTAMP WITH TIME ZONE,
    note TEXT,
    tags TEXT[],
    price NUMERIC,
    ai_summary TEXT
);

-- 5. RESERVATIONS TABLE (Rezervasyonlar)
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    process_type_id TEXT REFERENCES public.process_types(id),
    status_id TEXT REFERENCES public.statuses(id),
    payment_status_id TEXT REFERENCES public.payment_statuses(id),
    fee INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. REMINDERS TABLE (Hatırlatıcılar)
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    is_done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. DEFAULT DATA (Varsayılan Veriler)
-- Insert only if not exists (using ON CONFLICT DO NOTHING)

-- Updated Process Types List
DELETE FROM public.process_types; -- Clear old ones to update
INSERT INTO public.process_types (id, name, default_fee, icon, color) VALUES
('baglama', 'Bağlama İşlemi', 3500, 'Link', '#7C3AED'),
('buyu_bozma', 'Büyü Bozma İşlemi', 4000, 'ShieldOff', '#EF4444'),
('geri_getirme', 'Geri Getirme İşlemi', 4200, 'Undo2', '#22D3EE'),
('kismet_acma', 'Kısmet Açma İşlemi', 3000, 'HeartHandshake', '#E91E63'),
('nazar', 'Nazar İşlemi', 2500, 'Eye', '#22C55E'),
('rizik_acma', 'Rızık Açma İşlemi', 2800, 'Sun', '#F59E0B'),
('sogutma', 'Soğutma İşlemi', 3800, 'Snowflake', '#3B82F6'),
('sogutma_bozma', 'Soğutma Bozma İşlemi', 4000, 'Flame', '#F97316'),
('ozel', 'Özel İşlemler', 5000, 'Star', '#A855F7')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    default_fee = EXCLUDED.default_fee,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;

-- Updated Statuses
INSERT INTO public.statuses (id, name, color) VALUES
('bekliyor', 'Bekliyor', '#F59E0B'),
('teyit', 'Teyit', '#22C55E'),
('iptal', 'İptal', '#EF4444')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payment_statuses (id, name, color) VALUES
('odendi', 'Ödendi', '#22C55E'),
('odenmedi', 'Ödenmedi', '#94A3B8'),
('kapora', 'Kapora', '#38BDF8')
ON CONFLICT (id) DO NOTHING;
