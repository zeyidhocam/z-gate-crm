-- BU DOSYAYI SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
-- (RUN THIS FILE IN SUPABASE SQL EDITOR)

-- AMAÇ: 403 Forbidden (Yetki Hatası) sorununu çözmek için
-- clients tablosundaki kısıtlayıcı politikaları kaldırıp,
-- tüm kullanıcıların (anonim dahil) işlem yapmasına izin vermek.

-- 1. MEVCUT POLİTİKALARI TEMİZLE
-- Çakışma olmaması için önceki tüm politikaları siliyoruz.
DROP POLICY IF EXISTS "Public Clients Insert" ON public.clients;
DROP POLICY IF EXISTS "Public Clients Update" ON public.clients;
DROP POLICY IF EXISTS "Public Clients Select" ON public.clients;
DROP POLICY IF EXISTS "Public Clients Delete" ON public.clients;
DROP POLICY IF EXISTS "Enable All Access for All Users" ON public.clients;

-- 2. RLS AKTİF KALSIN (Kapatırsak Supabase API bazen tamamen bloklayabilir)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 3. GENEL ERİŞİM POLİTİKASI OLUŞTUR
-- "FOR ALL" komutu INSERT, UPDATE, DELETE ve SELECT işlemlerinin hepsini kapsar.
-- "USING (true)" ve "WITH CHECK (true)" herkesin her işlemi yapmasına izin verir.
-- UYARI: Bu geliştirme ortamı için uygundur. Production'da daha sıkı kurallar gerekebilir.

CREATE POLICY "Enable All Access for All Users"
ON public.clients
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. GRANTS (Yetkilendirmeler)
-- Anonim (anon) ve Authenticated kullanıcı rolleri için yetkileri garantiye alalım.
GRANT ALL ON TABLE public.clients TO anon;
GRANT ALL ON TABLE public.clients TO authenticated;
GRANT ALL ON TABLE public.clients TO service_role;

-- 5. SONUÇ KONTROLÜ
SELECT '403 Hatası İçin Erişim İzinleri Açıldı' as message;
