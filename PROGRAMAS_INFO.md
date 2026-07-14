# PROGRAMAS_INFO — RUJA Nexus

Atualizado em: 2026-07-13 (frequência por evento)

Documento operacional do sistema RUJA/Nexus.

## Estrutura oficial

A RUJA possui apenas dois departamentos ativos:

- Teens
- Simply

UP não é departamento ativo e não deve aparecer como opção visual, filtro,
cadastro, relatório, dashboard, permissão ou resposta da IA Nexus.

## Navegação oficial

- Dashboard Geral
- Teens
- Simply
- Cadastros Pendentes
- IA Nexus
- Configurações

As áreas Teens e Simply usam os mesmos módulos operacionais com filtro por
departamento:

- Dashboard
- Jovens
- Frequência
- Recuperação
- Líderes
- Metas
- Relatórios

## Frequência por evento

O Histórico de Frequência oficial agora trabalha por evento, não por centenas
de linhas individuais de presença/falta.

Fluxo oficial:

1. Líder abre Frequência.
2. Cria um evento com nome, data, departamento, líder responsável, tipo e
   observação opcional.
3. O sistema lista jovens reais do departamento.
4. O líder marca somente quem esteve presente.
5. O sistema salva um evento em `ruja_eventos_frequencia` e os presentes em
   `ruja_eventos_participantes`.
6. O Histórico mostra um card por evento.
7. Ao abrir o card aparecem os participantes presentes.
8. A edição permite corrigir dados gerais, adicionar presentes esquecidos,
   remover marcações erradas e alterar observações individuais.

Ausência é implícita: jovem ativo do departamento que não está nos participantes
do evento é considerado ausente para cálculo. O sistema não cria linhas de falta.

## Fonte oficial de departamentos

A tabela `ruja_departamentos` é a fonte oficial. A aplicação filtra apenas
departamentos ativos com `slug` `teens` ou `simply`.

## IA Nexus

A IA Nexus é apenas leitura. Ela entende o modelo por evento e pode responder
sobre último culto, participantes de reuniões, evento com maior presença,
frequência mensal e faltas nos últimos eventos. Ela não altera dados.

## Banco

Migrations locais:

- `src/lib/supabase/migration_departamentos_pendentes.sql`
- `src/lib/supabase/migration_eventos_frequencia.sql`

Tabelas principais do novo modelo:

- `ruja_eventos_frequencia`
- `ruja_eventos_participantes`

Relatórios/views:

- `ruja_up_impact_report`
- `ruja_frequencia_legado_impact_report`

## Legado

`ruja_frequencias` permanece como histórico legado. O novo sistema escreve
exclusivamente nas tabelas de evento. Não há migração automática dos dados
antigos porque existem nomes inconsistentes e possíveis duplicidades.
