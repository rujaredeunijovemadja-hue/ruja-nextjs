# REGRAS DE ACESSO RUJA

Atualizado em: 2026-08-06

## Acesso por plataforma

O acesso novo é composto por usuário, plataforma, papel e módulos habilitados.
Uma pessoa pode participar de várias plataformas com papéis diferentes.

- `owner`: administração total da plataforma;
- `admin`: gestão administrativa;
- `gestor`: coordenação operacional;
- `editor`: produção e alteração de conteúdo;
- `operador`: execução de tarefas;
- `visualizador`: somente leitura.

O Líder Supremo e o Administrador continuam com acesso global no modelo atual.
Os demais usuários dependem de uma linha ativa em `ruja_usuario_plataformas`.
O Nexus é criado automaticamente para perfis existentes e novos durante a
transição.

Somente o Líder Supremo pode ativar ou desativar plataformas no Catálogo de
Plataformas e alterar os vínculos de acesso de outros usuários.

As funções `ruja_has_platform_access` e `ruja_has_platform_module` são a base
para as políticas RLS das novas tabelas. Não se deve usar apenas a sidebar para
proteger dados.

## Decisões arquiteturais

- Nexus é o núcleo global e também uma plataforma especial do catálogo.
- Mídia é o primeiro piloto operacional.
- Eventos institucionais são compartilhados; eventos de produção e operação
  pertencem à plataforma correspondente.
- A IA é um serviço único com contexto de plataforma validado no servidor.
- Dados financeiros, pastorais e de produção terão tabelas e políticas próprias.
- O piloto Mídia restringe solicitações, produção, tarefas, aprovações e arquivos
  ao `plataforma_id` autorizado e aos módulos correspondentes.
- A Central EBD usa tabelas próprias para classes, professores e lições; não
  reutiliza dados pastorais ou frequência de jovens do Nexus.
- A chamada da EBD usa o módulo `frequencia` da própria plataforma e não grava
  presença nas tabelas de frequência do Nexus.
- Materiais da EBD usam bucket privado próprio, sem compartilhar arquivos da
  plataforma Mídia.

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

## Cadastro público e aprovação

- `/cadastro` não exige login e envia somente para a API pública de pendências.
- A API valida e sanitiza os campos, limita a foto a 5 MB, converte para WebP,
  verifica Teens/Simply e marca possíveis duplicidades.
- Líder Supremo e Administrador gerenciam Teens e Simply.
- Líder de Departamento gerencia somente o próprio departamento.
- Voluntário e Visualizador não aprovam, rejeitam ou solicitam correção.
- Aprovação repetida devolve o jovem já criado e não cria outra pessoa.
- Rejeição mantém o registro e a foto privada para histórico.
- RLS permite leitura interna conforme escopo; escritas de decisão usam apenas
  APIs server-side autenticadas.

Ações auditadas: `cadastro_publico_enviado`, `cadastro_em_analise`,
`cadastro_aprovado`, `cadastro_rejeitado`, `correcao_solicitada` e
`duplicidade_identificada`.

## IA Nexus

A API valida sessão e perfil ativo, rejeita contexto enviado pelo navegador e
não transmite nomes, presenças, contatos ou recuperação ao provedor externo.
Ela atua como instrutora do sistema. Análises nominais permanecem indisponíveis
até existir consentimento e política formal de tratamento desses dados.
