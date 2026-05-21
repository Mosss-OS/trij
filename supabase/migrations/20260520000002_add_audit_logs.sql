create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  action text not null,
  user_id uuid references auth.users(id) on delete set null,
  patient_id uuid,
  resource_type text not null,
  resource_id text,
  details text,
  ip_address text,
  user_agent text,
  timestamp bigint not null,
  synced boolean default false,
  created_at timestamptz default now()
);

create index idx_audit_logs_user_id on audit_logs(user_id);
create index idx_audit_logs_action on audit_logs(action);
create index idx_audit_logs_timestamp on audit_logs(timestamp desc);
create index idx_audit_logs_patient_id on audit_logs(patient_id);

alter table audit_logs enable row level security;

drop policy if exists "supervisor_read_audit_logs" on audit_logs;
create policy "supervisor_read_audit_logs" on audit_logs
  for select
  using (
    coalesce(auth.users().raw_app_meta_data ->> 'role', 'chw') in ('supervisor', 'admin')
  );

drop policy if exists "chw_insert_own_audit_logs" on audit_logs;
create policy "chw_insert_own_audit_logs" on audit_logs
  for insert
  with check (user_id = auth.uid());

drop policy if exists "admin_all_audit_logs" on audit_logs;
create policy "admin_all_audit_logs" on audit_logs
  for all
  using (auth.users().raw_app_meta_data ->> 'role' = 'admin')
  with check (auth.users().raw_app_meta_data ->> 'role' = 'admin');
