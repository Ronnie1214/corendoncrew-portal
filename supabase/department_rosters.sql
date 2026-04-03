create table if not exists public.department_roster_assignments (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights(id) on delete cascade,
  department text not null,
  assignment_role text not null,
  assigned_crew_member_id uuid references public.crew_members(id) on delete set null,
  assigned_by_member_id uuid references public.crew_members(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (flight_id, department, assignment_role)
);

create index if not exists idx_department_rosters_flight_id on public.department_roster_assignments(flight_id);
create index if not exists idx_department_rosters_department on public.department_roster_assignments(department);

alter table public.department_roster_assignments enable row level security;

drop trigger if exists department_roster_assignments_set_updated_at on public.department_roster_assignments;
create trigger department_roster_assignments_set_updated_at
before update on public.department_roster_assignments
for each row execute function public.set_updated_at();

drop policy if exists "department_rosters_read_all" on public.department_roster_assignments;
create policy "department_rosters_read_all"
on public.department_roster_assignments
for select
to anon, authenticated
using (true);

drop policy if exists "department_rosters_write_all" on public.department_roster_assignments;
create policy "department_rosters_write_all"
on public.department_roster_assignments
for all
to anon, authenticated
using (true)
with check (true);
