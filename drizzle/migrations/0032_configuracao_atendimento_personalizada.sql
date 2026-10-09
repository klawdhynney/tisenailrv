-- Migration 0032: Configuração de Atendimento Personalizada e Colunas da Planilha
-- Descrição: Assegura a estrutura de persistência das configurações da Central de Atendimento,
-- incluindo ordem e visibilidade de colunas, limites de texto, chips de status, regras de SLA
-- e permissões seguras via RLS (leitura autorizada para operadores/técnicos, alteração exclusiva para administradores).

-- 1. Garante que a tabela configuracoes existe e possui a coluna regras como JSONB
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id INT PRIMARY KEY DEFAULT 1,
  regras JSONB NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garante pelo menos o registro base com id 1
INSERT INTO public.configuracoes (id, regras, atualizado_em)
VALUES (1, '{}'::jsonb, timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

-- 2. Habilita Row Level Security na tabela configuracoes
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS para leitura de configuracoes:
-- Qualquer usuário autenticado que utilize o atendimento ou solicitantes podem ler as regras do sistema
DROP POLICY IF EXISTS "Leitura de configuracoes para autenticados" ON public.configuracoes;
CREATE POLICY "Leitura de configuracoes para autenticados"
  ON public.configuracoes
  FOR SELECT
  TO authenticated
  USING (true);

-- Leitura pública para páginas anônimas caso necessário
DROP POLICY IF EXISTS "Leitura publica de configuracoes gerais" ON public.configuracoes;
CREATE POLICY "Leitura publica de configuracoes gerais"
  ON public.configuracoes
  FOR SELECT
  TO anon
  USING (true);

-- 4. Políticas de RLS para alteração de configuracoes:
-- Apenas usuários com papel 'admin' ou 'gestor' na tabela user_roles podem alterar as configurações
DROP POLICY IF EXISTS "Admins e gestores podem atualizar configuracoes" ON public.configuracoes;
CREATE POLICY "Admins e gestores podem atualizar configuracoes"
  ON public.configuracoes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Admins podem inserir configuracoes" ON public.configuracoes;
CREATE POLICY "Admins podem inserir configuracoes"
  ON public.configuracoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

-- 5. Comentários explicativos
COMMENT ON TABLE public.configuracoes IS 'Tabela única de configurações globais do sistema TI SENAI LRV, valendo para todos os usuários e dispositivos.';
COMMENT ON COLUMN public.configuracoes.regras IS 'Objeto JSON com configurações visuais, colunas da planilha de atendimento, prazos de SLA, status e preferências.';
