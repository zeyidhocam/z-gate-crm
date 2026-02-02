-- 1. SİSTEM AYARLARI TABLOSU (Kalıcı Hafıza)
CREATE TABLE IF NOT EXISTS system_settings (
  id bigint primary key generated always as identity,
  site_title text default 'Z-Gate CRM',
  logo_url text default '',
  theme_preference text default 'modern-purple',
  font_size text default 'normal',
  whatsapp_number text default '', -- Varsayılan iletişim no
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- İlk boş ayarı oluştur (Yoksa sistem çalışmaz)
INSERT INTO system_settings (site_title, theme_preference)
SELECT 'Z-Gate CRM', 'modern-purple'
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- 2. WHATSAPP ŞABLONLARI TABLOSU
CREATE TABLE IF NOT EXISTS message_templates (
  id bigint primary key generated always as identity,
  title text not null, -- Örn: IBAN Paylaşımı
  content text not null, -- Örn: Merhaba, ödeme için IBAN...
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Örnek Şablonlar
INSERT INTO message_templates (title, content) VALUES
('IBAN Gönderimi', 'Merhaba, işlem ödemesi için IBAN bilgilerimiz: TR00 0000... Alıcı: Zeyid Bahtiyar'),
('Randevu Hatırlatma', 'Selamlar, yarın saat 14:00 teki bakım randevunuzu hatırlatmak isterim.'),
('İşlem Tamamlandı', 'Müjde! İşleminiz başarıyla tamamlanmıştır. Detaylar için arayabilirsiniz.')
ON CONFLICT DO NOTHING;

-- 3. GÜVENLİK
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Yönetici ayarları yönetir" ON system_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Yönetici şablonları yönetir" ON message_templates FOR ALL USING (auth.role() = 'authenticated');
