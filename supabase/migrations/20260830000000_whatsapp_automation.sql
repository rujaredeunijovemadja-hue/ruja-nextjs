-- 20260830000000_whatsapp_automation.sql
-- Base de dados da automação de WhatsApp da RUJA (PLANO_AUTOMACAO_WHATSAPP_RUJA.md).
-- Container separado (`ruja-automation`) escreve aqui via service_role;
-- o Supabase continua sendo a fonte oficial de estado (o container é só
-- observador + worker + scheduler, nunca dono do dado).

-- ─── ruja_whatsapp_messages ────────────────────────────────────────────────
-- Persiste mensagens relevantes recebidas/enviadas. `wamid` é a chave de
-- idempotência: nunca processar a mesma mensagem duas vezes (Evolution
-- reenvia webhook em timeout/retry).
create table public.ruja_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  wamid text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  phone text null,
  group_jid text null,
  participant_phone text null,
  text text null,
  message_type text not null default 'text',
  created_at timestamptz not null default now(),
  constraint ruja_whatsapp_messages_wamid_uniq unique (wamid)
);

create index ruja_whatsapp_messages_phone_idx on public.ruja_whatsapp_messages (phone);
create index ruja_whatsapp_messages_group_jid_idx on public.ruja_whatsapp_messages (group_jid);
create index ruja_whatsapp_messages_created_idx on public.ruja_whatsapp_messages (created_at);

alter table public.ruja_whatsapp_messages enable row level security;
-- Só o container automation (service_role) lê/escreve por enquanto -- sem
-- política de usuário final até existir tela de auditoria no Nexus.

comment on table public.ruja_whatsapp_messages is 'Mensagens WhatsApp relevantes (grupo de líderes + SOS privado), persistidas pelo container ruja-automation. wamid único garante idempotência contra reenvio de webhook.';

-- ─── ruja_notification_jobs ────────────────────────────────────────────────
-- Fila de processamento com claim/lease/retry/dead-letter, mesmo padrão já
-- validado no Agora Cortex (sales_detection_jobs).
create table public.ruja_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  attempts int not null default 0,
  next_retry_at timestamptz null,
  locked_by text null,
  locked_at timestamptz null,
  lease_expires_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  processed_at timestamptz null,
  finished_at timestamptz null,
  constraint ruja_notification_jobs_job_key_uniq unique (job_key)
);

create index ruja_notification_jobs_status_idx on public.ruja_notification_jobs (status, next_retry_at);
create index ruja_notification_jobs_lease_idx on public.ruja_notification_jobs (lease_expires_at) where status = 'processing';

alter table public.ruja_notification_jobs enable row level security;

comment on table public.ruja_notification_jobs is 'Fila de jobs da automação WhatsApp (alertas operacionais, resumo diário). job_key único evita job duplicado pro mesmo evento/entidade (ex.: frequency_missing:event:<id>:24h). lease_expires_at evita job preso pra sempre em processing se o worker morrer.';

-- ─── ruja_alert_state ──────────────────────────────────────────────────────
-- Evita spam: cooldown por alerta, chave própria por tipo+entidade.
create table public.ruja_alert_state (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null,
  alert_type text not null,
  entity_id text null,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  last_notified_at timestamptz null,
  resolved_at timestamptz null,
  status text not null default 'active' check (status in ('active', 'resolved')),
  constraint ruja_alert_state_alert_key_uniq unique (alert_key)
);

create index ruja_alert_state_status_idx on public.ruja_alert_state (status);

alter table public.ruja_alert_state enable row level security;

comment on table public.ruja_alert_state is 'Estado de cooldown por alerta (ex.: low_frequency:<jovem_id>). Novo envio só ocorre quando o estado mudou, o cooldown passou, ou o alerta foi resolvido e reapareceu -- nunca reenvia continuamente o mesmo alerta.';

-- ─── ruja_solicitacoes_cuidado ─────────────────────────────────────────────
-- Pedidos de oração, conversa, visita e apoio recebidos no WhatsApp privado
-- da RUJA. Dado sensível -- RLS restrita por liderança autorizada.
create table public.ruja_solicitacoes_cuidado (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  name text null,
  type text not null check (type in ('oracao', 'conversa', 'visita', 'ajuda', 'acolhimento', 'outro')),
  original_message text not null,
  summary text null,
  priority text not null default 'normal' check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  status text not null default 'novo' check (status in ('novo', 'recebido', 'em_acompanhamento', 'resolvido', 'encerrado')),
  responsible_id uuid null references auth.users(id),
  department_id text null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz null,
  closed_at timestamptz null
);

create index ruja_solicitacoes_cuidado_status_idx on public.ruja_solicitacoes_cuidado (status);
create index ruja_solicitacoes_cuidado_phone_idx on public.ruja_solicitacoes_cuidado (phone);

alter table public.ruja_solicitacoes_cuidado enable row level security;
-- Visibilidade restrita: só líderes autorizados (lider_supremo,
-- administrador, ou responsável designado) podem ler -- pedido de cuidado
-- pastoral é dado sensível por natureza. Política real depende de qual
-- perfil o Ramon decidir como "liderança autorizada" -- fica pendente até
-- essa decisão de produto (ver PLANO_AUTOMACAO_WHATSAPP_RUJA.md, Fase 5).

comment on table public.ruja_solicitacoes_cuidado is 'Pedidos de oração/conversa/visita/ajuda recebidos no WhatsApp privado oficial da RUJA. Dado sensível -- RLS pendente de definição de "liderança autorizada" (Fase 5 do plano).';
