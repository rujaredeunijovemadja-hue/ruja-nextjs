-- RUJA - MIGRATION: painel de missões do Nexus
-- Missões podem ser atribuídas a jovens ou líderes sem reutilizar recuperação.

INSERT INTO public.ruja_plataforma_modulos (plataforma_id, modulo_id, ordem)
SELECT p.id, m.id, 9
FROM public.ruja_plataformas p, public.ruja_modulos m
WHERE p.slug = 'nexus' AND m.chave = 'tarefas'
ON CONFLICT (plataforma_id, modulo_id) DO UPDATE SET ativo = true;

CREATE TABLE IF NOT EXISTS public.ruja_missoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  departamento_id text,
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  alvo_tipo text NOT NULL CHECK (alvo_tipo IN ('jovem', 'lider', 'usuario')),
  alvo_id text,
  alvo_nome text NOT NULL,
  alvo_usuario_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  prioridade text NOT NULL DEFAULT 'normal'
    CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  progresso integer NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  prazo date,
  criado_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ruja_missoes_scope ON public.ruja_missoes(plataforma_id, departamento_id, status);
CREATE INDEX IF NOT EXISTS idx_ruja_missoes_alvo ON public.ruja_missoes(alvo_tipo, alvo_id);
CREATE INDEX IF NOT EXISTS idx_ruja_missoes_prazo ON public.ruja_missoes(prazo) WHERE status NOT IN ('concluida', 'cancelada');

ALTER TABLE public.ruja_missoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS missoes_select_access ON public.ruja_missoes;
CREATE POLICY missoes_select_access ON public.ruja_missoes FOR SELECT TO authenticated
USING (
  public.ruja_has_platform_module(plataforma_id, 'tarefas')
  AND (
    public.is_ruja_admin()
    OR criado_por = auth.uid()
    OR alvo_usuario_id = auth.uid()
    OR public.can_access_departamento(departamento_id)
  )
);

DROP POLICY IF EXISTS missoes_insert_access ON public.ruja_missoes;
CREATE POLICY missoes_insert_access ON public.ruja_missoes FOR INSERT TO authenticated
WITH CHECK (
  criado_por = auth.uid()
  AND public.ruja_has_platform_module(plataforma_id, 'tarefas')
  AND (public.is_ruja_admin() OR public.can_access_departamento(departamento_id))
);

DROP POLICY IF EXISTS missoes_update_access ON public.ruja_missoes;
CREATE POLICY missoes_update_access ON public.ruja_missoes FOR UPDATE TO authenticated
USING (
  public.ruja_has_platform_module(plataforma_id, 'tarefas')
  AND (public.is_ruja_admin() OR criado_por = auth.uid() OR alvo_usuario_id = auth.uid() OR public.can_access_departamento(departamento_id))
)
WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'tarefas'));

DROP POLICY IF EXISTS missoes_delete_access ON public.ruja_missoes;
CREATE POLICY missoes_delete_access ON public.ruja_missoes FOR DELETE TO authenticated
USING (public.is_ruja_admin() OR criado_por = auth.uid() OR public.can_access_departamento(departamento_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_missoes TO authenticated;
COMMENT ON TABLE public.ruja_missoes IS 'Missões atribuídas a jovens, líderes ou usuários do Nexus.';
