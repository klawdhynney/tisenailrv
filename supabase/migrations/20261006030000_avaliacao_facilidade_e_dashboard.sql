-- ============================================================================
-- MIGRATION: NOTA DE FACILIDADE DE ABERTURA E INDICADORES DE SATISFAÇÃO NO DASHBOARD
-- ============================================================================

-- 1. ADICIONAR COLUNAS nota_facilidade E atendente EM avaliacoes_chamados
ALTER TABLE public.avaliacoes_chamados
  ADD COLUMN IF NOT EXISTS nota_facilidade integer CHECK (nota_facilidade IS NULL OR (nota_facilidade >= 1 AND nota_facilidade <= 5));

ALTER TABLE public.avaliacoes_chamados
  ADD COLUMN IF NOT EXISTS atendente text;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_nota_facilidade ON public.avaliacoes_chamados (nota_facilidade);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_atendente ON public.avaliacoes_chamados (atendente);

-- 2. POLÍTICA DE RLS: USUÁRIO SÓ CONSEGUE AVALIAR OS PRÓPRIOS CHAMADOS
DROP POLICY IF EXISTS "Usuarios autenticados inserem propria avaliacao" ON public.avaliacoes_chamados;
CREATE POLICY "Usuarios autenticados inserem propria avaliacao" ON public.avaliacoes_chamados
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
      AND (
        t.criado_por = auth.uid()
        OR (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(auth.jwt() ->> 'email')))
        OR public.is_gestor_or_admin()
      )
    )
  );

-- 3. RPC DE SUBMISSÃO COMPATÍVEL COM NOTA E NOTA_FACILIDADE
DROP FUNCTION IF EXISTS public.submit_ticket_evaluation(integer, integer, text);
DROP FUNCTION IF EXISTS public.submit_ticket_evaluation(integer, integer, text, integer, text);

CREATE OR REPLACE FUNCTION public.submit_ticket_evaluation(
  p_ticket_id integer,
  p_nota integer,
  p_comentario text DEFAULT NULL,
  p_nota_facilidade integer DEFAULT NULL,
  p_atendente text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_resp text := nullif(btrim(p_atendente), '');
  v_ticket_owner_email text;
  v_ticket_criado_por uuid;
BEGIN
  IF p_nota < 1 OR p_nota > 5 THEN
    RAISE EXCEPTION 'A nota de avaliação deve ser entre 1 e 5.';
  END IF;

  IF p_nota_facilidade IS NOT NULL AND (p_nota_facilidade < 1 OR p_nota_facilidade > 5) THEN
    RAISE EXCEPTION 'A nota de facilidade deve ser entre 1 e 5.';
  END IF;

  SELECT responsavel, solicitante_email, criado_por
  INTO v_resp, v_ticket_owner_email, v_ticket_criado_por
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado com id % não encontrado.', p_ticket_id;
  END IF;

  -- Validação de segurança: se autenticado e não for gestor/admin, valida posse do chamado
  IF v_uid IS NOT NULL AND NOT public.is_gestor_or_admin() THEN
    IF v_ticket_criado_por IS NOT NULL AND v_ticket_criado_por <> v_uid AND
       (v_ticket_owner_email IS NULL OR lower(btrim(v_ticket_owner_email)) <> v_email) THEN
      RAISE EXCEPTION 'Acesso negado: você só pode avaliar chamados abertos por você.';
    END IF;
  END IF;

  IF p_atendente IS NOT NULL AND btrim(p_atendente) <> '' THEN
    v_resp := btrim(p_atendente);
  END IF;

  INSERT INTO public.avaliacoes_chamados (
    ticket_id,
    user_id,
    user_email,
    nota,
    nota_facilidade,
    atendente,
    comentario,
    created_at
  )
  VALUES (
    p_ticket_id,
    v_uid,
    nullif(v_email, ''),
    p_nota,
    p_nota_facilidade,
    v_resp,
    nullif(left(btrim(p_comentario), 300), ''),
    timezone('utc'::text, now())
  )
  ON CONFLICT (ticket_id) DO UPDATE SET
    nota = EXCLUDED.nota,
    nota_facilidade = coalesce(EXCLUDED.nota_facilidade, public.avaliacoes_chamados.nota_facilidade),
    atendente = coalesce(EXCLUDED.atendente, public.avaliacoes_chamados.atendente),
    comentario = coalesce(EXCLUDED.comentario, public.avaliacoes_chamados.comentario),
    created_at = timezone('utc'::text, now());

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'nota', p_nota,
    'nota_facilidade', p_nota_facilidade
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_ticket_evaluation(integer, integer, text, integer, text) TO anon, authenticated, service_role;

-- 4. RPC PARA RETORNAR REGISTROS DE AVALIAÇÃO PARA O DASHBOARD (SEM EXPOR PII/E-MAILS)
CREATE OR REPLACE FUNCTION public.get_evaluations_for_dashboard()
RETURNS TABLE (
  id integer,
  ticket_id integer,
  nota integer,
  nota_facilidade integer,
  atendente text,
  categoria text,
  setor text,
  created_at timestamptz
) LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    a.id,
    a.ticket_id,
    a.nota,
    a.nota_facilidade,
    coalesce(nullif(btrim(a.atendente), ''), nullif(btrim(t.responsavel), ''), 'Equipe de TI') as atendente,
    coalesce(nullif(btrim(t.categoria), ''), 'Geral / Outros') as categoria,
    coalesce(nullif(btrim(t.setor), ''), 'Geral') as setor,
    a.created_at
  FROM public.avaliacoes_chamados a
  LEFT JOIN public.tickets t ON t.id = a.ticket_id
  ORDER BY a.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_evaluations_for_dashboard() TO anon, authenticated, service_role;

-- 5. RPC DE ESTATÍSTICAS AGREGADAS EXPANDIDA COM FACILIDADE
CREATE OR REPLACE FUNCTION public.get_public_evaluation_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total integer := 0;
  v_media numeric := 0.0;
  v_satisfacao integer := 0;
  v_d1 integer := 0;
  v_d2 integer := 0;
  v_d3 integer := 0;
  v_d4 integer := 0;
  v_d5 integer := 0;
  v_total_facilidade integer := 0;
  v_media_facilidade numeric := 0.0;
  v_f1 integer := 0;
  v_f2 integer := 0;
  v_f3 integer := 0;
  v_f4 integer := 0;
  v_f5 integer := 0;
BEGIN
  SELECT
    count(*),
    coalesce(round(avg(nota)::numeric, 2), 0.0),
    coalesce(round((count(*) FILTER (WHERE nota >= 4)::numeric / NULLIF(count(*), 0)::numeric) * 100), 0)::integer,
    count(*) FILTER (WHERE nota = 1),
    count(*) FILTER (WHERE nota = 2),
    count(*) FILTER (WHERE nota = 3),
    count(*) FILTER (WHERE nota = 4),
    count(*) FILTER (WHERE nota = 5),
    count(*) FILTER (WHERE nota_facilidade IS NOT NULL),
    coalesce(round(avg(nota_facilidade)::numeric, 2), 0.0),
    count(*) FILTER (WHERE nota_facilidade = 1),
    count(*) FILTER (WHERE nota_facilidade = 2),
    count(*) FILTER (WHERE nota_facilidade = 3),
    count(*) FILTER (WHERE nota_facilidade = 4),
    count(*) FILTER (WHERE nota_facilidade = 5)
  INTO
    v_total, v_media, v_satisfacao,
    v_d1, v_d2, v_d3, v_d4, v_d5,
    v_total_facilidade, v_media_facilidade,
    v_f1, v_f2, v_f3, v_f4, v_f5
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
    ),
    'total_facilidade', coalesce(v_total_facilidade, 0),
    'media_facilidade', coalesce(v_media_facilidade, 0.0),
    'distribuicao_facilidade', jsonb_build_object(
      '1', coalesce(v_f1, 0),
      '2', coalesce(v_f2, 0),
      '3', coalesce(v_f3, 0),
      '4', coalesce(v_f4, 0),
      '5', coalesce(v_f5, 0)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_evaluation_stats() TO anon, authenticated, service_role;
