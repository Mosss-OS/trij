# Role-Based Access Control (RBAC)

## Matrix

| Permission | CHW | Supervisor | Admin |
|---|---|---|---|
| **Patients** | | | |
| Read own patients | ✅ | ✅ | ✅ |
| Read team patients | ❌ | ✅ | ✅ |
| Read all patients | ❌ | ❌ | ✅ |
| Write own patients | ✅ | ✅ | ✅ |
| Write team patients | ❌ | ✅ | ✅ |
| Write all patients | ❌ | ❌ | ✅ |
| **Assessments** | | | |
| Read own assessments | ✅ | ✅ | ✅ |
| Read team assessments | ❌ | ✅ | ✅ |
| Read all assessments | ❌ | ❌ | ✅ |
| Write own assessments | ✅ | ✅ | ✅ |
| Write team assessments | ❌ | ✅ | ✅ |
| **Analytics** | | | |
| View own stats | ✅ | ✅ | ✅ |
| View team stats | ❌ | ✅ | ✅ |
| View region stats | ❌ | ❌ | ✅ |
| **Configuration** | | | |
| Edit personal settings | ✅ | ✅ | ✅ |
| Edit team config | ❌ | ✅ | ✅ |
| Edit all config | ❌ | ❌ | ✅ |
| **Pages** | | | |
| Supervisor dashboard | ❌ | ✅ | ✅ |
| Admin console | ❌ | ❌ | ✅ |

## Implementation

### Backend (Supabase RLS)
`supabase/migrations/20260520000001_add_rbac_policies.sql`

Roles stored in `auth.users.raw_app_meta_data->>'role'`. Default: `chw`.

Policies use helper functions:
- `public.get_my_role()` — returns the current user's role
- `public.is_supervisor_or_admin()` — supervisor or admin check
- `public.is_admin()` — admin check
- `public.get_my_team_chw_ids()` — returns CHW IDs for the supervisor's team

### Frontend
`src/lib/rbac.ts` — type-safe permission matrix with `can(role, permission)`
`src/hooks/useRBAC.ts` — React hooks `useRole()` and `usePermission(permission)`

Frontend guards mirror backend rules in supervisor, settings, and admin pages.

### Setting a user's role in Supabase
```sql
-- After user signup or via admin console
update auth.users
set raw_app_meta_data = 
  raw_app_meta_data || '{"role": "supervisor"}'::jsonb
where id = '<user-uuid>';
```
