-- CoreDesk — full schema (safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS
-- throughout, so existing installs can re-run this file to pick up new features).
-- Run in Supabase Dashboard -> SQL Editor -> New query.

-- =========================================================
-- 1. PROFILES + ROLES (server-side domain lock) — created first: the
-- clients table's delete policy below references this table.
-- =========================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text default 'member', -- 'admin' | 'member'
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Authenticated can view profiles" on profiles;
create policy "Authenticated can view profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins can update profiles" on profiles;
create policy "Admins can update profiles"
  on profiles for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Enforces the work-email domain server-side (the UI check alone is not enough —
-- anyone can call the Supabase auth API directly) and auto-creates a profile row.
-- The very first person to sign up becomes admin; everyone after is a member.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email !~* '@biztel\.ai$' then
    raise exception 'Only @biztel.ai accounts are allowed';
  end if;
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when not exists (select 1 from public.profiles) then 'admin' else 'member' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- 2. CLIENTS
-- =========================================================
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text default '',
  contact text default '',
  industry text default '',
  stage text default 'Lead',
  churned boolean default false,
  priority text default 'Medium',
  overview text default '',
  next_action text default '',
  next_action_date date,
  last_contact date,
  issues jsonb default '[]'::jsonb,
  specs jsonb default '[]'::jsonb,
  gtd jsonb default '[]'::jsonb,
  gathering jsonb default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  stage_entered_at timestamptz default now(),
  deleted_at timestamptz
);

alter table clients add column if not exists stage_entered_at timestamptz default now();
alter table clients add column if not exists deleted_at timestamptz;
-- Defensive: fills in every column the app needs even if the table already
-- existed with a different shape (e.g. from an external script). Safe no-ops
-- if the columns are already there.
alter table clients add column if not exists contact text default '';
alter table clients add column if not exists industry text default '';
alter table clients add column if not exists stage text default 'Lead';
alter table clients add column if not exists churned boolean default false;
alter table clients add column if not exists priority text default 'Medium';
alter table clients add column if not exists overview text default '';
alter table clients add column if not exists next_action text default '';
alter table clients add column if not exists next_action_date date;
alter table clients add column if not exists last_contact date;
alter table clients add column if not exists issues jsonb default '[]'::jsonb;
alter table clients add column if not exists specs jsonb default '[]'::jsonb;
alter table clients add column if not exists gtd jsonb default '[]'::jsonb;
alter table clients add column if not exists gathering jsonb default '[]'::jsonb;
alter table clients add column if not exists created_at timestamptz default now();
alter table clients add column if not exists updated_at timestamptz default now();

alter table clients enable row level security;

drop policy if exists "Authenticated users can view all clients" on clients;
create policy "Authenticated users can view all clients"
  on clients for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert clients" on clients;
create policy "Authenticated users can insert clients"
  on clients for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update clients" on clients;
create policy "Authenticated users can update clients"
  on clients for update
  using (auth.role() = 'authenticated');

-- Only admins can hard-delete. Everyone can soft-delete via the update policy above
-- (the app sets deleted_at rather than issuing a DELETE for day-to-day use).
drop policy if exists "Authenticated users can delete clients" on clients;
drop policy if exists "Admins can delete clients" on clients;
create policy "Admins can delete clients"
  on clients for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clients'
  ) then
    alter publication supabase_realtime add table clients;
  end if;
end $$;

-- =========================================================
-- 3. ACTIVITY LOG
-- =========================================================
create table if not exists client_activity (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  user_email text,
  action text,
  detail text,
  created_at timestamptz default now()
);

alter table client_activity enable row level security;

drop policy if exists "Authenticated can view activity" on client_activity;
create policy "Authenticated can view activity"
  on client_activity for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can insert activity" on client_activity;
create policy "Authenticated can insert activity"
  on client_activity for insert
  with check (auth.role() = 'authenticated');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'client_activity'
  ) then
    alter publication supabase_realtime add table client_activity;
  end if;
end $$;

-- =========================================================
-- 4. COMMENTS (specs, issues, or the client as a whole)
-- =========================================================
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  target_type text, -- 'spec' | 'issue' | 'client'
  target_id text,
  user_email text,
  body text,
  created_at timestamptz default now()
);

alter table comments enable row level security;

drop policy if exists "Authenticated can view comments" on comments;
create policy "Authenticated can view comments"
  on comments for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can insert comments" on comments;
create policy "Authenticated can insert comments"
  on comments for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authors and admins can delete comments" on comments;
create policy "Authors and admins can delete comments"
  on comments for delete
  using (
    user_email = (select email from profiles where id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table comments;
  end if;
end $$;

-- =========================================================
-- 5. WORKSPACE SETTINGS (shared default templates for new clients)
-- =========================================================
create table if not exists workspace_settings (
  id int primary key default 1,
  gathering_questions jsonb default '[]'::jsonb,
  gtd_steps jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);
insert into workspace_settings (id) values (1) on conflict (id) do nothing;

alter table workspace_settings enable row level security;

drop policy if exists "Authenticated can view workspace settings" on workspace_settings;
create policy "Authenticated can view workspace settings"
  on workspace_settings for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins can update workspace settings" on workspace_settings;
create policy "Admins can update workspace settings"
  on workspace_settings for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- =========================================================
-- 6. FILE ATTACHMENTS (Supabase Storage)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('client-files', 'client-files', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated can upload client files" on storage.objects;
create policy "Authenticated can upload client files"
  on storage.objects for insert
  with check (bucket_id = 'client-files' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can view client files" on storage.objects;
create policy "Authenticated can view client files"
  on storage.objects for select
  using (bucket_id = 'client-files' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete client files" on storage.objects;
create policy "Authenticated can delete client files"
  on storage.objects for delete
  using (bucket_id = 'client-files' and auth.role() = 'authenticated');

-- =========================================================
-- 7. PRODUCT WORKSPACE (Idea Inbox, Roadmap, Changelog, Hardware/BOM)
-- Kept simple on purpose: any authenticated teammate can create, edit, and
-- delete these — no soft-delete, no admin gating, matching the "just capture
-- it and move fast" nature of an internal idea/roadmap/BOM tracker.
-- =========================================================

-- Releases first: feature_items.release_id references it.
create table if not exists releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  release_date date not null default current_date,
  summary text default '',
  created_at timestamptz default now()
);

alter table releases enable row level security;

drop policy if exists "Authenticated can manage releases" on releases;
create policy "Authenticated can manage releases"
  on releases for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'releases'
  ) then
    alter publication supabase_realtime add table releases;
  end if;
end $$;

-- Idea Inbox + Roadmap: one table, moved between stages via `status`.
create table if not exists feature_items (
  id uuid primary key default gen_random_uuid(),
  title text default '',
  description text default '',
  priority text default 'Medium',      -- Low | Medium | High
  status text default 'Inbox',         -- Inbox | Now | Next | Later | Shipped
  notes text default '',               -- PRD / "what & why"
  release_id uuid references releases(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table feature_items enable row level security;

drop policy if exists "Authenticated can manage feature items" on feature_items;
create policy "Authenticated can manage feature items"
  on feature_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feature_items'
  ) then
    alter publication supabase_realtime add table feature_items;
  end if;
end $$;

-- Hardware / BOM tracker, optionally linked to a feature item and/or a client.
create table if not exists hardware_items (
  id uuid primary key default gen_random_uuid(),
  name text default '',
  model text default '',
  stock_count integer default 0,
  vendor_note text default '',
  lead_time text default '',
  status text default 'In Stock',      -- In Stock | Low Stock | Ordered | Backordered | Discontinued
  price numeric default 0,
  linked_feature_id uuid references feature_items(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table hardware_items add column if not exists lead_time text default '';
alter table hardware_items add column if not exists status text default 'In Stock';
alter table hardware_items add column if not exists price numeric default 0;
alter table hardware_items add column if not exists client_id uuid references clients(id) on delete set null;

alter table hardware_items enable row level security;

drop policy if exists "Authenticated can manage hardware items" on hardware_items;
create policy "Authenticated can manage hardware items"
  on hardware_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hardware_items'
  ) then
    alter publication supabase_realtime add table hardware_items;
  end if;
end $$;

-- =========================================================
-- 8. PRODUCTION PERFORMANCE / TIMESTAMP HELPERS
-- =========================================================
create index if not exists idx_clients_stage on clients(stage) where deleted_at is null;
create index if not exists idx_clients_updated_at on clients(updated_at desc) where deleted_at is null;
create index if not exists idx_clients_created_by on clients(created_by);
create index if not exists idx_client_activity_client_created on client_activity(client_id, created_at desc);
create index if not exists idx_comments_client_created on comments(client_id, created_at desc);
create index if not exists idx_feature_items_status on feature_items(status);
create index if not exists idx_feature_items_updated_at on feature_items(updated_at desc);
create index if not exists idx_hardware_client on hardware_items(client_id);
create index if not exists idx_hardware_status on hardware_items(status);
create index if not exists idx_hardware_updated_at on hardware_items(updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clients_updated_at on clients;
create trigger trg_clients_updated_at before update on clients
for each row execute function public.set_updated_at();

drop trigger if exists trg_feature_items_updated_at on feature_items;
create trigger trg_feature_items_updated_at before update on feature_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_hardware_items_updated_at on hardware_items;
create trigger trg_hardware_items_updated_at before update on hardware_items
for each row execute function public.set_updated_at();

-- =========================================================
-- Schedule (calendar) storage — same as supabase-schedule.sql
-- =========================================================
create table if not exists schedule_events (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  event_type text not null default 'Task',
  client_id uuid references clients(id) on delete set null,
  start_date date not null default current_date,
  end_date date,
  start_time text,
  end_time text,
  priority text not null default 'Medium',
  notes text default '',
  done boolean not null default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table schedule_events enable row level security;
drop policy if exists "Authenticated can manage schedule events" on schedule_events;
create policy "Authenticated can manage schedule events"
  on schedule_events for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule_events'
  ) then
    alter publication supabase_realtime add table schedule_events;
  end if;
end $$;
create index if not exists idx_schedule_events_start on schedule_events(start_date);
create index if not exists idx_schedule_events_client on schedule_events(client_id);
