-- ============================================================================
-- RUJA - MIGRATION: catalogo de plataformas, modulos e acessos
-- Aplicar depois de migration_profiles.sql e migration_cargos_permissoes.sql.
-- Idempotente. O Nexus existente e preservado durante a transicao.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ruja_plataformas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  icone text,
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ruja_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ruja_plataforma_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  modulo_id uuid NOT NULL REFERENCES public.ruja_modulos(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  configuracao jsonb NOT NULL DEFAULT '{}'::jsonb,
  ordem integer NOT NULL DEFAULT 0,
  UNIQUE (plataforma_id, modulo_id)
);

CREATE TABLE IF NOT EXISTS public.ruja_usuario_plataformas (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'visualizador',
  departamento_id text,
  ativo boolean NOT NULL DEFAULT true,
  permissoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plataforma_id),
  CHECK (role IN ('owner', 'admin', 'gestor', 'editor', 'operador', 'visualizador'))
);

CREATE INDEX IF NOT EXISTS idx_ruja_usuario_plataformas_plataforma
  ON public.ruja_usuario_plataformas(plataforma_id, ativo);
CREATE INDEX IF NOT EXISTS idx_ruja_usuario_plataformas_departamento
  ON public.ruja_usuario_plataformas(departamento_id);

INSERT INTO public.ruja_plataformas (nome, slug, descricao, icone, cor, ativo, ordem)
VALUES
  ('Nexus', 'nexus', 'Nucleo global de governanca e gestao da RUJA.', '🦁', '#ef4444', true, 0),
  ('Midia', 'midia', 'Solicitacoes, producao, revisao e publicacao de conteudo.', '🎥', '#8b5cf6', true, 10),
  ('Altar', 'altar', 'Operacao e acompanhamento do ministerio de altar.', '🔥', '#f97316', false, 20),
  ('PodSimply', 'podsimply', 'Producao e distribuicao do PodSimply.', '🎙️', '#06b6d4', false, 30),
  ('Happy Hour', 'happy-hour', 'Planejamento do Happy Hour.', '🍹', '#ec4899', false, 40),
  ('Central EBD', 'central-ebd', 'Professores, classes, licoes e materiais da EBD.', '📚', '#22c55e', false, 50),
  ('Redacao', 'redacao', 'Pautas, textos, revisao e publicacao editorial.', '✍️', '#eab308', false, 60),
  ('Palestras', 'palestras', 'Agenda, palestrantes e materiais de palestras.', '🎤', '#14b8a6', false, 70),
  ('Contabilidade', 'contabilidade', 'Entradas, saidas, orcamento e comprovantes.', '💰', '#64748b', false, 80)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor,
  ordem = EXCLUDED.ordem,
  updated_at = now();

INSERT INTO public.ruja_modulos (chave, nome, descricao, global)
VALUES
  ('dashboard', 'Dashboard', 'Indicadores da plataforma.', false),
  ('membros', 'Membros', 'Pessoas e vinculos da plataforma.', false),
  ('equipe', 'Equipe', 'Responsaveis e colaboradores.', false),
  ('eventos', 'Eventos', 'Agenda e eventos operacionais.', false),
  ('tarefas', 'Tarefas', 'Execucao e acompanhamento de tarefas.', false),
  ('metas', 'Metas', 'Objetivos e acompanhamento.', false),
  ('relatorios', 'Relatorios', 'Relatorios e indicadores.', false),
  ('arquivos', 'Arquivos', 'Materiais e anexos.', false),
  ('aprovacoes', 'Aprovacoes', 'Revisao e aprovacao de entregas.', false),
  ('calendario', 'Calendario', 'Calendario compartilhado ou operacional.', true),
  ('producao', 'Producao', 'Fluxo de producao e publicacao.', false),
  ('financeiro', 'Financeiro', 'Movimentacoes e orcamento.', false),
  ('ia', 'IA contextual', 'Assistente com escopo controlado.', false),
  ('configuracoes', 'Configuracoes', 'Configuracoes da plataforma.', false),
  ('jovens', 'Jovens', 'Gestao de jovens do Nexus.', false),
  ('frequencia', 'Frequencia', 'Frequencia por evento do Nexus.', false),
  ('recuperacao', 'Recuperacao', 'Acompanhamento pastoral do Nexus.', false)
ON CONFLICT (chave) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  global = EXCLUDED.global;

INSERT INTO public.ruja_plataforma_modulos (plataforma_id, modulo_id, ordem)
SELECT p.id, m.id, row_number() over (PARTITION BY p.slug ORDER BY m.chave)
FROM public.ruja_plataformas p
JOIN public.ruja_modulos m ON m.chave = ANY (
  CASE p.slug
    WHEN 'nexus' THEN ARRAY['dashboard','jovens','frequencia','recuperacao','eventos','relatorios','ia','configuracoes']
    WHEN 'midia' THEN ARRAY['dashboard','tarefas','calendario','producao','aprovacoes','arquivos','relatorios']
    WHEN 'central-ebd' THEN ARRAY['dashboard','membros','equipe','eventos','tarefas','arquivos','relatorios']
    WHEN 'contabilidade' THEN ARRAY['dashboard','financeiro','arquivos','aprovacoes','relatorios']
    ELSE ARRAY['dashboard','equipe','eventos','tarefas','relatorios']
  END
)
ON CONFLICT (plataforma_id, modulo_id) DO UPDATE SET ativo = true;

-- Todo perfil existente recebe acesso de transicao ao Nexus. O departamento
-- legado continua sendo usado pelo fluxo atual ate a migracao da navegacao.
INSERT INTO public.ruja_usuario_plataformas (user_id, plataforma_id, role, departamento_id)
SELECT p.id, platform.id,
  CASE p.role
    WHEN 'lider_supremo' THEN 'owner'
    WHEN 'administrador' THEN 'admin'
    WHEN 'lider_departamento' THEN 'gestor'
    WHEN 'voluntario' THEN 'operador'
    ELSE 'visualizador'
  END,
  p.departamento_id
FROM public.ruja_profiles p
JOIN public.ruja_plataformas platform ON platform.slug = 'nexus'
WHERE p.ativo = true
ON CONFLICT (user_id, plataforma_id) DO UPDATE SET
  role = EXCLUDED.role,
  departamento_id = EXCLUDED.departamento_id,
  ativo = true,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.ruja_has_platform_access(target_platform uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ruja_profiles p
    WHERE p.id = auth.uid() AND p.ativo = true
      AND (p.role IN ('lider_supremo', 'administrador') OR EXISTS (
        SELECT 1 FROM public.ruja_usuario_plataformas up
        WHERE up.user_id = auth.uid() AND up.plataforma_id = target_platform AND up.ativo = true
      ))
  );
$$;

CREATE OR REPLACE FUNCTION public.ruja_has_platform_module(target_platform uuid, target_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.ruja_has_platform_access(target_platform) AND EXISTS (
    SELECT 1 FROM public.ruja_plataforma_modulos pm
    JOIN public.ruja_modulos m ON m.id = pm.modulo_id
    WHERE pm.plataforma_id = target_platform AND pm.ativo = true AND m.chave = target_module
  );
$$;

REVOKE ALL ON FUNCTION public.ruja_has_platform_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ruja_has_platform_module(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ruja_has_platform_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruja_has_platform_module(uuid, text) TO authenticated;

ALTER TABLE public.ruja_plataformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruja_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruja_plataforma_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruja_usuario_plataformas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plataformas_select_access ON public.ruja_plataformas;
CREATE POLICY plataformas_select_access ON public.ruja_plataformas FOR SELECT TO authenticated
USING (ativo = true AND (public.ruja_has_platform_access(id) OR public.is_ruja_admin()));

DROP POLICY IF EXISTS modulos_select_access ON public.ruja_modulos;
CREATE POLICY modulos_select_access ON public.ruja_modulos FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS plataforma_modulos_select_access ON public.ruja_plataforma_modulos;
CREATE POLICY plataforma_modulos_select_access ON public.ruja_plataforma_modulos FOR SELECT TO authenticated
USING (public.ruja_has_platform_access(plataforma_id) OR public.is_ruja_admin());

DROP POLICY IF EXISTS usuario_plataformas_select_access ON public.ruja_usuario_plataformas;
CREATE POLICY usuario_plataformas_select_access ON public.ruja_usuario_plataformas FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_lider_supremo());

DROP POLICY IF EXISTS usuario_plataformas_write_access ON public.ruja_usuario_plataformas;
CREATE POLICY usuario_plataformas_write_access ON public.ruja_usuario_plataformas FOR ALL TO authenticated
USING (public.is_lider_supremo()) WITH CHECK (public.is_lider_supremo());

GRANT SELECT ON public.ruja_plataformas, public.ruja_modulos,
  public.ruja_plataforma_modulos, public.ruja_usuario_plataformas TO authenticated;

COMMENT ON TABLE public.ruja_plataformas IS 'Catalogo de plataformas operacionais da RUJA.';
COMMENT ON TABLE public.ruja_usuario_plataformas IS 'Acesso multiplo de usuarios a plataformas, independente do departamento legado.';
