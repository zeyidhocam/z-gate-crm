-- Add 'type' column to expenses table
-- 'expense' for Gider, 'income' for Gelir

do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'expenses' and column_name = 'type') then
        alter table public.expenses add column "type" text default 'expense';
    end if;
end $$;

-- Update existing records to be 'expense'
update public.expenses set "type" = 'expense' where "type" is null;
