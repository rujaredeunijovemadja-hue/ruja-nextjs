# PROGRAMAS_INFO — RUJA Nexus

Atualizado em: 2026-08-06 (camada de plataformas operacionais)

Documento operacional do sistema RUJA/Nexus.

## Estrutura oficial

A RUJA possui o Nexus como núcleo global e catálogo de plataformas operacionais.
Teens e Simply continuam como áreas de juventude dentro do Nexus. As demais
plataformas possuem acesso, módulos e dados próprios quando ativadas.

- Nexus: núcleo global, usuários, permissões, jovens e governança.
- Mídia: primeiro piloto operacional, com solicitações, produção, aprovação e arquivos.
- Altar, PodSimply, Happy Hour, Central EBD, Redação, Palestras e Contabilidade:
  catalogadas, mas inativas até aprovação de seus fluxos.
- Departamentos continuam representando vínculos ministeriais e não substituem
  plataformas operacionais.

## Navegação oficial

- Dashboard Geral
- Teens
- Simply
- Eventos Gerais
- Cadastros Pendentes
- IA Nexus
- Configurações

Plataformas autorizadas também aparecem na navegação, sem alterar o catálogo
fechado de páginas do núcleo legado.

O Líder Supremo também possui a área Catálogo de Plataformas para ativar ou
desativar plataformas e consultar os módulos habilitados.

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

## Cadastro público

O fluxo público oficial começa em `/cadastro` e grava exclusivamente por
`POST /api/ruja/cadastros-pendentes`. O navegador nunca cria jovem, nunca lista
dados internos e não recebe a chave `service_role`.

O formulário aceita Teens ou Simply, valida os campos obrigatórios, aplica as
regras de responsável para menores, converte fotos JPG/PNG/WEBP para WebP e
retorna um protocolo. Um token por envio impede duplicação causada por clique
repetido.

A liderança analisa no painel interno. Aprovação, rejeição, solicitação de
correção e observação administrativa passam por APIs autenticadas. A aprovação
usa o ID determinístico `cad_<cadastro_id>`, tornando a criação do jovem
idempotente.

## Banco

Migrations locais:

- `supabase/migrations/20260703000000_departamentos_pendentes.sql`
- `supabase/migrations/20260715020000_eventos_frequencia.sql`
- `supabase/migrations/20260715000000_profiles.sql`
- `supabase/migrations/20260715010000_cargos_permissoes.sql`
- `supabase/migrations/20260715050000_cadastro_publico_aprovacao.sql`
- `supabase/migrations/20260806000000_plataformas.sql`
- `supabase/migrations/20260806010000_midia.sql`
- `supabase/migrations/20260806020000_ebd.sql`
- `supabase/migrations/20260806030000_ebd_presenca.sql`
- `supabase/migrations/20260806040000_ebd_materiais.sql`
- `supabase/migrations/20260806050000_missoes.sql`

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
