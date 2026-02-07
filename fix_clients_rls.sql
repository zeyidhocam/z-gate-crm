-- Müşteriler (clients) tablosu için izinleri aç
-- Bu işlem, raporun veri okumasını ve botun kayıt eklemesini sağlar.

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 1. Okuma İzni (Raporun çalışması için)
DROP POLICY IF EXISTS "Public Clients Read" ON public.clients;
CREATE POLICY "Public Clients Read" ON public.clients FOR SELECT USING (true);

-- 2. Ekleme İzni (Botun müşteri ekleyebilmesi için)
DROP POLICY IF EXISTS "Public Clients Insert" ON public.clients;
CREATE POLICY "Public Clients Insert" ON public.clients FOR INSERT WITH CHECK (true);

-- 3. Güncelleme İzni (İptal/Arşiv işlemleri için)
DROP POLICY IF EXISTS "Public Clients Update" ON public.clients;
CREATE POLICY "Public Clients Update" ON public.clients FOR UPDATE USING (true);
