-- Run this in your Supabase project's SQL Editor
-- (Drop existing tables first if re-running)

create table if not exists diet_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  quantity text,
  order_index int default 0,
  created_at timestamptz default now()
);

create table if not exists diet_logs (
  id uuid default gen_random_uuid() primary key,
  diet_item_id uuid references diet_items(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  logged_date date not null default current_date,
  created_at timestamptz default now(),
  unique(diet_item_id, logged_date)
);

create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  scheduled_date date not null default current_date,
  completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists body_scans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  scan_date date not null default current_date,
  height numeric,
  weight numeric,
  bmi numeric,
  smm numeric,
  fat numeric,
  whr numeric,
  notes text,
  created_at timestamptz default now()
);

alter table diet_items enable row level security;
alter table diet_logs enable row level security;
alter table tasks enable row level security;
alter table body_scans enable row level security;

create policy "Users manage their own diet items"
  on diet_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own diet logs"
  on diet_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own tasks"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own body scans"
  on body_scans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
