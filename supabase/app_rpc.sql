create or replace function public.get_crew_member_by_id(member_id uuid)
returns table (
  id uuid,
  username text,
  display_name text,
  roles text[],
  rank text,
  status public.crew_status,
  avatar_url text,
  join_date date,
  flights_completed integer,
  created_at timestamptz,
  updated_at timestamptz
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
    crew.join_date,
    crew.flights_completed,
    crew.created_at,
    crew.updated_at
  from public.crew_members as crew
  where crew.id = member_id
  limit 1;
$$;

create or replace function public.create_crew_member(input_data jsonb)
returns table (
  id uuid,
  username text,
  display_name text,
  roles text[],
  rank text,
  status public.crew_status,
  avatar_url text,
  join_date date,
  flights_completed integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_member public.crew_members;
begin
  if exists (
    select 1
    from public.crew_members
    where lower(username) = lower(trim(input_data->>'username'))
  ) then
    raise exception 'That username is already in use.';
  end if;

  insert into public.crew_members (
    username,
    password_hash,
    display_name,
    roles,
    rank,
    status,
    avatar_url,
    join_date,
    flights_completed
  )
  values (
    trim(input_data->>'username'),
    extensions.crypt(input_data->>'password', extensions.gen_salt('bf')),
    trim(input_data->>'display_name'),
    coalesce(array(select jsonb_array_elements_text(coalesce(input_data->'roles', '[]'::jsonb))), '{}'),
    coalesce(input_data->>'rank', ''),
    coalesce((input_data->>'status')::public.crew_status, 'Active'),
    coalesce(input_data->>'avatar_url', ''),
    coalesce((input_data->>'join_date')::date, current_date),
    coalesce((input_data->>'flights_completed')::integer, 0)
  )
  returning * into new_member;

  return query
  select
    new_member.id,
    new_member.username,
    new_member.display_name,
    new_member.roles,
    new_member.rank,
    new_member.status,
    new_member.avatar_url,
    new_member.join_date,
    new_member.flights_completed,
    new_member.created_at,
    new_member.updated_at;
end;
$$;

create or replace function public.update_crew_member(member_id uuid, input_data jsonb)
returns table (
  id uuid,
  username text,
  display_name text,
  roles text[],
  rank text,
  status public.crew_status,
  avatar_url text,
  join_date date,
  flights_completed integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  updated_member public.crew_members;
  next_username text;
begin
  next_username := coalesce(trim(input_data->>'username'), '');

  if next_username <> '' and exists (
    select 1
    from public.crew_members
    where id <> member_id
      and lower(username) = lower(next_username)
  ) then
    raise exception 'That username is already in use.';
  end if;

  update public.crew_members
  set
    username = case when next_username <> '' then next_username else username end,
    password_hash = case
      when coalesce(input_data->>'password', '') <> '' then extensions.crypt(input_data->>'password', extensions.gen_salt('bf'))
      else password_hash
    end,
    display_name = coalesce(nullif(trim(input_data->>'display_name'), ''), display_name),
    roles = case
      when input_data ? 'roles' then coalesce(array(select jsonb_array_elements_text(coalesce(input_data->'roles', '[]'::jsonb))), '{}')
      else roles
    end,
    rank = case when input_data ? 'rank' then coalesce(input_data->>'rank', '') else rank end,
    status = case when input_data ? 'status' then (input_data->>'status')::public.crew_status else status end,
    avatar_url = case when input_data ? 'avatar_url' then coalesce(input_data->>'avatar_url', '') else avatar_url end,
    join_date = case when input_data ? 'join_date' and input_data->>'join_date' <> '' then (input_data->>'join_date')::date else join_date end,
    flights_completed = case when input_data ? 'flights_completed' then coalesce((input_data->>'flights_completed')::integer, flights_completed) else flights_completed end
  where id = member_id
  returning * into updated_member;

  if updated_member.id is null then
    raise exception 'Crew member not found.';
  end if;

  return query
  select
    updated_member.id,
    updated_member.username,
    updated_member.display_name,
    updated_member.roles,
    updated_member.rank,
    updated_member.status,
    updated_member.avatar_url,
    updated_member.join_date,
    updated_member.flights_completed,
    updated_member.created_at,
    updated_member.updated_at;
end;
$$;

create or replace function public.delete_crew_member(member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.crew_members where id = member_id;
  return true;
end;
$$;

grant execute on function public.authenticate_crew_member(text, text) to anon, authenticated;
grant execute on function public.get_crew_member_by_id(uuid) to anon, authenticated;
grant execute on function public.create_crew_member(jsonb) to anon, authenticated;
grant execute on function public.update_crew_member(uuid, jsonb) to anon, authenticated;
grant execute on function public.delete_crew_member(uuid) to anon, authenticated;
