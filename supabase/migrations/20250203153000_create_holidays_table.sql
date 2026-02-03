create table if not exists public.holidays (
    id uuid not null default gen_random_uuid(),
    school_id uuid not null,
    name text not null,
    date date not null,
    type text not null default 'holiday', -- 'weekend', 'festival', 'other'
    is_recurring boolean default false,
    created_at timestamp with time zone default now(),
    
    constraint holidays_pkey primary key (id),
    -- Ensure same date isn't added twice for the same school
    constraint holidays_school_date_key unique (school_id, date)
);

-- RLS Policies
alter table public.holidays enable row level security;

create policy "Enable read access for all users" on public.holidays
    for select using (true);

create policy "Enable insert for authenticated users only" on public.holidays
    for insert with check (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only" on public.holidays
    for delete using (auth.role() = 'authenticated');
