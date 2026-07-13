create table if not exists public.consultations (
  id          text primary key,
  patient_id  uuid not null references public.patients(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  chw_user_id uuid not null,
  chw_name    text not null,
  status      text not null default 'pending' check (status in ('pending','assigned','in_progress','completed','cancelled')),
  priority    text not null default 'routine' check (priority in ('routine','urgent')),
  images      text[] default '{}',
  voice_transcript text,
  chw_notes   text not null default '',
  clinical_context jsonb default '{}',
  response    jsonb,
  created_at  timestamptz not null default now(),
  responded_at timestamptz,
  synced_at   timestamptz,
  version     integer not null default 1
);

-- enable row-level security
alter table public.consultations enable row level security;

-- chw can read own consultations
create policy "chw_select_own_consultations"
  on public.consultations for select
  using (auth.uid() = chw_user_id);

-- chw can insert own consultations
create policy "chw_insert_own_consultations"
  on public.consultations for insert
  with check (auth.uid() = chw_user_id);

-- chw can update own consultations
create policy "chw_update_own_consultations"
  on public.consultations for update
  using (auth.uid() = chw_user_id);

-- admin can read all consultations
create policy "admin_select_all_consultations"
  on public.consultations for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'
    )
  );

-- admin can update any consultation (for clinician response)
create policy "admin_update_consultations"
  on public.consultations for update
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'
    )
  );

grant select, insert, update on public.consultations to authenticated;
