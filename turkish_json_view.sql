-- BU KODU SUPABASE SQL EDITOR EKRANINA YAPIŞTIRIP ÇALIŞTIRIN --

CREATE OR REPLACE VIEW musteri_listesi_ozel AS
SELECT
  c.full_name as isim_soyisim,
  c.phone as telefon,
  p.name as islem,
  c.status as durum,
  c.price_agreed as ucret,
  c.notes as detay
FROM clients c
LEFT JOIN process_types p ON c.process_type_id = p.id;
