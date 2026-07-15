# BANCO DE DADOS RUJA

Atualizado em: 2026-07-15

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
- `aprovado`
- `rejeitado`

## Migrations

- `src/lib/supabase/migration_departamentos_pendentes.sql`
- `src/lib/supabase/migration_eventos_frequencia.sql`
- `src/lib/supabase/migration_eventos_entidade_completa.sql`
