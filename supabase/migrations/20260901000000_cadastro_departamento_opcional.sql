-- RUJA - cadastro público: departamento passa a ser opcional
-- Pedido 01/09/2026: jovem escolhe a "plataforma" dele, mas não é obrigado
-- a informar no momento do cadastro público.

ALTER TABLE public.ruja_cadastros_pendentes
  ALTER COLUMN departamento_id DROP NOT NULL;
