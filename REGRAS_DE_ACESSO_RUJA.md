# REGRAS DE ACESSO RUJA

Atualizado em: 2026-07-13

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
- `admin`: vê e gerencia toda a RUJA.
- `lider_departamento`: gerencia apenas eventos do próprio departamento.
- `voluntario`: acesso limitado conforme configuração/RLS.

## Frequência por evento

Permissões esperadas:

- líder supremo: cria, edita e exclui qualquer evento;
- admin: cria, edita e exclui qualquer evento;
- líder de departamento: cria, edita e exclui eventos do próprio departamento;
- voluntário: visualiza ou registra apenas quando políticas futuras permitirem.

A interface filtra por departamento, mas a proteção principal deve existir no
banco via RLS. A migration `migration_eventos_frequencia.sql` ativa RLS nas
tabelas `ruja_eventos_frequencia` e `ruja_eventos_participantes`.

## RLS

A função `ruja_profile_can_manage_department(departamento_id)` valida:

- `lider_supremo` e `admin` ativos podem gerenciar todos;
- `lider_departamento` ativo pode gerenciar quando o departamento do perfil
  corresponde ao id, nome ou slug do departamento do evento.

## Auditoria

As ações do novo fluxo registram `ruja_audit_logs`:

- `criar_evento_frequencia`
- `editar_evento_frequencia`
- `excluir_evento_frequencia`
- `adicionar_participante`
- `remover_participante`

## IA Nexus

A IA Nexus é somente leitura. Ela pode analisar eventos e ausências implícitas,
mas não cria, edita, exclui ou registra frequência.
