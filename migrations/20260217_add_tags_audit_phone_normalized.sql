-- Migration: 2026-02-17
-- Ekler: tags, client_tags, audit_logs, phone_normalized, örnek trigger

BEGIN;

-- 1) phone_normalized alanı ekle ve mevcut telefon verilerini normalize et
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_normalized text;

-- Normalize: sadece rakam bırak, başında 0 varsa 90 ile değiştir
UPDATE clients
SET phone_normalized = (
  WITH digits AS (
    SELECT regexp_replace(coalesce(phone, ''), '\D','','g') AS d
  )
  SELECT CASE
    WHEN (SELECT length(d) FROM digits) = 10 THEN '90' || (SELECT d FROM digits)
    WHEN (SELECT d FROM digits) LIKE '0%' THEN regexp_replace((SELECT d FROM digits), '^0','90')
    ELSE (SELECT d FROM digits)
  END
);

-- 2) Tags tablosu ve ilişki tablosu
CREATE TABLE IF NOT EXISTS tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS client_tags (
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, tag_id)
);

-- 3) Audit log tablosu
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid,
  user_id uuid,
  action text NOT NULL,
  changes jsonb,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4) Örnek trigger fonksiyonu (clients için). Daha güvenli yaklaşım: uygulama katmanında log yazmak.
CREATE OR REPLACE FUNCTION fn_audit_clients() RETURNS trigger AS $$
DECLARE
  payload jsonb;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    payload := jsonb_build_object('new', row_to_json(NEW));
    INSERT INTO audit_logs(table_name, record_id, user_id, action, changes, created_at)
    VALUES ('clients', NEW.id, current_setting('my.app.user_id', true)::uuid, 'insert', payload, now());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    payload := jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW));
    INSERT INTO audit_logs(table_name, record_id, user_id, action, changes, created_at)
    VALUES ('clients', NEW.id, current_setting('my.app.user_id', true)::uuid, 'update', payload, now());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    payload := jsonb_build_object('old', row_to_json(OLD));
    INSERT INTO audit_logs(table_name, record_id, user_id, action, changes, created_at)
    VALUES ('clients', OLD.id, current_setting('my.app.user_id', true)::uuid, 'delete', payload, now());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı clients tablosuna bağla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_clients'
  ) THEN
    CREATE TRIGGER trg_audit_clients
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW EXECUTE FUNCTION fn_audit_clients();
  END IF;
END$$;

COMMIT;

-- NOT: Uyarı: Unique constraint eklemek mevcut verilerde çakışmaya yol açabilir. Önce duplicate kayıtları raporlayıp temizlemek güvenlidir.
-- Örnek duplicate kontrolu:
-- SELECT phone_normalized, count(*) FROM clients WHERE phone_normalized IS NOT NULL GROUP BY phone_normalized HAVING count(*) > 1;

-- Eğer temiz ise, unique index eklenebilir:
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_phone_normalized_unique ON clients(phone_normalized) WHERE phone_normalized IS NOT NULL;
