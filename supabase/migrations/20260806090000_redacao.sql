-- RUJA - piloto operacional de Redacao
CREATE TABLE IF NOT EXISTS public.ruja_redacao_pautas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  briefing text NOT NULL DEFAULT '',
  prazo date,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_producao', 'em_revisao', 'publicada', 'cancelada')),
  criado_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ruja_redacao_textos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pauta_id uuid NOT NULL REFERENCES public.ruja_redacao_pautas(id) ON DELETE CASCADE,
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  titulo text NOT NULL, conteudo text NOT NULL DEFAULT '', autor_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'revisao', 'aprovado', 'publicado')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ruja_redacao_pautas_platform ON public.ruja_redacao_pautas(plataforma_id, created_at DESC);
ALTER TABLE public.ruja_redacao_pautas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruja_redacao_textos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS redacao_pautas_access ON public.ruja_redacao_pautas;
CREATE POLICY redacao_pautas_access ON public.ruja_redacao_pautas FOR ALL TO authenticated USING (public.ruja_has_platform_module(plataforma_id, 'producao')) WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'producao'));
DROP POLICY IF EXISTS redacao_textos_access ON public.ruja_redacao_textos;
CREATE POLICY redacao_textos_access ON public.ruja_redacao_textos FOR ALL TO authenticated USING (public.ruja_has_platform_module(plataforma_id, 'producao')) WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'producao'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_redacao_pautas, public.ruja_redacao_textos TO authenticated;
