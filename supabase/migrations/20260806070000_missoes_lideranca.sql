-- RUJA - HOTFIX: painel de missões exclusivo da liderança

DROP POLICY IF EXISTS missoes_select_access ON public.ruja_missoes;
CREATE POLICY missoes_select_access ON public.ruja_missoes FOR SELECT TO authenticated
USING (
  public.ruja_has_platform_module(plataforma_id, 'tarefas')
  AND public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento')
  AND (public.is_ruja_admin() OR criado_por = auth.uid() OR public.can_access_departamento(departamento_id))
);

DROP POLICY IF EXISTS missoes_insert_access ON public.ruja_missoes;
CREATE POLICY missoes_insert_access ON public.ruja_missoes FOR INSERT TO authenticated
WITH CHECK (
  criado_por = auth.uid()
  AND public.ruja_has_platform_module(plataforma_id, 'tarefas')
  AND public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento')
  AND (public.is_ruja_admin() OR public.can_access_departamento(departamento_id))
);

DROP POLICY IF EXISTS missoes_update_access ON public.ruja_missoes;
CREATE POLICY missoes_update_access ON public.ruja_missoes FOR UPDATE TO authenticated
USING (
  public.ruja_has_platform_module(plataforma_id, 'tarefas')
  AND public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento')
  AND (public.is_ruja_admin() OR criado_por = auth.uid() OR public.can_access_departamento(departamento_id))
)
WITH CHECK (public.ruja_has_platform_module(plataforma_id, 'tarefas'));

DROP POLICY IF EXISTS missoes_delete_access ON public.ruja_missoes;
CREATE POLICY missoes_delete_access ON public.ruja_missoes FOR DELETE TO authenticated
USING (
  public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento')
  AND (public.is_ruja_admin() OR criado_por = auth.uid() OR public.can_access_departamento(departamento_id))
);

DROP POLICY IF EXISTS missoes_atualizacoes_access ON public.ruja_missoes_atualizacoes;
CREATE POLICY missoes_atualizacoes_access ON public.ruja_missoes_atualizacoes FOR ALL TO authenticated
USING (
  public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento')
  AND EXISTS (SELECT 1 FROM public.ruja_missoes m WHERE m.id = missao_id AND public.ruja_has_platform_module(m.plataforma_id, 'tarefas'))
)
WITH CHECK (
  usuario_id = auth.uid()
  AND public.current_ruja_role() IN ('lider_supremo', 'administrador', 'lider_departamento')
  AND EXISTS (SELECT 1 FROM public.ruja_missoes m WHERE m.id = missao_id AND public.ruja_has_platform_module(m.plataforma_id, 'tarefas'))
);
