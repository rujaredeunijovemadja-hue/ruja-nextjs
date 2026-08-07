-- ============================================================================
-- RUJA - HOTFIX: permissoes de eventos por autoria e lideranca
-- Execute no SQL Editor do Supabase depois de migration_eventos_frequencia.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION ruja_profile_can_manage_department(target_departamento_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ruja_profiles p
    LEFT JOIN public.ruja_departamentos d ON d.id::text = target_departamento_id
    WHERE p.id = auth.uid()
      AND p.ativo = true
      AND (
        lower(trim(p.role)) IN ('lider_supremo', 'admin')
        OR (
          lower(trim(p.role)) = 'lider_departamento'
          AND (
            lower(coalesce(p.departamento_id, '')) = lower(coalesce(target_departamento_id, ''))
            OR lower(coalesce(p.departamento_id, '')) = lower(coalesce(d.id, ''))
            OR lower(coalesce(p.departamento_id, '')) = lower(coalesce(d.nome, ''))
            OR lower(coalesce(p.departamento_id, '')) = lower(coalesce(d.slug, ''))
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION ruja_profile_can_manage_department(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ruja_profile_can_manage_department(text) TO authenticated;

DROP POLICY IF EXISTS eventos_frequencia_select ON ruja_eventos_frequencia;
CREATE POLICY eventos_frequencia_select ON ruja_eventos_frequencia
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS eventos_frequencia_insert ON ruja_eventos_frequencia;
CREATE POLICY eventos_frequencia_insert ON ruja_eventos_frequencia
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS eventos_frequencia_update ON ruja_eventos_frequencia;
CREATE POLICY eventos_frequencia_update ON ruja_eventos_frequencia
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR ruja_profile_can_manage_department(departamento_id))
  WITH CHECK (created_by = auth.uid() OR ruja_profile_can_manage_department(departamento_id));

DROP POLICY IF EXISTS eventos_frequencia_delete ON ruja_eventos_frequencia;
CREATE POLICY eventos_frequencia_delete ON ruja_eventos_frequencia
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR ruja_profile_can_manage_department(departamento_id));

DROP POLICY IF EXISTS eventos_participantes_select ON ruja_eventos_participantes;
CREATE POLICY eventos_participantes_select ON ruja_eventos_participantes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ruja_eventos_frequencia e
      WHERE e.id = evento_id
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
        AND (
          e.created_by = auth.uid()
          OR ruja_profile_can_manage_department(e.departamento_id)
        )
    )
  );

DROP POLICY IF EXISTS eventos_participantes_update ON ruja_eventos_participantes;
CREATE POLICY eventos_participantes_update ON ruja_eventos_participantes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ruja_eventos_frequencia e
      WHERE e.id = evento_id
        AND (
          e.created_by = auth.uid()
          OR ruja_profile_can_manage_department(e.departamento_id)
        )
    )
  )
  WITH CHECK (
    presente = true
    AND EXISTS (
      SELECT 1 FROM ruja_eventos_frequencia e
      WHERE e.id = evento_id
        AND (
          e.created_by = auth.uid()
          OR ruja_profile_can_manage_department(e.departamento_id)
        )
    )
  );

DROP POLICY IF EXISTS eventos_participantes_delete ON ruja_eventos_participantes;
CREATE POLICY eventos_participantes_delete ON ruja_eventos_participantes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ruja_eventos_frequencia e
      WHERE e.id = evento_id
        AND (
          e.created_by = auth.uid()
          OR ruja_profile_can_manage_department(e.departamento_id)
        )
    )
  );
