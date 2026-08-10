-- RUJA - piloto operacional de Altar
CREATE TABLE IF NOT EXISTS public.ruja_altar_equipe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  nome text NOT NULL, funcao text NOT NULL DEFAULT 'voluntario', contato text NOT NULL DEFAULT '', ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ruja_altar_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  titulo text NOT NULL, descricao text NOT NULL DEFAULT '', prazo date, status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')), responsavel_id uuid REFERENCES public.ruja_altar_equipe(id) ON DELETE SET NULL, criado_por uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ruja_altar_equipe ENABLE ROW LEVEL SECURITY; ALTER TABLE public.ruja_altar_tarefas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS altar_equipe_access ON public.ruja_altar_equipe; CREATE POLICY altar_equipe_access ON public.ruja_altar_equipe FOR ALL TO authenticated USING (public.ruja_has_platform_module(plataforma_id, 'equipe')) WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'equipe'));
DROP POLICY IF EXISTS altar_tarefas_access ON public.ruja_altar_tarefas; CREATE POLICY altar_tarefas_access ON public.ruja_altar_tarefas FOR ALL TO authenticated USING (public.ruja_has_platform_module(plataforma_id, 'tarefas')) WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'tarefas'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_altar_equipe, public.ruja_altar_tarefas TO authenticated;
