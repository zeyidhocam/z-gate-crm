-- 1. Tablo yoksa oluştur
CREATE TABLE IF NOT EXISTS system_settings (
  id bigint primary key generated always as identity,
  site_title text default 'Z-Gate CRM',
  logo_url text default '',
  theme_preference text default 'zeyid-moru',
  whatsapp_number text default '',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Yeni Sütunları Ekle (Veri kaybetmeden)
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS font_family text default 'sans',
ADD COLUMN IF NOT EXISTS font_weight text default 'normal',
ADD COLUMN IF NOT EXISTS font_scale text default 'medium',
ADD COLUMN IF NOT EXISTS panel_width text default 'full',
ADD COLUMN IF NOT EXISTS theme_preference text default 'zeyid-moru';

-- 3. İlk Ayarı Ekle (Eğer tablo boşsa)
INSERT INTO system_settings (site_title, theme_preference)
SELECT 'Z-Gate CRM', 'zeyid-moru'
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- 4. Yetkileri Aç (RLS)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Politikalar zaten varsa hata vermemesi için önce sil
DROP POLICY IF EXISTS "Herkes Okuyabilir" ON system_settings;
DROP POLICY IF EXISTS "Admin Düzenleyebilir" ON system_settings;
DROP POLICY IF EXISTS "Public Read" ON system_settings;
DROP POLICY IF EXISTS "Admin Write" ON system_settings;

CREATE POLICY "Public Read" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Admin Write" ON system_settings FOR ALL USING (auth.role() = 'authenticated');
