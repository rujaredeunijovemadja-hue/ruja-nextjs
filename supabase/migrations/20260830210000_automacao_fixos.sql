-- RUJA - MIGRATION: eventos fixos e missões fixas (templates recorrentes)
-- Pedido do Ramon 30/08/2026: poder cadastrar um evento (semanal ou
-- mensal) ou uma missão (semanal ou mensal) que se repete sozinho, sem
-- precisar recriar toda semana/mês. O worker "Paulo" (ruja-automation)
-- lê estas tabelas e gera as ocorrências reais em ruja_eventos_frequencia
-- e ruja_missoes -- nunca o contrário. Cadastro restrito a
-- lider_supremo/administrador (is_ruja_admin()).

CREATE TABLE IF NOT EXISTS public.ruja_eventos_fixos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Reunião',
  recorrencia text NOT NULL CHECK (recorrencia IN ('semanal', 'mensal')),
  dia_semana int CHECK (dia_semana BETWEEN 0 AND 6), -- 0=domingo, usado quando semanal
  dia_mes int CHECK (dia_mes BETWEEN 1 AND 31),       -- usado quando mensal
  hora_inicio time NOT NULL,
  hora_termino time,
  local text,
  descricao text,
  departamento_id text,
  departamentos_envolvidos text[] NOT NULL DEFAULT '{}',
  lider_responsavel_id text,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eventos_fixos_recorrencia_coerente CHECK (
    (recorrencia = 'semanal' AND dia_semana IS NOT NULL AND dia_mes IS NULL) OR
    (recorrencia = 'mensal' AND dia_mes IS NOT NULL AND dia_semana IS NULL)
  )
);

ALTER TABLE public.ruja_eventos_frequencia
  ADD COLUMN IF NOT EXISTS origem_fixo_id uuid REFERENCES public.ruja_eventos_fixos(id);
CREATE INDEX IF NOT EXISTS idx_ruja_eventos_frequencia_origem_fixo
  ON public.ruja_eventos_frequencia(origem_fixo_id, data);

ALTER TABLE public.ruja_eventos_fixos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eventos_fixos_admin ON public.ruja_eventos_fixos;
CREATE POLICY eventos_fixos_admin ON public.ruja_eventos_fixos FOR ALL TO authenticated
USING (public.is_ruja_admin())
WITH CHECK (public.is_ruja_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_eventos_fixos TO authenticated;
COMMENT ON TABLE public.ruja_eventos_fixos IS 'Templates de evento recorrente (semanal/mensal) -- o worker Paulo gera as ocorrências reais em ruja_eventos_frequencia.';


CREATE TABLE IF NOT EXISTS public.ruja_missoes_fixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  departamento_id text,
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  alvo_tipo text NOT NULL CHECK (alvo_tipo IN ('jovem', 'lider', 'usuario')),
  alvo_id text,
  alvo_nome text NOT NULL,
  alvo_usuario_id uuid REFERENCES auth.users(id),
  prioridade text NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  recorrencia text NOT NULL CHECK (recorrencia IN ('semanal', 'mensal')),
  dia_semana int CHECK (dia_semana BETWEEN 0 AND 6),
  dia_mes int CHECK (dia_mes BETWEEN 1 AND 31),
  prazo_dias int NOT NULL DEFAULT 2 CHECK (prazo_dias >= 0),
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT missoes_fixas_recorrencia_coerente CHECK (
    (recorrencia = 'semanal' AND dia_semana IS NOT NULL AND dia_mes IS NULL) OR
    (recorrencia = 'mensal' AND dia_mes IS NOT NULL AND dia_semana IS NULL)
  )
);

ALTER TABLE public.ruja_missoes
  ADD COLUMN IF NOT EXISTS origem_fixa_id uuid REFERENCES public.ruja_missoes_fixas(id);
CREATE INDEX IF NOT EXISTS idx_ruja_missoes_origem_fixa
  ON public.ruja_missoes(origem_fixa_id, created_at);

ALTER TABLE public.ruja_missoes_fixas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS missoes_fixas_admin ON public.ruja_missoes_fixas;
CREATE POLICY missoes_fixas_admin ON public.ruja_missoes_fixas FOR ALL TO authenticated
USING (public.is_ruja_admin())
WITH CHECK (public.is_ruja_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_missoes_fixas TO authenticated;
COMMENT ON TABLE public.ruja_missoes_fixas IS 'Templates de missão recorrente (semanal/mensal) atribuível a jovem, líder ou usuário -- o worker Paulo gera as ocorrências reais em ruja_missoes.';
