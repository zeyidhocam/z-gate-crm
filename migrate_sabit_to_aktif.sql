-- Mevcut 'Sabit' statüsündeki müşterileri 'Aktif' olarak güncelle
UPDATE clients SET status = 'Aktif' WHERE status = 'Sabit';

-- Kontrol
SELECT status, COUNT(*) FROM clients GROUP BY status;
