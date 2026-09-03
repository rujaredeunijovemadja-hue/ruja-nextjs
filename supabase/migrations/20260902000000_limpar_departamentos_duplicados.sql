-- RUJA - remove departamentos duplicados
-- Cada um destes 5 departamentos tinha duas linhas: uma curada antiga
-- (com líder/capacidade, mas slug quebrado tipo "-idia") e uma importada
-- automaticamente dos vínculos de ruja_jovens.departamento (slug limpo,
-- sem líder/capacidade). Nenhuma tabela referencia os ids legados
-- (verificado antes de aplicar) -- limpeza segura, sem reatribuição de FK.
-- Mantém a linha com o slug limpo (usada pelo cadastro público) e
-- transfere líder/capacidade/ícone da linha antiga antes de apagá-la.

-- Transfere líder/capacidade/ícone da linha legada quando a canônica
-- estiver vazia (não sobrescreve dado real já presente na canônica).
UPDATE public.ruja_departamentos AS canon
SET
  lider = CASE WHEN canon.lider = '' OR canon.lider IS NULL THEN legacy.lider ELSE canon.lider END,
  capacidade = CASE WHEN canon.capacidade = 0 THEN legacy.capacidade ELSE canon.capacidade END,
  icone = CASE WHEN canon.icone = '' OR canon.icone IS NULL THEN legacy.icone ELSE canon.icone END
FROM public.ruja_departamentos AS legacy
WHERE (canon.id, legacy.id) IN (
  ('intercessao', '4'),
  ('louvor', '2'),
  ('midia', '1'),
  ('organizacao', '3'),
  ('up', '1777082213616')
);

DELETE FROM public.ruja_departamentos
WHERE id IN ('4', '2', '1', '3', '1777082213616');
