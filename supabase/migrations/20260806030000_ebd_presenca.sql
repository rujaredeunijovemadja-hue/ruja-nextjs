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

-- Recreate the EBD base tables when the remote migration history contains
-- 20260806020000 but its objects were not restored in the target schema.
CREATE TABLE IF NOT EXISTS public.ruja_ebd_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  nome text NOT NULL, faixa_etaria text NOT NULL DEFAULT '', descricao text NOT NULL DEFAULT '', ativo boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ruja_ebd_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  classe_id uuid NOT NULL REFERENCES public.ruja_ebd_classes(id) ON DELETE CASCADE, nome text NOT NULL, contato text NOT NULL DEFAULT '', ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ruja_ebd_licoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  classe_id uuid NOT NULL REFERENCES public.ruja_ebd_classes(id) ON DELETE CASCADE, titulo text NOT NULL, data date,
  status text NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada', 'ministrada', 'cancelada')), observacao text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

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
