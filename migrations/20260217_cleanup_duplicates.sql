-- Cleanup duplicates (phone-based) — 2026-02-17
-- Güvenlik önlemi: Önce SELECT/preview adımlarını çalıştırın, sonuçları kontrol edin, sonra yedek alıp DELETE'i çalıştırın.

-- 1) Tablo sütunlarını kontrol edin
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clients'
ORDER BY ordinal_position;

-- 2) phone_normalized alanı yoksa ekleyin ve normalize edin
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_normalized text;

-- İlk normalize: sadece rakam bırak
UPDATE clients
SET phone_normalized = regexp_replace(coalesce(phone, ''), '\D', '', 'g')
WHERE phone IS NOT NULL AND phone <> '';

-- İkinci adım: 10 haneli ise başına 90 ekle; başında 0 ise 0 -> 90
UPDATE clients
SET phone_normalized = CASE
  WHEN length(phone_normalized) = 10 THEN '90' || phone_normalized
  WHEN phone_normalized LIKE '0%' THEN regexp_replace(phone_normalized, '^0', '90')
  ELSE phone_normalized
END
WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';

-- 3) Duplicate grupları önizleme (telefon bazlı)
SELECT phone_normalized, COUNT(*) AS cnt, array_agg(id ORDER BY created_at DESC) AS ids
FROM clients
WHERE phone_normalized IS NOT NULL AND phone_normalized <> ''
GROUP BY phone_normalized
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 4) Silinecek adayları PREVIEW et (her grup için en yeni kaydı tutuyoruz)
WITH duplicates AS (
  SELECT
    id,
    phone_normalized,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY phone_normalized ORDER BY created_at DESC) AS rn
  FROM clients
  WHERE phone_normalized IS NOT NULL AND phone_normalized <> ''
)
SELECT * FROM duplicates WHERE rn > 1 ORDER BY phone_normalized, created_at DESC;

-- 5) (OPSİYONEL) Silinecek kayıtların yedeğini almak isterseniz aşağıdaki komutu çalıştırın
-- CREATE TABLE clients_duplicates_backup AS
-- WITH to_backup AS (
--   SELECT *
--   FROM (
--     SELECT *, ROW_NUMBER() OVER (PARTITION BY phone_normalized ORDER BY created_at DESC) AS rn
--     FROM clients
--     WHERE phone_normalized IS NOT NULL AND phone_normalized <> ''
--   ) t
--   WHERE t.rn > 1
-- )
-- SELECT * FROM to_backup;

-- 6) (MANUEL, SADECE ONAYLADIĞINIZDA ÇALIŞTIRIN) Silme işlemi — en yeni kaydı tutup diğerlerini siler
-- WITH duplicates AS (
--   SELECT id, ROW_NUMBER() OVER (PARTITION BY phone_normalized ORDER BY created_at DESC) AS rn
--   FROM clients
--   WHERE phone_normalized IS NOT NULL AND phone_normalized <> ''
-- )
-- DELETE FROM clients
-- WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 7) (OPSİYONEL) Temizlendikten sonra unique index eklemek isterseniz ayrı bir sorgu olarak çalıştırın:
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_phone_normalized_unique
-- ON clients(phone_normalized)
-- WHERE phone_normalized IS NOT NULL;

-- NOT: Eğer created_at güvenilir değilse (eksik/yanlış tarihler varsa) silme sırasını değiştirmek için
-- rn hesaplamasında başka kurallar kullanabiliriz (ör. en az boş alanı olanı tutma). İsterseniz buna göre
-- preview + silme SQL'i uyarlayayım.
