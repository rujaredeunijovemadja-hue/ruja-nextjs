-- RUJA - eventos/missões fixas ganham vínculo com plataforma e
-- opt-out de cobrança individual (pedido 02/09/2026, reformulação
-- conceitual: "regra de recorrência" ligada a plataforma+automação,
-- não só um template de nome+horário).
--
-- `ativo` já controla se o worker cria a ocorrência automaticamente
-- (gerarEventosFixos/gerarMissoesFixas só processam ativo=true) -- não
-- precisa de coluna nova pra isso, só reaproveita o que já existe.
--
-- `cobrar_frequencia`/`cobrar_atraso` são novos: hoje o worker cobra
-- QUALQUER evento/missão sem frequência/atrasada, sem distinguir se
-- veio de um fixo ou não. Isso permite marcar um fixo específico como
-- "não cobrar" (ex: um evento informal onde não se lança frequência
-- oficial). Default true preserva o comportamento atual pra todo fixo
-- já cadastrado.

ALTER TABLE public.ruja_eventos_fixos
  ADD COLUMN IF NOT EXISTS plataforma_id uuid REFERENCES public.ruja_plataformas(id),
  ADD COLUMN IF NOT EXISTS cobrar_frequencia boolean NOT NULL DEFAULT true;

ALTER TABLE public.ruja_missoes_fixas
  ADD COLUMN IF NOT EXISTS cobrar_atraso boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ruja_eventos_fixos.plataforma_id IS 'Plataforma/ministério dono deste evento recorrente -- informativo, não altera o worker.';
COMMENT ON COLUMN public.ruja_eventos_fixos.cobrar_frequencia IS 'Se false, o worker Paulo não cobra frequência pendente das ocorrências geradas por este fixo.';
COMMENT ON COLUMN public.ruja_missoes_fixas.cobrar_atraso IS 'Se false, o worker Paulo não inclui as ocorrências deste fixo no relatório semanal de missões atrasadas.';
