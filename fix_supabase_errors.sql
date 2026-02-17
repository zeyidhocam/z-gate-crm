-- BU DOSYAYI SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
-- (RUN THIS FILE IN SUPABASE SQL EDITOR)

-- 1. CLIENTS TABLOSU İÇİN RLS (ROW LEVEL SECURITY) AYARLARI
-- Tablonun güvenliğini aktif et
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 2. INSERT (EKLEME) POLİTİKASI
-- Hem anonim (anon) hem de giriş yapmış (authenticated) kullanıcıların (veya servis rolünün)
-- kayıt eklemesine izin ver. Telegram botu sunucu tarafında çalıştığı için service_role kullanabilir
-- ama webhook public ise anon rolü de gerekebilir.
-- Güvenlik Notu: Production'da 'anon' yerine sadece 'service_role' kullanmak daha güvenlidir.
-- Ancak "Bilinmeyen Hata" genellikle anon rolünün yetkisizliğinden kaynaklanır.

DROP POLICY IF EXISTS "Public Clients Insert" ON public.clients;

-- Tüm rollere ekleme izni ver (DEBUG İÇİN)
CREATE POLICY "Public Clients Insert" 
ON public.clients 
FOR INSERT 
WITH CHECK (true);

-- 3. SELECT (OKUMA) POLİTİKASI
-- Telegram botu duplicate kontrolü için okuma yapıyor
DROP POLICY IF EXISTS "Public Clients Select" ON public.clients;

CREATE POLICY "Public Clients Select" 
ON public.clients 
FOR SELECT 
USING (true);

-- 4. UPDATE (GÜNCELLEME) POLİTİKASI
-- Botun güncelleme yapabilmesi için
DROP POLICY IF EXISTS "Public Clients Update" ON public.clients;

CREATE POLICY "Public Clients Update" 
ON public.clients 
FOR UPDATE 
USING (true);

-- 5. SÜTUN TİPİ KONTROLÜ VE DÜZELTME
-- 'price_agreed' ve 'price' sütunlarının sayısal (numeric) olduğundan emin olalım.
-- Eğer text ise, otomatik olarak numeric'e dönüştürmeye çalışırız.

DO $$
BEGIN
    -- price_agreed sütunu kontrolü
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND column_name = 'price_agreed' 
        AND data_type = 'text'
    ) THEN
        -- Text ise Numeric'e çevir (içindeki harfleri temizleyerek)
        -- Not: Bu tehlikeli olabilir, veri kaybı riski vardır.
        -- O yüzden sadece tip uyarısı veriyoruz veya manuel değişim öneriyoruz.
        RAISE NOTICE 'UYARI: price_agreed sütunu TEXT tipinde. Numeric olması önerilir.';
        
        -- Otomatik düzelme (Riskli olduğu için yorum satırı, gerekirse açın):
        -- ALTER TABLE public.clients 
        -- ALTER COLUMN price_agreed TYPE NUMERIC 
        -- USING regexp_replace(price_agreed, '[^0-9.]', '', 'g')::NUMERIC;
    END IF;
END $$;

-- 6. AUDIT LOGS TABLOSU (Eğer yoksa hata vermemesi için)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT,
    record_id UUID,
    action TEXT,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Audit logs için de insert izni
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit Insert" ON public.audit_logs;
CREATE POLICY "Audit Insert" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- SONUÇ
SELECT 'İşlem Başarıyla Tamamlandı. RLS Politikaları Güncellendi.' as result;
