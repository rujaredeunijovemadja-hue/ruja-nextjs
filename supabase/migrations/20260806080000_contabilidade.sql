-- RUJA - piloto operacional de Contabilidade

CREATE TABLE IF NOT EXISTS public.ruja_contabilidade_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria text NOT NULL DEFAULT 'geral',
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  data date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  criado_por uuid NOT NULL REFERENCES auth.users(id),
  aprovado_por uuid REFERENCES auth.users(id),
  observacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ruja_contabilidade_orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  periodo text NOT NULL,
  limite numeric(14,2) NOT NULL CHECK (limite >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plataforma_id, categoria, periodo)
);

CREATE TABLE IF NOT EXISTS public.ruja_contabilidade_comprovantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  lancamento_id uuid NOT NULL REFERENCES public.ruja_contabilidade_lancamentos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  enviado_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ruja_contabilidade_lancamentos_plataforma
  ON public.ruja_contabilidade_lancamentos(plataforma_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_ruja_contabilidade_orcamentos_plataforma
  ON public.ruja_contabilidade_orcamentos(plataforma_id, periodo);

ALTER TABLE public.ruja_contabilidade_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruja_contabilidade_orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruja_contabilidade_comprovantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contabilidade_lancamentos_access ON public.ruja_contabilidade_lancamentos;
CREATE POLICY contabilidade_lancamentos_access ON public.ruja_contabilidade_lancamentos FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'financeiro'))
WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'financeiro'));

DROP POLICY IF EXISTS contabilidade_orcamentos_access ON public.ruja_contabilidade_orcamentos;
CREATE POLICY contabilidade_orcamentos_access ON public.ruja_contabilidade_orcamentos FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'financeiro'))
WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'financeiro'));

DROP POLICY IF EXISTS contabilidade_comprovantes_access ON public.ruja_contabilidade_comprovantes;
CREATE POLICY contabilidade_comprovantes_access ON public.ruja_contabilidade_comprovantes FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'arquivos'))
WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'arquivos'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_contabilidade_lancamentos,
  public.ruja_contabilidade_orcamentos, public.ruja_contabilidade_comprovantes TO authenticated;
