-- RUJA - piloto operacional de Palestras
CREATE TABLE IF NOT EXISTS public.ruja_palestras_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  titulo text NOT NULL, descricao text NOT NULL DEFAULT '', data date NOT NULL, horario time, local text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'cancelada')), criado_por uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ruja_palestras_palestrantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE, nome text NOT NULL, contato text NOT NULL DEFAULT '', bio text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ruja_palestras_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE, evento_id uuid NOT NULL REFERENCES public.ruja_palestras_eventos(id) ON DELETE CASCADE, titulo text NOT NULL, url text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ruja_palestras_eventos ENABLE ROW LEVEL SECURITY; ALTER TABLE public.ruja_palestras_palestrantes ENABLE ROW LEVEL SECURITY; ALTER TABLE public.ruja_palestras_materiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS palestras_eventos_access ON public.ruja_palestras_eventos; CREATE POLICY palestras_eventos_access ON public.ruja_palestras_eventos FOR ALL TO authenticated USING (public.ruja_has_platform_module(plataforma_id, 'eventos')) WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'eventos'));
DROP POLICY IF EXISTS palestras_palestrantes_access ON public.ruja_palestras_palestrantes; CREATE POLICY palestras_palestrantes_access ON public.ruja_palestras_palestrantes FOR ALL TO authenticated USING (public.ruja_has_platform_module(plataforma_id, 'equipe')) WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'equipe'));
DROP POLICY IF EXISTS palestras_materiais_access ON public.ruja_palestras_materiais; CREATE POLICY palestras_materiais_access ON public.ruja_palestras_materiais FOR ALL TO authenticated USING (public.ruja_has_platform_module(plataforma_id, 'arquivos')) WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'arquivos'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_palestras_eventos, public.ruja_palestras_palestrantes, public.ruja_palestras_materiais TO authenticated;
