-- Ocean Elite Theme Database Update
-- Supabase SQL Editor'de bu komutu çalıştırın

-- 1. Mevcut kaydı güncelle
UPDATE system_settings 
SET theme_preference = 'ocean-elite';

-- 2. Eğer satır yoksa id belirtmeden ekle
INSERT INTO system_settings (site_title, theme_preference)
SELECT 'Z-Gate CRM', 'ocean-elite'
WHERE NOT EXISTS (SELECT 1 FROM system_settings LIMIT 1);

-- Sonucu kontrol et
SELECT * FROM system_settings;
