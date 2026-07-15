# PROGRAMAS_INFO — RUJA Nexus

Atualizado em: 2026-07-15 (departamentos completos e frequência por evento)

Documento operacional do sistema RUJA/Nexus.

## Estrutura oficial

A RUJA mantém Teens e Simply como áreas com navegação dedicada. Os demais
departamentos e ministérios são registros ativos na mesma estrutura, incluindo
os nomes já vinculados aos jovens no banco.

- Teens e Simply: áreas dedicadas.
- Louvor, Mídia, Recepção, Intercessão, Comunicação, Organização e demais
  vínculos reais: disponíveis em Departamentos, Jovens, Eventos e Relatórios.

## Navegação oficial

- Dashboard Geral
- Teens
- Simply
- Eventos Gerais
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

## Eventos Gerais

Eventos Gerais são eventos institucionais da RUJA, separados dos eventos
operacionais de Teens/Simply. Eles podem envolver Toda RUJA ou vários
departamentos/ministérios ao mesmo tempo.

Campos oficiais do evento:

- nome;
- tipo;
- data;
- hora de início;
- hora de término;
- local;
- descrição;
- responsável;
- departamentos envolvidos;
- status;
- observação interna;
- participantes/presença.

## Fonte oficial de departamentos

A tabela `ruja_departamentos` é a fonte oficial. A aplicação filtra apenas
departamentos ativos com `slug` `teens` ou `simply`.

## IA Nexus

A IA Nexus é apenas leitura e sua API exige sessão com perfil ativo. O contexto
livre enviado pelo navegador foi removido para impedir vazamento entre
departamentos. Dados pessoais não são enviados ao provedor externo; enquanto
não houver política formal de tratamento, a IA atua como instrutora do sistema.

## Cargos e permissões

O acesso usa os cargos `lider_supremo`, `administrador`,
`lider_departamento`, `voluntario` e `visualizador`. Líderes, voluntários e
visualizadores ficam presos a Teens ou Simply. Menus desktop/mobile e ações da
interface acompanham o perfil, enquanto o banco aplica a proteção efetiva por
RLS.

## Banco

Migrations locais:

- `src/lib/supabase/migration_departamentos_pendentes.sql`
- `src/lib/supabase/migration_eventos_frequencia.sql`
- `src/lib/supabase/migration_profiles.sql`
- `src/lib/supabase/migration_cargos_permissoes.sql`

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
