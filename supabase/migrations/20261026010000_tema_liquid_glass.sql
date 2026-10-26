-- Migration: 20261026010000_tema_liquid_glass.sql
-- Descrição: Garante a compatibilidade e persistência idempotente da nova paleta
-- "Liquid Glass" (estilo Apple) e seus parâmetros em configuracoes.regras.

CREATE TABLE IF NOT EXISTS public.configuracoes (
  id INT PRIMARY KEY,
  regras JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garante a linha institucional padrão (id = 1)
INSERT INTO public.configuracoes (id, regras, updated_at)
VALUES (1, '{}'::jsonb, timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

-- Garante RLS ativa e políticas seguras
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'configuracoes'
      AND policyname = 'Leitura publica de configuracoes'
  ) THEN
    CREATE POLICY "Leitura publica de configuracoes"
      ON public.configuracoes
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

COMMENT ON TABLE public.configuracoes IS 'Tabela central de configurações do sistema (inclui suporte às paletas Padrão, Big Tech, Interstellar e Liquid Glass).';
