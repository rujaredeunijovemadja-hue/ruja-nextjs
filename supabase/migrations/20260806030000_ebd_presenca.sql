-- RUJA - MIGRATION: chamada da Central EBD
-- Aplicar depois de 20260806020000_ebd.sql.

INSERT INTO public.ruja_modulos (chave, nome, descricao, global)
VALUES ('frequencia', 'Presença', 'Chamada e presença das lições EBD.', false)
ON CONFLICT (chave) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao;

INSERT INTO public.ruja_plataforma_modulos (plataforma_id, modulo_id, ordem)
SELECT p.id, m.id, 8
FROM public.ruja_plataformas p, public.ruja_modulos m
WHERE p.slug = 'central-ebd' AND m.chave = 'frequencia'
ON CONFLICT (plataforma_id, modulo_id) DO UPDATE SET ativo = true;

CREATE TABLE IF NOT EXISTS public.ruja_ebd_presencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  licao_id uuid NOT NULL REFERENCES public.ruja_ebd_licoes(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.ruja_ebd_alunos(id) ON DELETE CASCADE,
  presente boolean NOT NULL DEFAULT true,
  observacao text NOT NULL DEFAULT '',
  registrado_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (licao_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_ruja_ebd_presencas_licao ON public.ruja_ebd_presencas(licao_id, presente);
ALTER TABLE public.ruja_ebd_presencas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ebd_presencas_access ON public.ruja_ebd_presencas;
CREATE POLICY ebd_presencas_access ON public.ruja_ebd_presencas FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'frequencia'))
WITH CHECK (registrado_por = auth.uid() AND public.ruja_has_platform_module(plataforma_id, 'frequencia'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_ebd_presencas TO authenticated;
