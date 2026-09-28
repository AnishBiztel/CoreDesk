-- =========================================================
-- CoreDesk: Schedule (calendar) storage
-- Safe to run more than once. Click "Backup" in the app first.
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
