alter table public.crew_members
add column if not exists preferred_theme text not null default 'dark';
