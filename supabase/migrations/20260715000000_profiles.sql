-- ============================================================================
-- RUJA - MIGRATION: perfis, bootstrap e sincronizacao com Supabase Auth
-- Execute no SQL Editor do Supabase. Pode ser repetida com seguranca.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ruja_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'voluntario',
  departamento_id text NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Compatibilidade com instalacoes que receberam a versao antiga da migration.
ALTER TABLE public.ruja_profiles
  ADD COLUMN IF NOT EXISTS departamento_id text NULL,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ruja_profiles'
      AND column_name = 'criado_em'
  ) THEN
    EXECUTE 'UPDATE public.ruja_profiles SET created_at = COALESCE(criado_em, created_at)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ruja_profiles'
      AND column_name = 'atualizado_em'
  ) THEN
    EXECUTE 'UPDATE public.ruja_profiles SET updated_at = COALESCE(atualizado_em, updated_at)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ruja_profiles'
      AND column_name = 'departamento'
  ) THEN
    EXECUTE $migration$
      UPDATE public.ruja_profiles p
      SET departamento_id = d.id
      FROM public.ruja_departamentos d
      WHERE p.departamento_id IS NULL
        AND trim(coalesce(p.departamento, '')) <> ''
        AND (
          lower(trim(p.departamento)) = lower(d.id::text)
          OR lower(trim(p.departamento)) = lower(d.nome)
          OR lower(trim(p.departamento)) = lower(coalesce(d.slug, ''))
        )
    $migration$;
  END IF;
END $$;

ALTER TABLE public.ruja_profiles DROP CONSTRAINT IF EXISTS ruja_profiles_role_check;

UPDATE public.ruja_profiles SET role = 'administrador' WHERE role = 'admin';

UPDATE public.ruja_profiles
SET role = 'voluntario'
WHERE role IS NULL
   OR role NOT IN ('lider_supremo', 'administrador', 'lider_departamento', 'voluntario', 'visualizador');

ALTER TABLE public.ruja_profiles
  ADD CONSTRAINT ruja_profiles_role_check
  CHECK (role IN ('lider_supremo', 'administrador', 'lider_departamento', 'voluntario', 'visualizador'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_ruja_profiles_email
  ON public.ruja_profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_ruja_profiles_role
  ON public.ruja_profiles(role);
CREATE INDEX IF NOT EXISTS idx_ruja_profiles_ativo
  ON public.ruja_profiles(ativo);
CREATE INDEX IF NOT EXISTS idx_ruja_profiles_departamento
  ON public.ruja_profiles(departamento_id);

-- Cria perfis para logins antigos que existem apenas em auth.users.
INSERT INTO public.ruja_profiles (
  id,
  nome,
  email,
  role,
  departamento_id,
  ativo,
  created_at,
  updated_at
)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data ->> 'nome'), ''),
    NULLIF(trim(u.raw_user_meta_data ->> 'name'), ''),
    NULLIF(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Usuario RUJA'
  ),
  COALESCE(u.email, u.id::text || '@sem-email.local'),
  CASE
    WHEN u.raw_user_meta_data ->> 'role' = 'admin' THEN 'administrador'
    WHEN u.raw_user_meta_data ->> 'role' IN ('lider_supremo', 'administrador', 'lider_departamento', 'voluntario', 'visualizador')
      THEN u.raw_user_meta_data ->> 'role'
    ELSE 'voluntario'
  END,
  NULL,
  true,
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET nome = CASE
      WHEN trim(coalesce(public.ruja_profiles.nome, '')) = '' THEN EXCLUDED.nome
      ELSE public.ruja_profiles.nome
    END,
    email = EXCLUDED.email,
    updated_at = now();

-- Bootstrap controlado: se ainda nao existe Lider Supremo, promove o login
-- mais antigo. Depois disso os cargos passam a ser gerenciados pela aplicacao.
DO $$
DECLARE
  bootstrap_user_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ruja_profiles
    WHERE role = 'lider_supremo' AND ativo = true
  ) THEN
    SELECT p.id
    INTO bootstrap_user_id
    FROM public.ruja_profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.ativo = true
    ORDER BY u.created_at ASC, p.id ASC
    LIMIT 1;

    IF bootstrap_user_id IS NOT NULL THEN
      UPDATE public.ruja_profiles
      SET role = 'lider_supremo', updated_at = now()
      WHERE id = bootstrap_user_id;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ruja_handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ruja_profiles (
    id, nome, email, role, departamento_id, ativo, created_at, updated_at
  ) VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data ->> 'nome'), ''),
      NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
      NULLIF(split_part(coalesce(NEW.email, ''), '@', 1), ''),
      'Usuario RUJA'
    ),
    COALESCE(NEW.email, NEW.id::text || '@sem-email.local'),
    CASE
      WHEN NEW.raw_user_meta_data ->> 'role' = 'admin' THEN 'administrador'
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('lider_supremo', 'administrador', 'lider_departamento', 'voluntario', 'visualizador')
        THEN NEW.raw_user_meta_data ->> 'role'
      ELSE 'voluntario'
    END,
    NULL,
    true,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ruja_auth_user_profile ON auth.users;
CREATE TRIGGER trg_ruja_auth_user_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.ruja_handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.ruja_profiles_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ruja_profiles_updated_at ON public.ruja_profiles;
CREATE TRIGGER trg_ruja_profiles_updated_at
BEFORE UPDATE ON public.ruja_profiles
FOR EACH ROW EXECUTE FUNCTION public.ruja_profiles_touch_updated_at();

ALTER TABLE public.ruja_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.ruja_profiles;
DROP POLICY IF EXISTS profiles_service_insert ON public.ruja_profiles;
DROP POLICY IF EXISTS profiles_service_update ON public.ruja_profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.ruja_profiles;

CREATE POLICY profiles_select ON public.ruja_profiles
  FOR SELECT TO authenticated
  USING (true);

-- Escritas de perfil passam apenas pelas APIs server-side com service_role.
GRANT SELECT ON public.ruja_profiles TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ruja_profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.ruja_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ruja_profiles
    WHERE id = auth.uid()
      AND role IN ('lider_supremo', 'administrador')
      AND ativo = true
  );
$$;

REVOKE ALL ON FUNCTION public.ruja_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ruja_is_admin() TO authenticated;

COMMENT ON TABLE public.ruja_profiles IS
'Perfis de acesso do RUJA sincronizados com Supabase Auth.';
