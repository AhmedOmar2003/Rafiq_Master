-- Admin Dashboard Bootstrap Helper
-- ---------------------------------------------------------------------------
-- IMPORTANT:
--   `public.admin_roles` now lives in the authoritative migration chain:
--     supabase/migrations/0043_admin_roles_source_of_truth.sql
--
-- This file is no longer allowed to create dashboard schema objects.
-- Keep it only as an operational helper for:
--   1. Backfilling `profiles` rows from auth.users if an old environment
--      drifted before the profile trigger existed.
--   2. Seeding the first admin / super_admin account after the full
--      migration chain has already been applied.

begin;

insert into public.profiles (id, full_name, email)
select
  id,
  left(
    coalesce(
      nullif(raw_user_meta_data->>'full_name', ''),
      nullif(raw_user_meta_data->>'name', ''),
      split_part(email, '@', 1)
    ),
    80
  ) as full_name,
  email
from auth.users
on conflict (email) do update
set full_name = excluded.full_name,
    id = excluded.id,
    email = excluded.email,
    updated_at = now();

commit;

-- Seed the first dashboard owner manually AFTER migrations are applied:
--   insert into public.admin_roles (user_id, role)
--   values ('your-auth-user-uuid', 'super_admin')
--   on conflict (user_id) do update set role = excluded.role;
