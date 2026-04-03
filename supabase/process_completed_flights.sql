create or replace function public.process_completed_flights()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  processed_count integer := 0;
  expired_flight record;
begin
  for expired_flight in
    select id
    from public.flights
    where status = 'Scheduled'
      and departure_at <= timezone('utc', now()) - interval '1 hour'
  loop
    update public.crew_members as crew
    set flights_completed = crew.flights_completed + 1
    where crew.id in (
      select distinct allocation.crew_member_id
      from public.flight_allocations as allocation
      where allocation.flight_id = expired_flight.id
    );

    delete from public.department_roster_assignments
    where flight_id = expired_flight.id;

    delete from public.flight_allocations
    where flight_id = expired_flight.id;

    delete from public.flights
    where id = expired_flight.id;

    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$$;

grant execute on function public.process_completed_flights() to anon, authenticated;
