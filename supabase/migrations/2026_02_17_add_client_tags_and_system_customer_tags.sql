-- Migration: Add tags support for clients and system_settings
-- 2026-02-17

-- 1) Add tags column to clients table (text array)
ALTER TABLE IF EXISTS public.clients
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 2) Add customer_tags column to system_settings to store default tag list
ALTER TABLE IF EXISTS public.system_settings
ADD COLUMN IF NOT EXISTS customer_tags TEXT[] DEFAULT '{}';

-- 3) Ensure Row Level Security remains enabled and permissions are consistent
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
-- Replace CREATE POLICY IF NOT EXISTS (not supported) with DROP IF EXISTS + CREATE
DROP POLICY IF EXISTS "Authenticated users can insert/update clients" ON public.clients;
CREATE POLICY "Authenticated users can insert/update clients" ON public.clients
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.system_settings;
CREATE POLICY "Authenticated users can manage settings" ON public.system_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Notes:
-- - Run this in Supabase SQL editor or via psql connected to your Supabase DB.
-- - After running, TagSettings UI will be able to save tags to system_settings.customer_tags.
