-- Müşteri onay sistemi için gerekli alanlar
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- 1. is_confirmed alanı ekle (onaylanmış müşteri mi?)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE;

-- 2. stage alanı ekle (müşteri aşaması: 1, 2, 3, 4)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1;

-- 3. confirmed_at alanı ekle (onaylanma tarihi)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- 4. Mevcut Sabit müşterileri onaylı olarak işaretle (opsiyonel)
-- UPDATE clients SET is_confirmed = true, stage = 1, confirmed_at = NOW() WHERE status = 'Sabit';

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_clients_is_confirmed ON clients(is_confirmed);
CREATE INDEX IF NOT EXISTS idx_clients_stage ON clients(stage);
