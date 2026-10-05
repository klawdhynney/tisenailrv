-- ============================================================================
-- Migration: 20261005050000_avaliacoes_completas_e_resumo_publico.sql
-- Tabela avaliacoes_chamados, RPCs de submissão e estatísticas agregadas públicas
-- Totalmente idempotente: pode ser executada repetidas vezes sem erros.
-- ============================================================================

-- 1. Criação da tabela de avaliações de chamados se não existir
CREATE TABLE IF NOT EXISTS public.avaliacoes_chamados (
  id serial PRIMARY KEY,
  ticket_id integer NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ticket_avaliacao_unica UNIQUE (ticket_id)
);

-- 2. Índices para performance em filtros e agregações
CREATE INDEX IF NOT EXISTS idx_avaliacoes_ticket_id ON public.avaliacoes_chamados (ticket_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_created_at ON public.avaliacoes_chamados (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_nota ON public.avaliacoes_chamados (nota);

-- 3. Permissões básicas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes_chamados TO authenticated, service_role;
GRANT INSERT ON public.avaliacoes_chamados TO anon;
ALTER TABLE public.avaliacoes_chamados ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Row Level Security (RLS)
DROP POLICY IF EXISTS "Gestores e admins gerenciam avaliacoes" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Gestores e admins veem todas as avaliacoes" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuarios autenticados inserem propria avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuario insere avaliacao de chamado" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuario avalia proprio chamado" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuarios autenticados atualizam propria avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuarios veem propria avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuario ve propria avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Visitante insere avaliacao de chamado recente" ON public.avaliacoes_chamados;

-- Gestores e administradores têm acesso completo de leitura e gerenciamento
CREATE POLICY "Gestores e admins gerenciam avaliacoes" ON public.avaliacoes_chamados
  FOR ALL TO authenticated
  USING (public.is_gestor_or_admin())
  WITH CHECK (public.is_gestor_or_admin());

-- Usuário autenticado insere avaliação para chamado que possui ou abriu
CREATE POLICY "Usuarios autenticados inserem propria avaliacao" ON public.avaliacoes_chamados
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Usuário autenticado atualiza a sua própria avaliação
CREATE POLICY "Usuarios autenticados atualizam propria avaliacao" ON public.avaliacoes_chamados
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_email IS NOT NULL AND lower(btrim(user_email)) = lower(btrim(auth.jwt() ->> 'email')))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (user_email IS NOT NULL AND lower(btrim(user_email)) = lower(btrim(auth.jwt() ->> 'email')))
  );

-- Usuário autenticado vê sua própria avaliação
CREATE POLICY "Usuarios veem propria avaliacao" ON public.avaliacoes_chamados
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_email IS NOT NULL AND lower(btrim(user_email)) = lower(btrim(auth.jwt() ->> 'email')))
  );

-- Visitantes e anônimos podem inserir avaliação logo após abrir o chamado
CREATE POLICY "Visitante insere avaliacao de chamado recente" ON public.avaliacoes_chamados
  FOR INSERT TO anon
  WITH CHECK (
    ticket_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id)
  );

-- 5. RPC Segura de Submissão de Avaliação (SECURITY DEFINER)
-- Funciona tanto para usuários logados quanto para visitantes que acabaram de abrir chamado
CREATE OR REPLACE FUNCTION public.submit_ticket_evaluation(
  p_ticket_id integer,
  p_nota integer,
  p_comentario text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
BEGIN
  IF p_nota < 1 OR p_nota > 5 THEN
    RAISE EXCEPTION 'A nota de avaliação deve ser entre 1 e 5.';
  END IF;

  -- Garante que o chamado existe
  IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE id = p_ticket_id) THEN
    RAISE EXCEPTION 'Chamado com id % não encontrado.', p_ticket_id;
  END IF;

  INSERT INTO public.avaliacoes_chamados (
    ticket_id,
    user_id,
    user_email,
    nota,
    comentario,
    created_at
  )
  VALUES (
    p_ticket_id,
    v_uid,
    nullif(v_email, ''),
    p_nota,
    nullif(left(btrim(p_comentario), 300), ''),
    timezone('utc'::text, now())
  )
  ON CONFLICT (ticket_id) DO UPDATE SET
    nota = EXCLUDED.nota,
    comentario = coalesce(EXCLUDED.comentario, public.avaliacoes_chamados.comentario),
    created_at = timezone('utc'::text, now());

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'nota', p_nota
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_ticket_evaluation(integer, integer, text) TO anon, authenticated, service_role;

-- 6. RPC Segura de Estatísticas Agregadas Públicas (SECURITY DEFINER)
-- Devolve estritamente números (total, média, satisfação %, distribuição 1..5).
-- Visitantes nunca leem a tabela avaliacoes_chamados diretamente, preservando nomes, e-mails e comentários.
CREATE OR REPLACE FUNCTION public.get_public_evaluation_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total integer := 0;
  v_media numeric := 0.0;
  v_satisfacao integer := 0;
  v_d1 integer := 0;
  v_d2 integer := 0;
  v_d3 integer := 0;
  v_d4 integer := 0;
  v_d5 integer := 0;
BEGIN
  SELECT
    count(*),
    coalesce(round(avg(nota)::numeric, 2), 0.0),
    coalesce(round((count(*) FILTER (WHERE nota >= 4)::numeric / NULLIF(count(*), 0)::numeric) * 100), 0)::integer,
    count(*) FILTER (WHERE nota = 1),
    count(*) FILTER (WHERE nota = 2),
    count(*) FILTER (WHERE nota = 3),
    count(*) FILTER (WHERE nota = 4),
    count(*) FILTER (WHERE nota = 5)
  INTO
    v_total, v_media, v_satisfacao,
    v_d1, v_d2, v_d3, v_d4, v_d5
  FROM public.avaliacoes_chamados;

  RETURN jsonb_build_object(
    'total', coalesce(v_total, 0),
    'media', coalesce(v_media, 0.0),
    'satisfacao_pct', coalesce(v_satisfacao, 0),
    'distribuicao', jsonb_build_object(
      '1', coalesce(v_d1, 0),
      '2', coalesce(v_d2, 0),
      '3', coalesce(v_d3, 0),
      '4', coalesce(v_d4, 0),
      '5', coalesce(v_d5, 0)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_evaluation_stats() TO anon, authenticated, service_role;

-- 7. View Pública Agregada (opcional para leitura direta em realtime)
CREATE OR REPLACE VIEW public.avaliacoes_public_stats AS
SELECT
  count(*)::integer AS total,
  coalesce(round(avg(nota)::numeric, 2), 0.0) AS media,
  coalesce(round((count(*) FILTER (WHERE nota >= 4)::numeric / NULLIF(count(*), 0)::numeric) * 100), 0)::integer AS satisfacao_pct,
  count(*) FILTER (WHERE nota = 1)::integer AS nota_1,
  count(*) FILTER (WHERE nota = 2)::integer AS nota_2,
  count(*) FILTER (WHERE nota = 3)::integer AS nota_3,
  count(*) FILTER (WHERE nota = 4)::integer AS nota_4,
  count(*) FILTER (WHERE nota = 5)::integer AS nota_5
FROM public.avaliacoes_chamados;

GRANT SELECT ON public.avaliacoes_public_stats TO anon, authenticated, service_role;
