# BANCO DE DADOS RUJA

Atualizado em: 2026-08-06

## Plataformas operacionais

Migration: `migration_plataformas.sql`.

Migration do piloto: `migration_midia.sql`.

O piloto cria `ruja_midia_solicitacoes`, `ruja_midia_tarefas`,
`ruja_midia_aprovacoes` e `ruja_midia_arquivos`. Todas as tabelas possuem
`plataforma_id` e RLS baseada nos módulos da Mídia.

O núcleo inicial da Central EBD está em `migration_ebd.sql` e cria classes,
professores e lições isolados pela plataforma.

- `ruja_plataformas`: catálogo, status, ordem e identidade visual.
- `ruja_modulos`: catálogo reutilizável de capacidades.
- `ruja_plataforma_modulos`: módulos habilitados por plataforma.
- `ruja_usuario_plataformas`: acesso múltiplo, papel, departamento opcional e
  permissões específicas por usuário.

O Nexus é a plataforma especial de governança. O vínculo legado em
`ruja_profiles.departamento_id` continua sendo usado pelo Nexus durante a
transição. Novas plataformas não devem reutilizar esse campo como controle de
acesso.

Plataformas ativas inicialmente: Nexus e Mídia. As demais permanecem no
catálogo com `ativo = false`.

Funções RLS principais:

- `ruja_has_platform_access(uuid)`;
- `ruja_has_platform_module(uuid, text)`.

## Departamentos

Tabela fonte oficial: `ruja_departamentos`.

Áreas com navegação dedicada:

- `Teens` com slug `teens`
- `Simply` com slug `simply`

Os demais ministérios também são registros ativos. A migration
`migration_departamentos_pendentes.sql` separa os valores existentes em
`ruja_jovens.departamento` por `;`, normaliza o slug e cria os departamentos
ausentes sem remover ou reatribuir vínculos.

## Perfis de acesso

Tabela: `ruja_profiles`.

A migration `migration_profiles.sql` sincroniza logins antigos de `auth.users`,
cria automaticamente perfis para novos logins e promove o usuário mais antigo
a `lider_supremo` apenas quando ainda não existe nenhum Líder Supremo ativo.
Alterações de cargo, departamento e status passam pelas APIs server-side.

Cargos oficiais:

- `lider_supremo`
- `administrador`
- `lider_departamento`
- `voluntario`
- `visualizador`

Antes de aplicar as políticas, consulte:

```sql
select * from public.ruja_profiles_access_impact_report;
```

A migration `migration_cargos_permissoes.sql` normaliza o cargo legado
`admin`, cria as funções auxiliares de autorização e ativa RLS por departamento
nas tabelas operacionais.

## Frequência por evento

Tabela: `ruja_eventos_frequencia`.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `nome text not null`
- `data date not null`
- `departamento_id text null`
- `lider_responsavel_id text null`
- `tipo text null`
- `observacao text null`
- `hora_inicio time null`
- `hora_termino time null`
- `local text null`
- `descricao text null`
- `status text default 'Agendado'`
- `departamentos_envolvidos text[] null`
- `created_by uuid not null references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Tabela: `ruja_eventos_participantes`.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `evento_id uuid not null references ruja_eventos_frequencia(id) on delete cascade`
- `jovem_id text not null`
- `presente boolean not null default true`
- `observacao text null`
- `registrado_por uuid references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Restrição:

- `unique(evento_id, jovem_id)`

## Regra de ausência

Não há geração automática de faltas.

- Presente: existe linha em `ruja_eventos_participantes` com `presente = true`.
- Ausente: jovem ativo do departamento elegível que não aparece nos
  participantes do evento.

O cálculo de frequência individual usa eventos elegíveis do departamento no
período versus eventos com participação registrada.

## Legado e impacto

Tabela antiga: `ruja_frequencias`.

Ela não é apagada e não recebe novas escritas pelo fluxo novo. Antes de migrar,
use:

```sql
select * from ruja_frequencia_legado_impact_report;
select * from ruja_preview_migracao_frequencia_legado();
```

O relatório mostra datas, nomes distintos de eventos, possíveis duplicidades,
quantidade de registros, presentes/faltas e conflitos jovem/data/evento.

## Cadastros Pendentes

Tabela: `ruja_cadastros_pendentes`.

Status permitidos:

- `pendente`
- `em_analise`
- `correcao_solicitada`
- `aprovado`
- `rejeitado`

A migration `migration_cadastro_publico_aprovacao.sql` converte o identificador
para UUID, a data de nascimento para `date` e acrescenta consentimentos,
endereço, tempo de RUJA, batismo, duplicidade, correção, observação
administrativa, token idempotente e `jovem_id_criado`.

Tabela de histórico: `ruja_cadastro_acoes`.

Bucket privado: `ruja-cadastros-pendentes`.

- caminho temporário: `cadastros-pendentes/{cadastro_id}/foto.webp`;
- caminho definitivo: `jovens/{jovem_id}/perfil.webp` no bucket de jovens;
- fotos rejeitadas permanecem no bucket privado para retenção administrativa;
- nenhuma foto pendente possui URL pública.

Índices de nome+nascimento, telefone, email, status e duplicidade apoiam a
triagem. O formulário público perdeu o privilégio direto de `INSERT`; somente a
API server-side escreve com `service_role`.

## Migrations

- `supabase/migrations/20260703000000_departamentos_pendentes.sql`
- `supabase/migrations/20260715000000_profiles.sql`
- `supabase/migrations/20260715010000_cargos_permissoes.sql`
- `supabase/migrations/20260715020000_eventos_frequencia.sql`
- `supabase/migrations/20260715030000_eventos_entidade_completa.sql`
- `supabase/migrations/20260715040000_eventos_rls_ownership_fix.sql`
- `supabase/migrations/20260715050000_cadastro_publico_aprovacao.sql`
- `supabase/migrations/20260806000000_plataformas.sql`
- `supabase/migrations/20260806010000_midia.sql`
- `supabase/migrations/20260806020000_ebd.sql`
