-- Migração 0016: Habilita publicação em tempo real para a tabela de configurações e garante registro inicial
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'configuracoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracoes;
  END IF;
END $$;

-- Garante que o registro id=1 exista de forma segura e idempotente
INSERT INTO public.configuracoes (id, regras, updated_at)
VALUES (1, '{}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;
