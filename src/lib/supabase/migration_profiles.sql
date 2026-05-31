-- ════════════════════════════════════════════════════════════════
-- RUJA — MIGRATION: ruja_profiles
-- Execute no SQL Editor do Supabase
-- ════════════════════════════════════════════════════════════════

-- Tabela de perfis (vinculada ao Supabase Auth)
CREATE TABLE IF NOT EXISTS ruja_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'voluntario'
                CHECK (role IN ('lider_supremo', 'admin', 'lider_departamento', 'voluntario')),
  departamento  TEXT DEFAULT '',
  ativo         BOOLEAN DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ruja_profiles ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado pode ler perfis
CREATE POLICY "profiles_select" ON ruja_profiles
  FOR SELECT TO authenticated USING (true);

-- Insert/Update: apenas via service_role (API Route)
CREATE POLICY "profiles_service_insert" ON ruja_profiles
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "profiles_service_update" ON ruja_profiles
  FOR UPDATE TO service_role USING (true);

-- Usuário pode atualizar o próprio perfil (nome, etc)
CREATE POLICY "profiles_self_update" ON ruja_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_role   ON ruja_profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo  ON ruja_profiles(ativo);

-- Função: verificar se usuário atual é admin ou lider_supremo
CREATE OR REPLACE FUNCTION ruja_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM ruja_profiles
    WHERE id = auth.uid()
    AND role IN ('lider_supremo', 'admin')
    AND ativo = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Comentário
COMMENT ON TABLE ruja_profiles IS 'Perfis de usuários do RUJA vinculados ao Supabase Auth';
