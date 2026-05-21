-- Supervisor invitation codes.
-- A supervisor generates codes; a CHW enters one during signup.
CREATE TABLE public.supervisor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  supervisor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_codes ENABLE ROW LEVEL SECURITY;

-- Supervisors can view codes they created.
CREATE POLICY "supervisor_view_own_codes" ON public.supervisor_codes
  FOR SELECT TO authenticated
  USING (auth.uid() = supervisor_user_id);

-- Any authenticated user can read a code to validate it (we gate by code value, not auth).
-- But to prevent abuse we only allow SELECT on the specific code the caller provides.
-- Actually the simplest approach: create a dedicated SECURITY DEFINER function.

-- Validate + consume a supervisor code
CREATE OR REPLACE FUNCTION public.use_supervisor_code(p_code TEXT, p_chw_user_id UUID)
RETURNS UUID  -- returns the supervisor's user_id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supervisor_user_id UUID;
BEGIN
  SELECT sc.supervisor_user_id INTO v_supervisor_user_id
  FROM public.supervisor_codes sc
  WHERE sc.code = p_code
    AND sc.used_by_user_id IS NULL
  FOR UPDATE;  -- lock row to prevent double-use

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_used_code'
      USING HINT = 'The supervisor code is invalid or has already been used.';
  END IF;

  UPDATE public.supervisor_codes
  SET used_by_user_id = p_chw_user_id, used_at = now()
  WHERE code = p_code;

  RETURN v_supervisor_user_id;
END;
$$;

-- Modify handle_new_user() to accept a supervisor_code in user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supervisor_code TEXT;
  v_supervisor_user_id UUID;
  v_profile_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.chw_profiles (user_id, name, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'New CHW'),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  )
  RETURNING id INTO v_profile_id;

  -- Assign chw role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'chw');

  -- Link to supervisor if a code was provided
  v_supervisor_code := NEW.raw_user_meta_data->>'supervisor_code';
  IF v_supervisor_code IS NOT NULL AND v_supervisor_code <> '' THEN
    BEGIN
      v_supervisor_user_id := public.use_supervisor_code(v_supervisor_code, NEW.id);
      UPDATE public.chw_profiles
      SET supervisor_id = (SELECT id FROM public.chw_profiles WHERE user_id = v_supervisor_user_id)
      WHERE user_id = NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Don't block registration if code is invalid; log silently
        NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;
