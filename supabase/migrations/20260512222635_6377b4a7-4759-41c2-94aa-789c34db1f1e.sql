
-- App roles enum and user_roles table (security best practice)
CREATE TYPE public.app_role AS ENUM ('chw', 'supervisor', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "users_view_own_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- CHW profiles
CREATE TABLE public.chw_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  region TEXT,
  supervisor_id UUID REFERENCES public.chw_profiles(id),
  device_id TEXT,
  last_sync TIMESTAMPTZ,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chw_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chw_view_own_profile" ON public.chw_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "chw_update_own_profile" ON public.chw_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "chw_insert_own_profile" ON public.chw_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Patients
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chw_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  identifier TEXT NOT NULL,
  age_years INTEGER,
  sex TEXT CHECK (sex IN ('M','F','other')),
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chw_own_patients" ON public.patients
  FOR ALL TO authenticated
  USING (auth.uid() = chw_user_id OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = chw_user_id);

-- Assessments
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  chw_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  images TEXT[],
  condition TEXT,
  confidence REAL,
  urgency TEXT CHECK (urgency IN ('green','yellow','red')),
  possible_conditions JSONB,
  key_visual_features JSONB,
  recommendation TEXT,
  voice_log TEXT,
  language TEXT DEFAULT 'en',
  referral_status TEXT NOT NULL DEFAULT 'none',
  referral_advised BOOLEAN DEFAULT false,
  follow_up_questions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chw_own_assessments" ON public.assessments
  FOR ALL TO authenticated
  USING (auth.uid() = chw_user_id OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = chw_user_id);

-- Auto-create chw profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chw_profiles (user_id, name, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'New CHW'),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'chw');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER touch_chw_profiles BEFORE UPDATE ON public.chw_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_patients BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
