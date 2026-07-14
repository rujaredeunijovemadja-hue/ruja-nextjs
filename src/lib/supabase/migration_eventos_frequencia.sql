-- ============================================================================
-- RUJA — MIGRATION: histórico de frequência por evento
-- Execute no SQL Editor do Supabase. Não apaga nem migra ruja_frequencias.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE ruja_departamentos ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE ruja_departamentos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE ruja_departamentos ADD COLUMN IF NOT EXISTS lider_id uuid NULL;
UPDATE ruja_departamentos
SET slug = lower(regexp_replace(unaccent(nome), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

CREATE TABLE IF NOT EXISTS ruja_eventos_frequencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  data date NOT NULL,
  departamento_id text NULL,
  lider_responsavel_id text NULL,
  tipo text NULL,
  observacao text NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ruja_eventos_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES ruja_eventos_frequencia(id) ON DELETE CASCADE,
  jovem_id text NOT NULL,
  presente boolean NOT NULL DEFAULT true,
  observacao text NULL,
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ruja_eventos_participantes_evento_jovem_unique UNIQUE (evento_id, jovem_id)
);

CREATE INDEX IF NOT EXISTS idx_ruja_eventos_frequencia_data ON ruja_eventos_frequencia(data DESC);
CREATE INDEX IF NOT EXISTS idx_ruja_eventos_frequencia_departamento ON ruja_eventos_frequencia(departamento_id);
CREATE INDEX IF NOT EXISTS idx_ruja_eventos_frequencia_lider ON ruja_eventos_frequencia(lider_responsavel_id);
CREATE INDEX IF NOT EXISTS idx_ruja_eventos_participantes_evento ON ruja_eventos_participantes(evento_id);
CREATE INDEX IF NOT EXISTS idx_ruja_eventos_participantes_jovem ON ruja_eventos_participantes(jovem_id);

CREATE OR REPLACE FUNCTION ruja_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ruja_eventos_frequencia_updated_at ON ruja_eventos_frequencia;
CREATE TRIGGER trg_ruja_eventos_frequencia_updated_at
BEFORE UPDATE ON ruja_eventos_frequencia
FOR EACH ROW EXECUTE FUNCTION ruja_touch_updated_at();

DROP TRIGGER IF EXISTS trg_ruja_eventos_participantes_updated_at ON ruja_eventos_participantes;
CREATE TRIGGER trg_ruja_eventos_participantes_updated_at
BEFORE UPDATE ON ruja_eventos_participantes
FOR EACH ROW EXECUTE FUNCTION ruja_touch_updated_at();

CREATE OR REPLACE FUNCTION ruja_profile_can_manage_department(target_departamento_id text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ruja_profiles p
    LEFT JOIN ruja_departamentos d ON d.id::text = target_departamento_id
    WHERE p.id = auth.uid()
      AND p.ativo = true
      AND (
        p.role IN ('lider_supremo', 'admin')
        OR (
          p.role = 'lider_departamento'
          AND (
            target_departamento_id IS NULL
            OR lower(coalesce(p.departamento_id, '')) = lower(coalesce(target_departamento_id, ''))
            OR lower(coalesce(p.departamento_id, '')) = lower(coalesce(d.id, ''))
            OR lower(coalesce(p.departamento_id, '')) = lower(coalesce(d.nome, ''))
            OR lower(coalesce(p.departamento_id, '')) = lower(coalesce(d.slug, ''))
          )
        )
      )
  );
$$ LANGUAGE sql SECURITY DEFINER;

ALTER TABLE ruja_eventos_frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruja_eventos_participantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eventos_frequencia_select ON ruja_eventos_frequencia;
CREATE POLICY eventos_frequencia_select ON ruja_eventos_frequencia
  FOR SELECT TO authenticated
  USING (ruja_profile_can_manage_department(departamento_id));

DROP POLICY IF EXISTS eventos_frequencia_insert ON ruja_eventos_frequencia;
CREATE POLICY eventos_frequencia_insert ON ruja_eventos_frequencia
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND ruja_profile_can_manage_department(departamento_id));

DROP POLICY IF EXISTS eventos_frequencia_update ON ruja_eventos_frequencia;
CREATE POLICY eventos_frequencia_update ON ruja_eventos_frequencia
  FOR UPDATE TO authenticated
  USING (ruja_profile_can_manage_department(departamento_id))
  WITH CHECK (ruja_profile_can_manage_department(departamento_id));

DROP POLICY IF EXISTS eventos_frequencia_delete ON ruja_eventos_frequencia;
CREATE POLICY eventos_frequencia_delete ON ruja_eventos_frequencia
  FOR DELETE TO authenticated
  USING (ruja_profile_can_manage_department(departamento_id));

DROP POLICY IF EXISTS eventos_participantes_select ON ruja_eventos_participantes;
CREATE POLICY eventos_participantes_select ON ruja_eventos_participantes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ruja_eventos_frequencia e
      WHERE e.id = evento_id
        AND ruja_profile_can_manage_department(e.departamento_id)
    )
  );

DROP POLICY IF EXISTS eventos_participantes_insert ON ruja_eventos_participantes;
CREATE POLICY eventos_participantes_insert ON ruja_eventos_participantes
  FOR INSERT TO authenticated
  WITH CHECK (
    registrado_por = auth.uid()
    AND presente = true
    AND EXISTS (
      SELECT 1 FROM ruja_eventos_frequencia e
      WHERE e.id = evento_id
        AND ruja_profile_can_manage_department(e.departamento_id)
    )
  );

DROP POLICY IF EXISTS eventos_participantes_update ON ruja_eventos_participantes;
CREATE POLICY eventos_participantes_update ON ruja_eventos_participantes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ruja_eventos_frequencia e
      WHERE e.id = evento_id
        AND ruja_profile_can_manage_department(e.departamento_id)
    )
  )
  WITH CHECK (
    presente = true
    AND EXISTS (
      SELECT 1 FROM ruja_eventos_frequencia e
      WHERE e.id = evento_id
        AND ruja_profile_can_manage_department(e.departamento_id)
    )
  );

DROP POLICY IF EXISTS eventos_participantes_delete ON ruja_eventos_participantes;
CREATE POLICY eventos_participantes_delete ON ruja_eventos_participantes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ruja_eventos_frequencia e
      WHERE e.id = evento_id
        AND ruja_profile_can_manage_department(e.departamento_id)
    )
  );

-- Relatório de impacto do legado: agrupa por data + nome normalizado e aponta
-- duplicidades/conflitos sem alterar dados antigos.
CREATE OR REPLACE VIEW ruja_frequencia_legado_impact_report AS
WITH base AS (
  SELECT
    f.id,
    f.jovem_id,
    CASE
      WHEN f.data ~ '^\d{4}-\d{2}-\d{2}' THEN f.data::date
      ELSE NULL
    END AS data,
    f.evento,
    lower(regexp_replace(unaccent(coalesce(f.evento, 'sem_evento')), '[^a-z0-9]+', ' ', 'g')) AS evento_normalizado,
    f.presenca,
    j.departamento
  FROM ruja_frequencias f
  LEFT JOIN ruja_jovens j ON j.id = f.jovem_id
),
grupos AS (
  SELECT
    data,
    trim(evento_normalizado) AS evento_normalizado,
    array_agg(DISTINCT evento ORDER BY evento) AS nomes_encontrados,
    count(*) AS registros,
    count(*) FILTER (WHERE presenca = 'presente') AS presentes,
    count(*) FILTER (WHERE presenca = 'falta') AS faltas,
    count(DISTINCT jovem_id) AS jovens_distintos,
    count(DISTINCT departamento) AS departamentos_distintos
  FROM base
  GROUP BY data, trim(evento_normalizado)
),
conflitos AS (
  SELECT data, trim(evento_normalizado) AS evento_normalizado, jovem_id, count(DISTINCT presenca) AS estados
  FROM base
  GROUP BY data, trim(evento_normalizado), jovem_id
  HAVING count(DISTINCT presenca) > 1
)
SELECT
  g.*,
  EXISTS (
    SELECT 1 FROM grupos outro
    WHERE outro.data = g.data
      AND outro.evento_normalizado <> g.evento_normalizado
      AND similarity(outro.evento_normalizado, g.evento_normalizado) > 0.72
  ) AS possivel_evento_duplicado,
  COALESCE((SELECT count(*) FROM conflitos c WHERE c.data = g.data AND c.evento_normalizado = g.evento_normalizado), 0) AS conflitos_jovem_data_evento
FROM grupos g
ORDER BY data DESC, registros DESC;

CREATE OR REPLACE FUNCTION ruja_preview_migracao_frequencia_legado()
RETURNS TABLE (
  data date,
  evento_normalizado text,
  nomes_encontrados text[],
  registros bigint,
  presentes bigint,
  faltas bigint,
  conflitos_jovem_data_evento bigint
) AS $$
  SELECT data, evento_normalizado, nomes_encontrados, registros, presentes, faltas, conflitos_jovem_data_evento
  FROM ruja_frequencia_legado_impact_report
  ORDER BY data DESC, registros DESC;
$$ LANGUAGE sql STABLE;

COMMENT ON TABLE ruja_eventos_frequencia IS 'Eventos oficiais de frequência RUJA. O novo sistema escreve aqui, um card por evento.';
COMMENT ON TABLE ruja_eventos_participantes IS 'Participantes presentes por evento. Ausência é implícita, calculada pela ausência do jovem ativo nesta tabela.';
COMMENT ON VIEW ruja_frequencia_legado_impact_report IS 'Relatório de impacto do legado ruja_frequencias para migração controlada. Não altera dados.';
