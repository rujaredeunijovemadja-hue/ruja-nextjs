-- RUJA - piloto operacional de Happy Hour
CREATE TABLE IF NOT EXISTS public.ruja_happy_hour_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id) ON DELETE CASCADE,
  titulo text NOT NULL, descricao text NOT NULL DEFAULT '', data date NOT NULL, local text NOT NULL DEFAULT '', limite_pessoas integer CHECK (limite_pessoas IS NULL OR limite_pessoas > 0), status text NOT NULL DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'confirmado', 'realizado', 'cancelado')), criado_por uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ruja_happy_hour_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS happy_hour_eventos_access ON public.ruja_happy_hour_eventos;
CREATE POLICY happy_hour_eventos_access ON public.ruja_happy_hour_eventos FOR ALL TO authenticated USING (public.ruja_has_platform_module(plataforma_id, 'eventos')) WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'eventos'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_happy_hour_eventos TO authenticated;
