-- RUJA - MIGRATION: histórico do painel de missões

CREATE TABLE IF NOT EXISTS public.ruja_missoes_atualizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  missao_id uuid NOT NULL REFERENCES public.ruja_missoes(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  progresso integer NOT NULL CHECK (progresso BETWEEN 0 AND 100),
  comentario text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ruja_missoes_atualizacoes_missao ON public.ruja_missoes_atualizacoes(missao_id, created_at DESC);
ALTER TABLE public.ruja_missoes_atualizacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS missoes_atualizacoes_access ON public.ruja_missoes_atualizacoes;
CREATE POLICY missoes_atualizacoes_access ON public.ruja_missoes_atualizacoes FOR ALL TO authenticated
USING (public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento') AND EXISTS (SELECT 1 FROM public.ruja_missoes m WHERE m.id = missao_id AND public.ruja_has_platform_module(m.plataforma_id, 'tarefas')))
WITH CHECK (usuario_id = auth.uid() AND public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento') AND EXISTS (SELECT 1 FROM public.ruja_missoes m WHERE m.id = missao_id AND public.ruja_has_platform_module(m.plataforma_id, 'tarefas')));

GRANT SELECT, INSERT ON public.ruja_missoes_atualizacoes TO authenticated;
