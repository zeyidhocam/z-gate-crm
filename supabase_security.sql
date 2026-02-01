-- 🚨 ÖNEMLİ: Bu kodları Supabase Dashboard -> SQL Editor kısmında çalıştırın.

-- 1. Tablolarda Row Level Security (RLS) Etkinleştirme
-- Bu işlem, tabloların herkese açık olmasını engeller.
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 2. Güvenlik Politikaları Oluşturma
-- Bu politikalar, sadece giriş yapmış (authenticated) kullanıcıların verilere erişmesini sağlar.

-- Leads Tablosu İçin
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON leads;
CREATE POLICY "Enable all access for authenticated users" ON leads
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Process Types Tablosu İçin
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON process_types;
CREATE POLICY "Enable all access for authenticated users" ON process_types
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Settings Tablosu İçin
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON settings;
CREATE POLICY "Enable all access for authenticated users" ON settings
    FOR ALL
    USING (auth.role() = 'authenticated');

-- 3. Yetkisiz Erişimi Kapatma (Opsiyonel ama Önerilen)
-- Anonim erişimlerin tamamen engellendiğinden emin olmak için.
-- Not: Supabase varsayılan olarak zaten engeller ama garanti altına alıyoruz.
