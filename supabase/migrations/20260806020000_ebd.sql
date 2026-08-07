-- ============================================================================
-- RUJA - MIGRATION: nucleo da Central EBD
-- Aplicar depois de migration_plataformas.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ruja_ebd_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  nome text NOT NULL,
  faixa_etaria text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ruja_ebd_professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  nome text NOT NULL,
  contato text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ruja_ebd_classes
  ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES public.ruja_ebd_professores(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.ruja_ebd_licoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  classe_id uuid NOT NULL REFERENCES public.ruja_ebd_classes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  data date,
  status text NOT NULL DEFAULT 'planejada'
    CHECK (status IN ('planejada', 'ministrada', 'cancelada')),
  observacao text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ruja_ebd_classes_platform ON public.ruja_ebd_classes(plataforma_id, ativo);
CREATE INDEX IF NOT EXISTS idx_ruja_ebd_professores_platform ON public.ruja_ebd_professores(plataforma_id, ativo);
CREATE INDEX IF NOT EXISTS idx_ruja_ebd_licoes_classe ON public.ruja_ebd_licoes(classe_id, data);

ALTER TABLE public.ruja_ebd_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruja_ebd_professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruja_ebd_licoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ebd_classes_access ON public.ruja_ebd_classes;
CREATE POLICY ebd_classes_access ON public.ruja_ebd_classes FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'membros'))
WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'membros'));

DROP POLICY IF EXISTS ebd_professores_access ON public.ruja_ebd_professores;
CREATE POLICY ebd_professores_access ON public.ruja_ebd_professores FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'equipe'))
WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'equipe'));

DROP POLICY IF EXISTS ebd_licoes_access ON public.ruja_ebd_licoes;
CREATE POLICY ebd_licoes_access ON public.ruja_ebd_licoes FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'tarefas'))
WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'tarefas'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_ebd_classes,
  public.ruja_ebd_professores, public.ruja_ebd_licoes TO authenticated;
