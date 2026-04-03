drop policy if exists "crew_members_write_all" on public.crew_members;
create policy "crew_members_write_all"
on public.crew_members
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "notices_write_all" on public.notices;
create policy "notices_write_all"
on public.notices
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "flights_write_all" on public.flights;
create policy "flights_write_all"
on public.flights
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "flight_allocations_write_all" on public.flight_allocations;
create policy "flight_allocations_write_all"
on public.flight_allocations
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "loa_requests_write_all" on public.loa_requests;
create policy "loa_requests_write_all"
on public.loa_requests
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "sm_requests_write_all" on public.senior_management_requests;
create policy "sm_requests_write_all"
on public.senior_management_requests
for all
to anon, authenticated
using (true)
with check (true);
