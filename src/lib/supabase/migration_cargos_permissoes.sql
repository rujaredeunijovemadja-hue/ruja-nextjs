-- ============================================================================
-- RUJA - MIGRATION: cargos e permissoes por departamento
-- Execute no SQL Editor do Supabase depois de migration_profiles.sql.
-- Pode ser repetida. Nao desativa usuarios nem troca o Lider Supremo.
-- ============================================================================

-- Relatorio anterior as restricoes. Consulte com:
-- select * from public.ruja_profiles_access_impact_report;
CREATE OR REPLACE VIEW public.ruja_profiles_access_impact_report AS
SELECT
  p.id,
  p.nome,
  p.email,
  p.role AS role_atual,
  CASE WHEN p.role = 'admin' THEN 'administrador' ELSE p.role END AS role_normalizada,
  p.departamento_id,
  p.ativo,
  p.role IS NULL OR p.role NOT IN (
    'lider_supremo', 'admin', 'administrador', 'lider_departamento', 'voluntario', 'visualizador'
  ) AS role_invalida,
  p.role IN ('lider_departamento', 'voluntario', 'visualizador')
    AND coalesce(p.departamento_id, '') NOT IN ('teens', 'simply') AS departamento_obrigatorio_ausente,
  p.departamento_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.ruja_departamentos d WHERE d.id = p.departamento_id
  ) AS departamento_inexistente
FROM public.ruja_profiles p
ORDER BY p.created_at, p.nome;

ALTER VIEW public.ruja_profiles_access_impact_report SET (security_invoker = true);
REVOKE ALL ON public.ruja_profiles_access_impact_report FROM anon, authenticated;

ALTER TABLE public.ruja_profiles DROP CONSTRAINT IF EXISTS ruja_profiles_role_check;
UPDATE public.ruja_profiles SET role = 'administrador', updated_at = now() WHERE role = 'admin';
UPDATE public.ruja_profiles SET role = 'voluntario', updated_at = now()
WHERE role IS NULL OR role NOT IN (
  'lider_supremo', 'administrador', 'lider_departamento', 'voluntario', 'visualizador'
);
ALTER TABLE public.ruja_profiles
  ADD CONSTRAINT ruja_profiles_role_check
  CHECK (role IN ('lider_supremo', 'administrador', 'lider_departamento', 'voluntario', 'visualizador'));

CREATE INDEX IF NOT EXISTS idx_ruja_profiles_role ON public.ruja_profiles(role);
CREATE INDEX IF NOT EXISTS idx_ruja_profiles_departamento ON public.ruja_profiles(departamento_id);

CREATE OR REPLACE FUNCTION public.current_ruja_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p.role = 'admin' THEN 'administrador' ELSE p.role END
  FROM public.ruja_profiles p
  WHERE p.id = auth.uid() AND p.ativo = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_ruja_departamento_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.departamento_id FROM public.ruja_profiles p
  WHERE p.id = auth.uid() AND p.ativo = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_lider_supremo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.current_ruja_role() = 'lider_supremo', false);
$$;

CREATE OR REPLACE FUNCTION public.is_ruja_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.current_ruja_role() IN ('lider_supremo', 'administrador'), false);
$$;

CREATE OR REPLACE FUNCTION public.ruja_user_is_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.ruja_profiles p WHERE p.id = auth.uid() AND p.ativo = true);
$$;

CREATE OR REPLACE FUNCTION public.can_access_departamento(target_departamento_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.ruja_user_is_active() AND (
    public.is_ruja_admin()
    OR (
      target_departamento_id IS NOT NULL
      AND public.current_ruja_departamento_id() = target_departamento_id
      AND public.current_ruja_departamento_id() IN ('teens', 'simply')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.ruja_tags_include_departamento(tags text, target_departamento_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ruja_departamentos d
    WHERE d.id = target_departamento_id
      AND EXISTS (
        SELECT 1 FROM regexp_split_to_table(coalesce(tags, ''), ';') item
        WHERE lower(trim(item)) IN (lower(d.id), lower(d.nome), lower(coalesce(d.slug, '')))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.current_ruja_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_ruja_departamento_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_lider_supremo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_ruja_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ruja_user_is_active() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_departamento(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ruja_tags_include_departamento(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_ruja_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_ruja_departamento_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lider_supremo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ruja_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruja_user_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_departamento(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruja_tags_include_departamento(text, text) TO authenticated;

-- Perfis: cada usuario ve o proprio perfil; somente o Lider Supremo lista todos.
ALTER TABLE public.ruja_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select ON public.ruja_profiles;
CREATE POLICY profiles_select ON public.ruja_profiles FOR SELECT TO authenticated
USING (public.ruja_user_is_active() AND (id = auth.uid() OR public.is_lider_supremo()));

-- Jovens.
ALTER TABLE public.ruja_jovens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jovens_select_access ON public.ruja_jovens;
DROP POLICY IF EXISTS jovens_insert_access ON public.ruja_jovens;
DROP POLICY IF EXISTS jovens_update_access ON public.ruja_jovens;
DROP POLICY IF EXISTS jovens_delete_access ON public.ruja_jovens;
CREATE POLICY jovens_select_access ON public.ruja_jovens FOR SELECT TO authenticated USING (
  public.ruja_user_is_active() AND (
    public.is_ruja_admin() OR public.ruja_tags_include_departamento(departamento, public.current_ruja_departamento_id())
  )
);
CREATE POLICY jovens_insert_access ON public.ruja_jovens FOR INSERT TO authenticated WITH CHECK (
  public.is_ruja_admin() OR (
    public.current_ruja_role() = 'lider_departamento'
    AND public.ruja_tags_include_departamento(departamento, public.current_ruja_departamento_id())
  )
);
CREATE POLICY jovens_update_access ON public.ruja_jovens FOR UPDATE TO authenticated
USING (public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND public.ruja_tags_include_departamento(departamento, public.current_ruja_departamento_id())))
WITH CHECK (public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND public.ruja_tags_include_departamento(departamento, public.current_ruja_departamento_id())));
CREATE POLICY jovens_delete_access ON public.ruja_jovens FOR DELETE TO authenticated USING (
  public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND public.ruja_tags_include_departamento(departamento, public.current_ruja_departamento_id()))
);

-- Frequencias legadas herdam o departamento do jovem.
ALTER TABLE public.ruja_frequencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS frequencias_select_access ON public.ruja_frequencias;
DROP POLICY IF EXISTS frequencias_insert_access ON public.ruja_frequencias;
DROP POLICY IF EXISTS frequencias_update_access ON public.ruja_frequencias;
DROP POLICY IF EXISTS frequencias_delete_access ON public.ruja_frequencias;
CREATE POLICY frequencias_select_access ON public.ruja_frequencias FOR SELECT TO authenticated USING (
  public.is_ruja_admin() OR EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id)
);
CREATE POLICY frequencias_insert_access ON public.ruja_frequencias FOR INSERT TO authenticated WITH CHECK (
  public.is_ruja_admin() OR (public.current_ruja_role() IN ('lider_departamento', 'voluntario') AND EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id))
);
CREATE POLICY frequencias_update_access ON public.ruja_frequencias FOR UPDATE TO authenticated
USING (public.is_ruja_admin() OR (public.current_ruja_role() IN ('lider_departamento', 'voluntario') AND EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id)))
WITH CHECK (public.is_ruja_admin() OR (public.current_ruja_role() IN ('lider_departamento', 'voluntario') AND EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id)));
CREATE POLICY frequencias_delete_access ON public.ruja_frequencias FOR DELETE TO authenticated USING (
  public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id))
);

-- Eventos e participantes. Eventos gerais sao visiveis quando abrangem o
-- departamento do perfil; array nulo em evento geral significa toda a RUJA.
ALTER TABLE public.ruja_eventos_frequencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eventos_frequencia_select ON public.ruja_eventos_frequencia;
DROP POLICY IF EXISTS eventos_frequencia_insert ON public.ruja_eventos_frequencia;
DROP POLICY IF EXISTS eventos_frequencia_update ON public.ruja_eventos_frequencia;
DROP POLICY IF EXISTS eventos_frequencia_delete ON public.ruja_eventos_frequencia;
CREATE POLICY eventos_frequencia_select ON public.ruja_eventos_frequencia FOR SELECT TO authenticated USING (
  public.ruja_user_is_active() AND (
    public.is_ruja_admin()
    OR public.can_access_departamento(departamento_id)
    OR (departamento_id IS NULL AND (departamentos_envolvidos IS NULL OR public.current_ruja_departamento_id() = ANY(departamentos_envolvidos)))
  )
);
CREATE POLICY eventos_frequencia_insert ON public.ruja_eventos_frequencia FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND (
    public.is_ruja_admin()
    OR (public.current_ruja_role() = 'lider_departamento' AND departamento_id = public.current_ruja_departamento_id())
  )
);
CREATE POLICY eventos_frequencia_update ON public.ruja_eventos_frequencia FOR UPDATE TO authenticated
USING (public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND departamento_id = public.current_ruja_departamento_id()))
WITH CHECK (public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND departamento_id = public.current_ruja_departamento_id()));
CREATE POLICY eventos_frequencia_delete ON public.ruja_eventos_frequencia FOR DELETE TO authenticated USING (
  public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND departamento_id = public.current_ruja_departamento_id())
);

ALTER TABLE public.ruja_eventos_participantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eventos_participantes_select ON public.ruja_eventos_participantes;
DROP POLICY IF EXISTS eventos_participantes_insert ON public.ruja_eventos_participantes;
DROP POLICY IF EXISTS eventos_participantes_update ON public.ruja_eventos_participantes;
DROP POLICY IF EXISTS eventos_participantes_delete ON public.ruja_eventos_participantes;
CREATE POLICY eventos_participantes_select ON public.ruja_eventos_participantes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ruja_eventos_frequencia e WHERE e.id = evento_id)
);
CREATE POLICY eventos_participantes_insert ON public.ruja_eventos_participantes FOR INSERT TO authenticated WITH CHECK (
  registrado_por = auth.uid() AND presente = true AND public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento', 'voluntario')
  AND EXISTS (SELECT 1 FROM public.ruja_eventos_frequencia e WHERE e.id = evento_id)
  AND EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id)
);
CREATE POLICY eventos_participantes_update ON public.ruja_eventos_participantes FOR UPDATE TO authenticated
USING (public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento', 'voluntario') AND EXISTS (SELECT 1 FROM public.ruja_eventos_frequencia e WHERE e.id = evento_id))
WITH CHECK (presente = true AND EXISTS (SELECT 1 FROM public.ruja_eventos_frequencia e WHERE e.id = evento_id));
CREATE POLICY eventos_participantes_delete ON public.ruja_eventos_participantes FOR DELETE TO authenticated USING (
  public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento') AND EXISTS (SELECT 1 FROM public.ruja_eventos_frequencia e WHERE e.id = evento_id)
);

-- Recuperacao herda o escopo do jovem.
ALTER TABLE public.ruja_recuperacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recuperacoes_select_access ON public.ruja_recuperacoes;
DROP POLICY IF EXISTS recuperacoes_insert_access ON public.ruja_recuperacoes;
DROP POLICY IF EXISTS recuperacoes_update_access ON public.ruja_recuperacoes;
DROP POLICY IF EXISTS recuperacoes_delete_access ON public.ruja_recuperacoes;
CREATE POLICY recuperacoes_select_access ON public.ruja_recuperacoes FOR SELECT TO authenticated USING (
  public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id))
);
CREATE POLICY recuperacoes_insert_access ON public.ruja_recuperacoes FOR INSERT TO authenticated WITH CHECK (
  public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id))
);
CREATE POLICY recuperacoes_update_access ON public.ruja_recuperacoes FOR UPDATE TO authenticated
USING (public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id)))
WITH CHECK (public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id)));
CREATE POLICY recuperacoes_delete_access ON public.ruja_recuperacoes FOR DELETE TO authenticated USING (
  public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND EXISTS (SELECT 1 FROM public.ruja_jovens j WHERE j.id = jovem_id))
);

-- Cadastros pendentes: leitura por escopo; decisoes passam pelas APIs server-side.
ALTER TABLE public.ruja_cadastros_pendentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cadastros_pendentes_select_auth ON public.ruja_cadastros_pendentes;
DROP POLICY IF EXISTS cadastros_pendentes_update_auth ON public.ruja_cadastros_pendentes;
CREATE POLICY cadastros_pendentes_select_auth ON public.ruja_cadastros_pendentes FOR SELECT TO authenticated USING (
  public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND public.can_access_departamento(departamento_id))
);
REVOKE INSERT, UPDATE, DELETE ON public.ruja_cadastros_pendentes FROM anon, authenticated;

-- Dados auxiliares usados pelo painel.
ALTER TABLE public.ruja_lideres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lideres_select_access ON public.ruja_lideres;
DROP POLICY IF EXISTS lideres_write_access ON public.ruja_lideres;
CREATE POLICY lideres_select_access ON public.ruja_lideres FOR SELECT TO authenticated USING (
  public.is_ruja_admin() OR public.ruja_tags_include_departamento(departamento, public.current_ruja_departamento_id())
);
CREATE POLICY lideres_write_access ON public.ruja_lideres FOR ALL TO authenticated
USING (public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND public.ruja_tags_include_departamento(departamento, public.current_ruja_departamento_id())))
WITH CHECK (public.is_ruja_admin() OR (public.current_ruja_role() = 'lider_departamento' AND public.ruja_tags_include_departamento(departamento, public.current_ruja_departamento_id())));

ALTER TABLE public.ruja_departamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS departamentos_select_access ON public.ruja_departamentos;
DROP POLICY IF EXISTS departamentos_write_access ON public.ruja_departamentos;
CREATE POLICY departamentos_select_access ON public.ruja_departamentos FOR SELECT TO authenticated USING (public.ruja_user_is_active() AND ativo = true);
CREATE POLICY departamentos_write_access ON public.ruja_departamentos FOR ALL TO authenticated USING (public.is_ruja_admin()) WITH CHECK (public.is_ruja_admin());

ALTER TABLE public.ruja_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_select_access ON public.ruja_audit_logs;
DROP POLICY IF EXISTS audit_insert_access ON public.ruja_audit_logs;
CREATE POLICY audit_select_access ON public.ruja_audit_logs FOR SELECT TO authenticated USING (public.is_lider_supremo());
CREATE POLICY audit_insert_access ON public.ruja_audit_logs FOR INSERT TO authenticated WITH CHECK (public.ruja_user_is_active() AND usuario_id = auth.uid());

-- Tabelas opcionais: quando existirem, ficam fechadas para perfis comuns ate
-- receberem uma coluna de departamento e politica especifica.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['ruja_diario', 'ruja_ai_logs'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_admin_access', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_ruja_admin()) WITH CHECK (public.is_ruja_admin())', table_name || '_admin_access', table_name);
    END IF;
  END LOOP;
END $$;

COMMENT ON VIEW public.ruja_profiles_access_impact_report IS
'Relatorio de impacto de cargos e departamentos. Nao altera nem desativa usuarios.';
