-- ============================================================================
-- RUJA - MIGRATION: piloto operacional de Midia
-- Aplicar depois de migration_plataformas.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ruja_midia_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'outro',
  prioridade text NOT NULL DEFAULT 'normal'
    CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  status text NOT NULL DEFAULT 'solicitada'
    CHECK (status IN ('solicitada', 'planejada', 'em_producao', 'em_revisao', 'aprovada', 'entregue', 'cancelada')),
  solicitante_id uuid NOT NULL REFERENCES auth.users(id),
  responsavel_id uuid REFERENCES auth.users(id),
  prazo date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ruja_midia_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  solicitacao_id uuid NOT NULL REFERENCES public.ruja_midia_solicitacoes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  responsavel_id uuid REFERENCES auth.users(id),
  prazo date,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ruja_midia_aprovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  solicitacao_id uuid NOT NULL REFERENCES public.ruja_midia_solicitacoes(id) ON DELETE CASCADE,
  aprovador_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  comentario text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ruja_midia_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  solicitacao_id uuid NOT NULL REFERENCES public.ruja_midia_solicitacoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ruja_midia_solicitacoes_plataforma_status
  ON public.ruja_midia_solicitacoes(plataforma_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ruja_midia_tarefas_solicitacao
  ON public.ruja_midia_tarefas(solicitacao_id, status);
CREATE INDEX IF NOT EXISTS idx_ruja_midia_aprovacoes_solicitacao
  ON public.ruja_midia_aprovacoes(solicitacao_id, status);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ruja-midia-arquivos', 'ruja-midia-arquivos', false, 52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'audio/mpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ruja_midia_solicitacoes', 'ruja_midia_tarefas',
    'ruja_midia_aprovacoes', 'ruja_midia_arquivos'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS midia_solicitacoes_select ON public.ruja_midia_solicitacoes;
CREATE POLICY midia_solicitacoes_select ON public.ruja_midia_solicitacoes FOR SELECT TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'dashboard'));
DROP POLICY IF EXISTS midia_solicitacoes_insert ON public.ruja_midia_solicitacoes;
CREATE POLICY midia_solicitacoes_insert ON public.ruja_midia_solicitacoes FOR INSERT TO authenticated
WITH CHECK (solicitante_id = auth.uid() AND public.ruja_has_platform_module(plataforma_id, 'dashboard'));
DROP POLICY IF EXISTS midia_solicitacoes_update ON public.ruja_midia_solicitacoes;
CREATE POLICY midia_solicitacoes_update ON public.ruja_midia_solicitacoes FOR UPDATE TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'producao') OR public.ruja_has_platform_module(plataforma_id, 'aprovacoes'))
WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'producao') OR public.ruja_has_platform_module(plataforma_id, 'aprovacoes'));

DROP POLICY IF EXISTS midia_tarefas_access ON public.ruja_midia_tarefas;
CREATE POLICY midia_tarefas_access ON public.ruja_midia_tarefas FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'tarefas'))
WITH CHECK (created_by = auth.uid() OR public.ruja_has_platform_module(plataforma_id, 'tarefas'));

DROP POLICY IF EXISTS midia_aprovacoes_access ON public.ruja_midia_aprovacoes;
CREATE POLICY midia_aprovacoes_access ON public.ruja_midia_aprovacoes FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'aprovacoes'))
WITH CHECK (aprovador_id = auth.uid() OR public.ruja_has_platform_module(plataforma_id, 'aprovacoes'));

DROP POLICY IF EXISTS midia_arquivos_access ON public.ruja_midia_arquivos;
CREATE POLICY midia_arquivos_access ON public.ruja_midia_arquivos FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'arquivos'))
WITH CHECK (uploaded_by = auth.uid() OR public.ruja_has_platform_module(plataforma_id, 'arquivos'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_midia_solicitacoes,
  public.ruja_midia_tarefas, public.ruja_midia_aprovacoes,
  public.ruja_midia_arquivos TO authenticated;

DROP POLICY IF EXISTS midia_storage_select ON storage.objects;
CREATE POLICY midia_storage_select ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ruja-midia-arquivos'
  AND public.ruja_has_platform_module(split_part(name, '/', 1)::uuid, 'arquivos')
);

DROP POLICY IF EXISTS midia_storage_insert ON storage.objects;
CREATE POLICY midia_storage_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ruja-midia-arquivos'
  AND public.ruja_has_platform_module(split_part(name, '/', 1)::uuid, 'arquivos')
);

DROP POLICY IF EXISTS midia_storage_delete ON storage.objects;
CREATE POLICY midia_storage_delete ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ruja-midia-arquivos'
  AND public.ruja_has_platform_module(split_part(name, '/', 1)::uuid, 'arquivos')
);

COMMENT ON TABLE public.ruja_midia_solicitacoes IS 'Solicitacoes do fluxo operacional da plataforma Midia.';
