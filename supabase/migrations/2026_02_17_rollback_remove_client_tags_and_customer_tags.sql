-- Rollback: Remove tags columns and policies added on 2026-02-17
-- Use with caution. Run only if you want to undo the migration.

-- 1) Remove tags column from clients
ALTER TABLE IF EXISTS public.clients
DROP COLUMN IF EXISTS tags;

-- 2) Remove customer_tags from system_settings
ALTER TABLE IF EXISTS public.system_settings
DROP COLUMN IF EXISTS customer_tags;

-- 3) Optional: remove policies created earlier (only if desired)
-- DROP POLICY IF EXISTS "Authenticated users can insert/update clients" ON public.clients;
-- DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.system_settings;

-- Note: Policies may be shared or required by other migrations; uncomment DROP POLICY lines only if you are sure.
