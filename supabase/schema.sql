create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'crew_status') then
    create type public.crew_status as enum (
      'Exempt',
      'Active',
      'Deriorating',
      'Inactive',
      'Authorise Leave'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'notice_priority') then
    create type public.notice_priority as enum ('Low', 'Medium', 'High', 'Urgent');
  end if;

  if not exists (select 1 from pg_type where typname = 'flight_status') then
    create type public.flight_status as enum ('Scheduled', 'Completed', 'Cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'loa_status') then
    create type public.loa_status as enum ('Pending', 'Approved', 'Denied');
  end if;

  if not exists (select 1 from pg_type where typname = 'sm_request_type') then
    create type public.sm_request_type as enum ('Chat', 'Meeting');
  end if;

  if not exists (select 1 from pg_type where typname = 'sm_request_status') then
    create type public.sm_request_status as enum ('Pending', 'Accepted', 'Declined');
  end if;
end $$;

create table if not exists public.crew_members (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  display_name text not null,
  roles text[] not null default '{}',
  rank text not null default '',
  status public.crew_status not null default 'Active',
  avatar_url text not null default '',
  preferred_theme text not null default 'dark',
  join_date date not null default current_date,
  flights_completed integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint crew_members_roles_not_empty check (array_length(roles, 1) is null or array_length(roles, 1) >= 0)
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  author_member_id uuid references public.crew_members(id) on delete set null,
  title text not null,
  content text not null,
  priority public.notice_priority not null default 'Medium',
  pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  flight_number text not null,
  departure text not null,
  arrival text not null,
  departure_at timestamptz not null,
  aircraft text not null default '',
  plane_model text not null default '',
  plane_registration text not null default '',
  status public.flight_status not null default 'Scheduled',
  max_crew integer not null default 19,
  created_by_member_id uuid references public.crew_members(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.flight_allocations (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights(id) on delete cascade,
  crew_member_id uuid not null references public.crew_members(id) on delete cascade,
  position text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (flight_id, crew_member_id)
);

create index if not exists idx_flight_allocations_flight_id on public.flight_allocations(flight_id);
create index if not exists idx_flight_allocations_member_id on public.flight_allocations(crew_member_id);

create table if not exists public.loa_requests (
  id uuid primary key default gen_random_uuid(),
  crew_member_id uuid not null references public.crew_members(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status public.loa_status not null default 'Pending',
  reviewed_by_member_id uuid references public.crew_members(id) on delete set null,
  reviewed_at timestamptz,
  notification_dismissed boolean not null default true,
  admin_seen boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint loa_dates_valid check (end_date >= start_date)
);

create index if not exists idx_loa_requests_member_id on public.loa_requests(crew_member_id);
create index if not exists idx_loa_requests_status on public.loa_requests(status);

create table if not exists public.senior_management_requests (
  id uuid primary key default gen_random_uuid(),
  crew_member_id uuid not null references public.crew_members(id) on delete cascade,
  request_type public.sm_request_type not null,
  requested_at timestamptz not null,
  reason text not null,
  status public.sm_request_status not null default 'Pending',
  reviewed_by_member_id uuid references public.crew_members(id) on delete set null,
  reviewed_at timestamptz,
  admin_seen boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_sm_requests_member_id on public.senior_management_requests(crew_member_id);
create index if not exists idx_sm_requests_status on public.senior_management_requests(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists crew_members_set_updated_at on public.crew_members;
create trigger crew_members_set_updated_at
before update on public.crew_members
for each row execute function public.set_updated_at();

drop trigger if exists notices_set_updated_at on public.notices;
create trigger notices_set_updated_at
before update on public.notices
for each row execute function public.set_updated_at();

drop trigger if exists flights_set_updated_at on public.flights;
create trigger flights_set_updated_at
before update on public.flights
for each row execute function public.set_updated_at();

drop trigger if exists loa_requests_set_updated_at on public.loa_requests;
create trigger loa_requests_set_updated_at
before update on public.loa_requests
for each row execute function public.set_updated_at();

drop trigger if exists senior_management_requests_set_updated_at on public.senior_management_requests;
create trigger senior_management_requests_set_updated_at
before update on public.senior_management_requests
for each row execute function public.set_updated_at();

create or replace function public.authenticate_crew_member(input_username text, input_password text)
returns table (
  id uuid,
  username text,
  display_name text,
  roles text[],
  rank text,
  status public.crew_status,
  avatar_url text,
  preferred_theme text,
  join_date date,
  flights_completed integer
)
language sql
security definer
set search_path = public
as $$
  select
    crew.id,
    crew.username,
    crew.display_name,
    crew.roles,
    crew.rank,
    crew.status,
    crew.avatar_url,
    crew.preferred_theme,
    crew.join_date,
    crew.flights_completed
  from public.crew_members as crew
  where lower(crew.username) = lower(trim(input_username))
    and crew.password_hash = crypt(input_password, crew.password_hash)
  limit 1;
$$;

create or replace function public.is_board_admin(member_roles text[])
returns boolean
language sql
immutable
as $$
  select coalesce('Executive Board' = any(member_roles), false)
      or coalesce('Senior Board' = any(member_roles), false);
$$;

create or replace view public.staff_database_view as
select
  crew.id,
  crew.display_name,
  crew.username,
  crew.rank,
  crew.status,
  crew.roles,
  crew.flights_completed,
  crew.avatar_url,
  crew.join_date
from public.crew_members as crew;

alter table public.crew_members enable row level security;
alter table public.notices enable row level security;
alter table public.flights enable row level security;
alter table public.flight_allocations enable row level security;
alter table public.loa_requests enable row level security;
alter table public.senior_management_requests enable row level security;

drop policy if exists "crew_members_read_all" on public.crew_members;
create policy "crew_members_read_all"
on public.crew_members
for select
to anon, authenticated
using (true);

drop policy if exists "notices_read_all" on public.notices;
create policy "notices_read_all"
on public.notices
for select
to anon, authenticated
using (true);

drop policy if exists "flights_read_all" on public.flights;
create policy "flights_read_all"
on public.flights
for select
to anon, authenticated
using (true);

drop policy if exists "flight_allocations_read_all" on public.flight_allocations;
create policy "flight_allocations_read_all"
on public.flight_allocations
for select
to anon, authenticated
using (true);

drop policy if exists "loa_requests_read_all" on public.loa_requests;
create policy "loa_requests_read_all"
on public.loa_requests
for select
to anon, authenticated
using (true);

drop policy if exists "sm_requests_read_all" on public.senior_management_requests;
create policy "sm_requests_read_all"
on public.senior_management_requests
for select
to anon, authenticated
using (true);

insert into public.crew_members (
  username,
  password_hash,
  display_name,
  roles,
  rank,
  status,
  avatar_url,
  preferred_theme,
  join_date,
  flights_completed
)
values (
  'Ronnie',
  crypt('admin123', gen_salt('bf')),
  'Ronnie',
  array[
    'Executive Board',
    'Senior Board',
    'Recruitment',
    'Flight Dispatcher',
    'Cabin Operations',
    'Flight Deck',
    'Airside Operations',
    'Security'
  ],
  'Chief Executive Officer',
  'Active',
  '',
  'dark',
  current_date,
  0
)
on conflict (username) do update
set
  display_name = excluded.display_name,
  roles = excluded.roles,
  rank = excluded.rank,
  status = excluded.status,
  avatar_url = excluded.avatar_url,
  preferred_theme = excluded.preferred_theme,
  flights_completed = excluded.flights_completed,
  updated_at = timezone('utc', now());

insert into public.notices (
  author_member_id,
  title,
  content,
  priority,
  pinned
)
select
  crew.id,
  'Welcome to the crew portal',
  'Board notices, LOA decisions, and flight allocation updates will appear here.',
  'Medium',
  true
from public.crew_members as crew
where crew.username = 'Ronnie'
  and not exists (
    select 1
    from public.notices
    where title = 'Welcome to the crew portal'
  );
