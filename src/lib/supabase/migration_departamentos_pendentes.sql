-- ════════════════════════════════════════════════════════════════
-- RUJA — MIGRATION: departamentos oficiais + cadastros pendentes
-- Execute no SQL Editor do Supabase
-- Data: 2026-07-03
-- ════════════════════════════════════════════════════════════════

-- Departamentos oficiais atuais: Teens e Simply. UP não é departamento ativo.
ALTER TABLE ruja_departamentos
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS lider_id uuid NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE ruja_departamentos
SET slug = lower(regexp_replace(nome, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

UPDATE ruja_departamentos SET slug = 'teens' WHERE lower(nome) = 'teens';
UPDATE ruja_departamentos SET slug = 'simply' WHERE lower(nome) = 'simply';

CREATE UNIQUE INDEX IF NOT EXISTS idx_ruja_departamentos_slug
ON ruja_departamentos(slug)
WHERE slug IS NOT NULL;

INSERT INTO ruja_departamentos (id, nome, slug, descricao, ativo, icone, lider, capacidade)
VALUES
  ('teens', 'Teens', 'teens', 'Departamento Teens da RUJA', true, '👦', '', 0),
  ('simply', 'Simply', 'simply', 'Departamento Simply da RUJA', true, '🌱', '', 0)
ON CONFLICT (slug) DO UPDATE
SET nome = EXCLUDED.nome,
    descricao = COALESCE(ruja_departamentos.descricao, EXCLUDED.descricao),
    ativo = true,
    updated_at = now();

-- Não desativa, migra nem remove UP automaticamente.
-- Antes de qualquer ação sobre dados reais de UP, consulte a view de impacto abaixo.

CREATE TABLE IF NOT EXISTS ruja_cadastros_pendentes (
  id text primary key,
  nome text not null,
  telefone text,
  email text,
  data_nascimento text,
  departamento_id text not null references ruja_departamentos(id),
  foto_path text,
  responsavel_nome text,
  responsavel_telefone text,
  observacoes text,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'rejeitado')),
  aprovado_por uuid null references auth.users(id),
  aprovado_em timestamptz null,
  rejeitado_por uuid null references auth.users(id),
  rejeitado_em timestamptz null,
  motivo_rejeicao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_ruja_cadastros_pendentes_status
ON ruja_cadastros_pendentes(status);

CREATE INDEX IF NOT EXISTS idx_ruja_cadastros_pendentes_departamento
ON ruja_cadastros_pendentes(departamento_id);

ALTER TABLE ruja_cadastros_pendentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cadastros_pendentes_public_insert" ON ruja_cadastros_pendentes
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pendente'
    AND EXISTS (
      SELECT 1
      FROM ruja_departamentos d
      WHERE d.id = departamento_id
        AND d.ativo = true
        AND d.slug IN ('teens', 'simply')
    )
  );

CREATE POLICY "cadastros_pendentes_select_auth" ON ruja_cadastros_pendentes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "cadastros_pendentes_update_auth" ON ruja_cadastros_pendentes
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (status IN ('pendente', 'aprovado', 'rejeitado'));

CREATE OR REPLACE VIEW ruja_up_impact_report AS
SELECT
  (SELECT count(*) FROM ruja_jovens WHERE lower(coalesce(departamento, '')) LIKE '%up%') AS jovens_vinculados,
  (
    SELECT count(*)
    FROM ruja_frequencias f
    JOIN ruja_jovens j ON j.id = f.jovem_id
    WHERE lower(coalesce(j.departamento, '')) LIKE '%up%'
  ) AS frequencias_vinculadas,
  (
    SELECT count(*)
    FROM ruja_recuperacoes r
    JOIN ruja_jovens j ON j.id = r.jovem_id
    WHERE lower(coalesce(j.departamento, '')) LIKE '%up%'
  ) AS recuperacoes_vinculadas,
  (SELECT count(*) FROM ruja_lideres WHERE lower(coalesce(departamento, '')) LIKE '%up%') AS lideres_vinculados,
  (
    SELECT count(*)
    FROM ruja_departamentos
    WHERE lower(coalesce(nome, '')) = 'up'
       OR lower(coalesce(slug, '')) = 'up'
  ) AS departamentos_up;

COMMENT ON VIEW ruja_up_impact_report IS
'Relatório de impacto para dados reais vinculados a UP. Não migra nem remove dados automaticamente.';
