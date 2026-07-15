# REGRAS DE ACESSO RUJA

Atualizado em: 2026-07-15

## Estrutura oficial

Áreas com navegação dedicada:

- Teens
- Simply

Os demais departamentos e ministérios são cadastrados em
`ruja_departamentos` e reutilizam a estrutura geral de jovens, eventos e
relatórios. A migration de departamentos converte os vínculos já existentes
nos jovens em registros reais, sem apagar associações legadas.

## Perfis

- `lider_supremo`: vê e gerencia toda a RUJA.
- `administrador`: gestão operacional de Teens e Simply, sem cargos críticos.
- `lider_departamento`: gerencia apenas Teens ou Simply conforme seu vínculo.
- `voluntario`: leitura do próprio departamento e frequência quando autorizada.
- `visualizador`: somente leitura do próprio departamento.

O valor legado `admin` é convertido para `administrador` pela migration de
permissões. Perfis departamentais precisam estar vinculados a `teens` ou
`simply`; os demais ministérios continuam disponíveis em eventos e vínculos,
mas não formam escopos autônomos de login.

## Frequência por evento

Permissões esperadas:

- líder supremo: cria, edita e exclui qualquer evento;
- administrador: cria, edita e exclui qualquer evento;
- líder de departamento: cria, edita e exclui eventos do próprio departamento;
- voluntário: visualiza ou registra apenas quando políticas futuras permitirem.

A interface filtra por departamento, mas a proteção principal deve existir no
banco via RLS. A migration `migration_eventos_frequencia.sql` ativa RLS nas
tabelas `ruja_eventos_frequencia` e `ruja_eventos_participantes`.

## RLS

A migration `migration_cargos_permissoes.sql` fornece:

- `current_ruja_role()`;
- `current_ruja_departamento_id()`;
- `is_lider_supremo()`;
- `is_ruja_admin()`;
- `can_access_departamento(id)`.

As políticas RLS usam essas funções como fonte de verdade. Usuário inativo não
acessa dados protegidos e filtros visuais nunca substituem o RLS.

## Auditoria

As ações do novo fluxo registram `ruja_audit_logs`:

- `criar_evento_frequencia`
- `editar_evento_frequencia`
- `excluir_evento_frequencia`
- `adicionar_participante`
- `remover_participante`

## IA Nexus

A API valida sessão e perfil ativo, rejeita contexto enviado pelo navegador e
não transmite nomes, presenças, contatos ou recuperação ao provedor externo.
Ela atua como instrutora do sistema. Análises nominais permanecem indisponíveis
até existir consentimento e política formal de tratamento desses dados.
