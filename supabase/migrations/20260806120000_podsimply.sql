-- RUJA - piloto operacional de PodSimply
CREATE TABLE IF NOT EXISTS public.ruja_podsimply_episodios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  titulo text NOT NULL, descricao text NOT NULL DEFAULT '', convidado text NOT NULL DEFAULT '', data_gravacao date, status text NOT NULL DEFAULT 'pauta' CHECK (status IN ('pauta', 'roteiro', 'gravacao', 'edicao', 'aprovacao', 'publicado', 'cancelado')), link_publicacao text NOT NULL DEFAULT '', criado_por uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ruja_podsimply_episodios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS podsimply_episodios_access ON public.ruja_podsimply_episodios;
CREATE POLICY podsimply_episodios_access ON public.ruja_podsimply_episodios FOR ALL TO authenticated USING (public.ruja_has_platform_module(plataforma_id, 'producao')) WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'producao'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_podsimply_episodios TO authenticated;
