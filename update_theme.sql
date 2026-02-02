-- Ocean Elite Theme Database Update
-- Supabase SQL Editor'de bu komutu çalıştırın

-- 1. Tema ayarını 'ocean-elite' olarak güncelle
UPDATE system_settings 
SET theme_preference = 'ocean-elite'
WHERE id = 1;

-- 2. Eğer satır yoksa ekle
INSERT INTO system_settings (id, site_title, theme_preference)
SELECT 1, 'Z-Gate CRM', 'ocean-elite'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE id = 1);

-- Sonucu kontrol et
SELECT * FROM system_settings;
