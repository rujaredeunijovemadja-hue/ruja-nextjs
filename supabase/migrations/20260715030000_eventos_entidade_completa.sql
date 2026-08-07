-- ============================================================================
-- RUJA — MIGRATION: eventos como entidade completa
-- Complementa ruja_eventos_frequencia sem apagar dados existentes.
-- ============================================================================

ALTER TABLE ruja_eventos_frequencia
  ADD COLUMN IF NOT EXISTS hora_inicio time NULL,
  ADD COLUMN IF NOT EXISTS hora_termino time NULL,
  ADD COLUMN IF NOT EXISTS local text NULL,
  ADD COLUMN IF NOT EXISTS descricao text NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Agendado',
  ADD COLUMN IF NOT EXISTS departamentos_envolvidos text[] NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ruja_eventos_frequencia_status_check'
  ) THEN
    ALTER TABLE ruja_eventos_frequencia
      ADD CONSTRAINT ruja_eventos_frequencia_status_check
      CHECK (status IN ('Agendado', 'Em andamento', 'Finalizado', 'Cancelado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ruja_eventos_frequencia_status
  ON ruja_eventos_frequencia(status);

CREATE INDEX IF NOT EXISTS idx_ruja_eventos_frequencia_departamentos_envolvidos
  ON ruja_eventos_frequencia USING gin(departamentos_envolvidos);

COMMENT ON COLUMN ruja_eventos_frequencia.hora_inicio IS 'Hora planejada/real de início do evento.';
COMMENT ON COLUMN ruja_eventos_frequencia.hora_termino IS 'Hora planejada/real de término do evento.';
COMMENT ON COLUMN ruja_eventos_frequencia.local IS 'Local onde o evento acontece ou aconteceu.';
COMMENT ON COLUMN ruja_eventos_frequencia.descricao IS 'Descrição pastoral/operacional do evento.';
COMMENT ON COLUMN ruja_eventos_frequencia.status IS 'Status operacional do evento: Agendado, Em andamento, Finalizado ou Cancelado.';
COMMENT ON COLUMN ruja_eventos_frequencia.departamentos_envolvidos IS 'Departamentos/ministérios envolvidos em eventos gerais da RUJA.';
