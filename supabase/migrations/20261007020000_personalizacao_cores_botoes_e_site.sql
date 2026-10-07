-- Migration: 20261007020000_personalizacao_cores_botoes_e_site.sql
-- Descrição: Garante a persistência global de regras e personalização de cores
-- dos botões e do site na tabela configuracoes com RLS segura.

CREATE TABLE IF NOT EXISTS public.configuracoes (
  id INT PRIMARY KEY,
  regras JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garante a linha única institucional (id = 1) se não existir
INSERT INTO public.configuracoes (id, regras, updated_at)
VALUES (1, '{}'::jsonb, timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

-- Habilita Row Level Security
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Política 1: Todos (anônimos e autenticados) podem ler as configurações
DROP POLICY IF EXISTS "Leitura publica de configuracoes" ON public.configuracoes;
CREATE POLICY "Leitura publica de configuracoes"
  ON public.configuracoes
  FOR SELECT
  TO public
  USING (true);

-- Política 2: Apenas administradores autenticados podem inserir ou atualizar configurações
DROP POLICY IF EXISTS "Apenas administradores podem atualizar configuracoes" ON public.configuracoes;
CREATE POLICY "Apenas administradores podem atualizar configuracoes"
  ON public.configuracoes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

COMMENT ON TABLE public.configuracoes IS 'Tabela central de parâmetros e configurações do sistema (regras de prazos, identidade, cores dos botões e do site).';
