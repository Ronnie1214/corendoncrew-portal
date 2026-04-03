# Supabase Setup

This repo now includes a ready-to-run Supabase schema for the crew portal.

## Files

- `supabase/schema.sql`
- `supabase/app_rpc.sql`
- `supabase/client_policies.sql`
- `.env.example`
- `src/lib/supabaseClient.js`

## What the schema creates

- `crew_members`
- `notices`
- `flights`
- `flight_allocations`
- `loa_requests`
- `senior_management_requests`
- `staff_database_view`
- `authenticate_crew_member(...)` SQL function

It also seeds:

- `Ronnie`
- username: `Ronnie`
- password: `admin123`

## How to create the database

1. Create a new Supabase project.
2. Open the SQL Editor in Supabase.
3. Paste in `supabase/schema.sql`.
4. Run it once.
5. Paste in `supabase/app_rpc.sql`.
6. Run it once.
7. Paste in `supabase/client_policies.sql`.
8. Run it once.
9. Copy your project URL and anon key into a local `.env.local` file based on `.env.example`.

## Notes

- Passwords are stored as bcrypt hashes via `pgcrypto`, not plain text.
- The SQL function `authenticate_crew_member` is there so the app can keep username/password sign-in while we migrate away from Netlify.
- This schema is designed around the current portal features, so we can wire the frontend into it next instead of redesigning everything.
