# CHANGELOG RUJA

## 2026-07-15 — Departamentos completos

- Removido o filtro que escondia departamentos diferentes de Teens e Simply.
- Vínculos existentes dos jovens são sincronizados como departamentos reais.
- Eventos, frequência, jovens, relatórios e IA Nexus reconhecem qualquer
  departamento ativo.
- Teens e Simply permanecem com navegação dedicada.
- A migration de departamentos passou a ser idempotente e deduplica slugs.
- Perfis existentes do Supabase Auth passam a ser sincronizados com
  `ruja_profiles`, incluindo bootstrap do primeiro Líder Supremo.
- Eventos Gerais agora possui abas para criar e consultar eventos; após salvar,
  o histórico com participantes, edição e exclusão é aberto automaticamente.
- Corrigido erro interno após criar ou alterar usuário quando o audit log não
  podia ser gravado; a operação principal agora retorna sucesso normalmente.

## 2026-07-13 — Reestruturação do Histórico de Frequência por evento

## Módulo
Frequência / Histórico de Frequência / Jovens / IA Nexus / Banco

## Problema
O histórico antigo registrava presença e falta por jovem em `ruja_frequencias`,
gerando listas extensas, duplicidade de eventos e centenas de linhas para
ausentes.

## Solução
- Criado modelo oficial por evento com `ruja_eventos_frequencia` e
  `ruja_eventos_participantes`.
- A criação de frequência agora salva um evento e apenas os jovens presentes.
- Ausências são calculadas por comparação com jovens ativos do departamento,
  sem inserir faltas automáticas.
- Histórico passou a mostrar cards por evento com total presente, total
  esperado, percentual, detalhe, edição e exclusão.
- Detalhe do jovem mostra eventos em que esteve presente e ausente, com
  percentual calculado por eventos elegíveis.
- IA Nexus foi atualizada para compreender o modelo por evento e tratar
  `ruja_frequencias` como legado.
- Criada migration com RLS, índice único `evento_id, jovem_id`, audit log e
  relatório de impacto do legado.

## Arquivos principais alterados
- `src/components/ruja/frequencia/ruja-frequencia.tsx`
- `src/components/ruja/frequencia/ruja-historico-frequencia.tsx`
- `src/components/ruja/jovens/ruja-jovem-detalhe.tsx`
- `src/components/ruja/analista/ruja-analista-ia.tsx`
- `src/lib/ruja/context.tsx`
- `src/lib/ruja/queries.ts`
- `src/lib/ruja/calculos.ts`
- `src/lib/ruja/types.ts`
- `src/lib/supabase/migration_eventos_frequencia.sql`
- `PROGRAMAS_INFO.md`
- `BANCO_DE_DADOS_RUJA.md`
- `REGRAS_DE_ACESSO_RUJA.md`

## Estratégia de migração do legado
Não migrar automaticamente. Usar `ruja_frequencia_legado_impact_report` e
`ruja_preview_migracao_frequencia_legado()` para revisar datas, nomes
normalizados, possíveis duplicidades e conflitos. Depois da conferência humana,
criar eventos canônicos e vincular somente registros presentes. A tabela
`ruja_frequencias` não é apagada.

## Riscos
- A migration depende de `ruja_profiles` para RLS.
- `unaccent`/`pg_trgm` podem exigir extensões no Supabase para o relatório de
  similaridade; se a extensão não estiver ativa, habilitar antes de consultar.
- Cálculo de status passa a preferir eventos novos quando existem.

## Como testar
1. Aplicar `src/lib/supabase/migration_eventos_frequencia.sql`.
2. Criar evento Teens e marcar somente presentes.
3. Criar evento Simply e marcar somente presentes.
4. Conferir que ausentes não criam linhas em `ruja_eventos_participantes`.
5. Editar evento, adicionar participante e remover participante.
6. Tentar duplicar jovem no mesmo evento e confirmar bloqueio pela constraint.
7. Filtrar histórico por mês, departamento e líder.
8. Abrir detalhe do jovem e conferir eventos presente/ausente e percentual.
9. Conferir entradas em `ruja_audit_logs`.
10. Testar permissões com admin e líder de departamento.
11. Rodar `npm run lint` e `npm run build`.

## 2026-07-14 — Eventos Gerais como entidade completa

## Módulo
Eventos Gerais / Eventos departamentais / Histórico de Frequência

## Solução
- A navegação agora separa **Eventos Gerais** da RUJA dos eventos operacionais
  dentro de Teens/Simply.
- Eventos Gerais podem envolver Toda RUJA ou vários departamentos/ministérios
  como Teens, Simply, Louvor, Mídia, Recepção, Intercessão, Comunicação e
  Organização.
- O cadastro do evento foi expandido com hora de início, hora de término,
  local, descrição, status e departamentos envolvidos.
- A edição e o detalhe do histórico preservam e exibem os novos dados do evento.

## Banco
- Nova migration: `src/lib/supabase/migration_eventos_entidade_completa.sql`.
- Novas colunas em `ruja_eventos_frequencia`: `hora_inicio`, `hora_termino`,
  `local`, `descricao`, `status`, `departamentos_envolvidos`.
