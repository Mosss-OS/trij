-- RBAC RLS Policies
-- Roles are stored in auth.users.raw_app_meta_data->>'role' (values: chw, supervisor, admin)
-- Default role is chw

-- Helper function to get the current user's role
create or replace function public.get_my_role()
returns text
language sql
stable
as $$
  select coalesce(auth.users().raw_app_meta_data ->> 'role', 'chw')
$$;

-- Helper: is the user a supervisor or admin?
create or replace function public.is_supervisor_or_admin()
returns boolean
language sql
stable
as $$
  select public.get_my_role() in ('supervisor', 'admin')
$$;

-- Helper: is the user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.get_my_role() = 'admin'
$$;

-- Helper: get the CHW team for a supervisor (CHWs sharing the same supervisor_id)
create or replace function public.get_my_team_chw_ids()
returns uuid[]
language sql
stable
as $$
  select coalesce(array_agg(id), '{}')
  from auth.users
  where raw_app_meta_data ->> 'supervisor_id' = auth.uid()::text;
$$;

-- ── patients ──
drop policy if exists "chw_own_patients" on patients;
create policy "chw_own_patients" on patients
  for all
  using (chw_id = auth.uid() and public.get_my_role() = 'chw')
  with check (chw_id = auth.uid() and public.get_my_role() = 'chw');

drop policy if exists "supervisor_team_patients" on patients;
create policy "supervisor_team_patients" on patients
  for select
  using (public.get_my_role() = 'supervisor' and chw_id = any(public.get_my_team_chw_ids()));

drop policy if exists "supervisor_amend_team_patients" on patients;
create policy "supervisor_amend_team_patients" on patients
  for update
  using (public.get_my_role() = 'supervisor' and chw_id = any(public.get_my_team_chw_ids()))
  with check (public.get_my_role() = 'supervisor');

drop policy if exists "admin_all_patients" on patients;
create policy "admin_all_patients" on patients
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── assessments ──
drop policy if exists "chw_own_assessments" on assessments;
create policy "chw_own_assessments" on assessments
  for all
  using (chw_id = auth.uid() and public.get_my_role() = 'chw')
  with check (chw_id = auth.uid() and public.get_my_role() = 'chw');

drop policy if exists "supervisor_team_assessments" on assessments;
create policy "supervisor_team_assessments" on assessments
  for select
  using (public.get_my_role() = 'supervisor' and chw_id = any(public.get_my_team_chw_ids()));

drop policy if exists "admin_all_assessments" on assessments;
create policy "admin_all_assessments" on assessments
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── follow_ups ──
drop policy if exists "chw_own_follow_ups" on follow_ups;
create policy "chw_own_follow_ups" on follow_ups
  for all
  using (chw_id = auth.uid() and public.get_my_role() = 'chw')
  with check (chw_id = auth.uid() and public.get_my_role() = 'chw');

drop policy if exists "supervisor_team_follow_ups" on follow_ups;
create policy "supervisor_team_follow_ups" on follow_ups
  for select
  using (public.get_my_role() = 'supervisor' and chw_id = any(public.get_my_team_chw_ids()));

drop policy if exists "admin_all_follow_ups" on follow_ups;
create policy "admin_all_follow_ups" on follow_ups
  for all
  using (public.is_admin())
  with check (public.is_admin());
