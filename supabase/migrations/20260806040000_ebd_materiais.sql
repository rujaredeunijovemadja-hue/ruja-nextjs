-- RUJA - MIGRATION: materiais da Central EBD
-- Aplicar depois de 20260806020000_ebd.sql.

CREATE TABLE IF NOT EXISTS public.ruja_ebd_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id uuid NOT NULL REFERENCES public.ruja_plataformas(id),
  licao_id uuid NOT NULL REFERENCES public.ruja_ebd_licoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ruja_ebd_materiais_licao ON public.ruja_ebd_materiais(licao_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ruja-ebd-materiais', 'ruja-ebd-materiais', false, 52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'video/mp4']::text[]
)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.ruja_ebd_materiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ebd_materiais_access ON public.ruja_ebd_materiais;
CREATE POLICY ebd_materiais_access ON public.ruja_ebd_materiais FOR ALL TO authenticated
USING (public.ruja_has_platform_module(plataforma_id, 'arquivos'))
WITH CHECK (uploaded_by = auth.uid() AND public.ruja_has_platform_module(plataforma_id, 'arquivos'));

DROP POLICY IF EXISTS ebd_storage_select ON storage.objects;
CREATE POLICY ebd_storage_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ruja-ebd-materiais' AND public.ruja_has_platform_module(split_part(name, '/', 1)::uuid, 'arquivos'));
DROP POLICY IF EXISTS ebd_storage_insert ON storage.objects;
CREATE POLICY ebd_storage_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ruja-ebd-materiais' AND public.ruja_has_platform_module(split_part(name, '/', 1)::uuid, 'arquivos'));
DROP POLICY IF EXISTS ebd_storage_delete ON storage.objects;
CREATE POLICY ebd_storage_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ruja-ebd-materiais' AND public.ruja_has_platform_module(split_part(name, '/', 1)::uuid, 'arquivos'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruja_ebd_materiais TO authenticated;
