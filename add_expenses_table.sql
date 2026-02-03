-- Create expenses table
create table public.expenses (
  id uuid not null default gen_random_uuid (),
  title text not null,
  amount integer not null default 0,
  category text null,
  date timestamp with time zone not null default now(),
  created_at timestamp with time zone null default now(),
  constraint expenses_pkey primary key (id)
);

-- Enable RLS
alter table public.expenses enable row level security;

-- Create policies
create policy "Enable read access for all users" on public.expenses for select using (true);
create policy "Enable insert access for all users" on public.expenses for insert with check (true);
create policy "Enable delete access for all users" on public.expenses for delete using (true);
create policy "Enable update access for all users" on public.expenses for update using (true);

-- Create index
create index expenses_date_idx on public.expenses (date);
