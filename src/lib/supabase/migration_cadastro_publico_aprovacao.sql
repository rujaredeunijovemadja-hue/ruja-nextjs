-- ============================================================================
-- RUJA - MIGRATION: cadastro publico e aprovacao por departamento
-- Execute depois de migration_cargos_permissoes.sql. Pode ser repetida.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- IDs antigos foram gerados com crypto.randomUUID(). A conversao explicita
-- preserva os registros e passa a garantir UUID no banco.
ALTER TABLE public.ruja_cadastros_pendentes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.ruja_cadastros_pendentes
  ALTER COLUMN id TYPE uuid USING id::uuid;
ALTER TABLE public.ruja_cadastros_pendentes
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ruja_cadastros_pendentes'
      AND column_name = 'data_nascimento'
      AND data_type <> 'date'
  ) THEN
    ALTER TABLE public.ruja_cadastros_pendentes
      ALTER COLUMN data_nascimento TYPE date
      USING CASE
        WHEN data_nascimento ~ '^\d{4}-\d{2}-\d{2}$' THEN data_nascimento::date
        ELSE NULL
      END;
  END IF;
END $$;

ALTER TABLE public.ruja_cadastros_pendentes
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS tempo_ruja text,
  ADD COLUMN IF NOT EXISTS batizado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_batismo date,
  ADD COLUMN IF NOT EXISTS consentimento_dados boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autorizacao_responsavel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS possivel_duplicidade boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicidade_detalhes jsonb,
  ADD COLUMN IF NOT EXISTS solicitacao_correcao text,
  ADD COLUMN IF NOT EXISTS campos_correcao text[],
  ADD COLUMN IF NOT EXISTS observacao_administrativa text,
  ADD COLUMN IF NOT EXISTS jovem_id_criado text,
  ADD COLUMN IF NOT EXISTS submission_token uuid,
  ADD COLUMN IF NOT EXISTS nome_normalizado text,
  ADD COLUMN IF NOT EXISTS telefone_normalizado text,
  ADD COLUMN IF NOT EXISTS email_normalizado text;

ALTER TABLE public.ruja_cadastros_pendentes DROP CONSTRAINT IF EXISTS ruja_cadastros_pendentes_status_check;
ALTER TABLE public.ruja_cadastros_pendentes
  ADD CONSTRAINT ruja_cadastros_pendentes_status_check
  CHECK (status IN ('pendente', 'em_analise', 'correcao_solicitada', 'aprovado', 'rejeitado'));

UPDATE public.ruja_cadastros_pendentes
SET
  nome_normalizado = trim(regexp_replace(lower(unaccent(coalesce(nome, ''))), '[^a-z0-9]+', ' ', 'g')),
  telefone_normalizado = regexp_replace(coalesce(telefone, ''), '[^0-9]+', '', 'g'),
  email_normalizado = nullif(lower(trim(coalesce(email, ''))), '')
WHERE nome_normalizado IS NULL OR telefone_normalizado IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ruja_cadastros_submission_token
  ON public.ruja_cadastros_pendentes(submission_token)
  WHERE submission_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ruja_cadastros_nome_nascimento
  ON public.ruja_cadastros_pendentes(nome_normalizado, data_nascimento);
CREATE INDEX IF NOT EXISTS idx_ruja_cadastros_telefone_normalizado
  ON public.ruja_cadastros_pendentes(telefone_normalizado);
CREATE INDEX IF NOT EXISTS idx_ruja_cadastros_email_normalizado
  ON public.ruja_cadastros_pendentes(email_normalizado)
  WHERE email_normalizado IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ruja_cadastros_created_at
  ON public.ruja_cadastros_pendentes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ruja_cadastros_duplicidade
  ON public.ruja_cadastros_pendentes(possivel_duplicidade)
  WHERE possivel_duplicidade = true;

CREATE TABLE IF NOT EXISTS public.ruja_cadastro_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id uuid NOT NULL REFERENCES public.ruja_cadastros_pendentes(id) ON DELETE CASCADE,
  acao text NOT NULL CHECK (acao IN (
    'cadastro_publico_enviado', 'cadastro_em_analise', 'cadastro_aprovado',
    'cadastro_rejeitado', 'correcao_solicitada', 'duplicidade_identificada'
  )),
  usuario_id uuid REFERENCES auth.users(id),
  jovem_id text,
  departamento_id text,
  motivo text,
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ruja_cadastro_acoes_cadastro
  ON public.ruja_cadastro_acoes(cadastro_id, created_at DESC);

-- Bucket privado: somente APIs server-side com service_role fazem upload.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ruja-cadastros-pendentes',
  'ruja-cadastros-pendentes',
  false,
  5242880,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- O formulario publico nao escreve diretamente no PostgREST. A API valida,
-- converte a foto e usa service_role exclusivamente no servidor.
ALTER TABLE public.ruja_cadastros_pendentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cadastros_pendentes_public_insert ON public.ruja_cadastros_pendentes;
DROP POLICY IF EXISTS cadastros_pendentes_update_auth ON public.ruja_cadastros_pendentes;
REVOKE INSERT, UPDATE, DELETE ON public.ruja_cadastros_pendentes FROM anon, authenticated;
GRANT SELECT ON public.ruja_cadastros_pendentes TO authenticated;

DROP POLICY IF EXISTS cadastros_pendentes_select_auth ON public.ruja_cadastros_pendentes;
CREATE POLICY cadastros_pendentes_select_auth
ON public.ruja_cadastros_pendentes FOR SELECT TO authenticated USING (
  public.is_ruja_admin()
  OR (
    public.current_ruja_role() = 'lider_departamento'
    AND public.can_access_departamento(departamento_id)
  )
);

ALTER TABLE public.ruja_cadastro_acoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cadastro_acoes_select_access ON public.ruja_cadastro_acoes;
CREATE POLICY cadastro_acoes_select_access
ON public.ruja_cadastro_acoes FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.ruja_cadastros_pendentes cadastro
    WHERE cadastro.id = cadastro_id
  )
);
REVOKE INSERT, UPDATE, DELETE ON public.ruja_cadastro_acoes FROM anon, authenticated;
GRANT SELECT ON public.ruja_cadastro_acoes TO authenticated;

COMMENT ON TABLE public.ruja_cadastros_pendentes IS
'Cadastros enviados pela API publica. Nunca cria jovem diretamente.';
COMMENT ON TABLE public.ruja_cadastro_acoes IS
'Historico imutavel das decisoes tomadas em cada cadastro publico.';
