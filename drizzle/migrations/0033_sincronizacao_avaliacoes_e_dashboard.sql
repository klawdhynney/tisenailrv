-- Migration 0033: Sincronização de avaliações e unificação do dashboard
CREATE TABLE IF NOT EXISTS public.avaliacoes_chamados (
  id serial PRIMARY KEY,
  ticket_id integer NOT NULL,
  user_id uuid,
  user_email text,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  nota_facilidade integer CHECK (nota_facilidade IS NULL OR (nota_facilidade >= 1 AND nota_facilidade <= 5)),
  atendente text,
  comentario text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ticket_avaliacao_unica UNIQUE (ticket_id)
);

ALTER TABLE public.avaliacoes_chamados
  ADD COLUMN IF NOT EXISTS nota_facilidade integer CHECK (nota_facilidade IS NULL OR (nota_facilidade >= 1 AND nota_facilidade <= 5));

ALTER TABLE public.avaliacoes_chamados
  ADD COLUMN IF NOT EXISTS atendente text;

ALTER TABLE public.avaliacoes_chamados
  ADD COLUMN IF NOT EXISTS user_email text;

ALTER TABLE public.avaliacoes_chamados
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.avaliacoes_chamados
  ADD COLUMN IF NOT EXISTS comentario text;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_ticket_id ON public.avaliacoes_chamados (ticket_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_created_at ON public.avaliacoes_chamados (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_nota ON public.avaliacoes_chamados (nota);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_nota_facilidade ON public.avaliacoes_chamados (nota_facilidade);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_atendente ON public.avaliacoes_chamados (atendente);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes_chamados TO authenticated, service_role;
GRANT SELECT, INSERT ON public.avaliacoes_chamados TO anon;
ALTER TABLE public.avaliacoes_chamados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores e admins gerenciam avaliacoes" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuarios autenticados inserem propria avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuarios autenticados atualizam propria avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Usuarios veem propria avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Visitante insere avaliacao" ON public.avaliacoes_chamados;
DROP POLICY IF EXISTS "Leitura publica de avaliacoes" ON public.avaliacoes_chamados;

CREATE POLICY "Gestores e admins gerenciam avaliacoes" ON public.avaliacoes_chamados
  FOR ALL TO authenticated
  USING (
    lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'claudinei.lima@senaimt.ind.br',
      'claudineigoncalvesdelima@hotmail.com',
      'klawdhynney@gmail.com',
      'klaw.com@gmail.com'
    )
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor'))
  )
  WITH CHECK (
    lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'claudinei.lima@senaimt.ind.br',
      'claudineigoncalvesdelima@hotmail.com',
      'klawdhynney@gmail.com',
      'klaw.com@gmail.com'
    )
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor'))
  );

CREATE POLICY "Usuarios autenticados inserem propria avaliacao" ON public.avaliacoes_chamados
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Usuarios autenticados atualizam propria avaliacao" ON public.avaliacoes_chamados
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_email IS NOT NULL AND lower(btrim(user_email)) = lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (user_email IS NOT NULL AND lower(btrim(user_email)) = lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
  );

CREATE POLICY "Usuarios veem propria avaliacao" ON public.avaliacoes_chamados
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_email IS NOT NULL AND lower(btrim(user_email)) = lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
  );

CREATE POLICY "Visitante insere avaliacao" ON public.avaliacoes_chamados
  FOR INSERT TO anon
  WITH CHECK (ticket_id IS NOT NULL);

CREATE POLICY "Leitura publica de avaliacoes" ON public.avaliacoes_chamados
  FOR SELECT TO anon, authenticated
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'avaliacoes_chamados'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.avaliacoes_chamados;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

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
  v_nota_fac integer := coalesce(p_nota_facilidade, p_nota);
BEGIN
  IF p_nota < 1 OR p_nota > 5 THEN
    RAISE EXCEPTION 'A nota de avaliação deve ser entre 1 e 5.';
  END IF;

  IF v_nota_fac IS NOT NULL AND (v_nota_fac < 1 OR v_nota_fac > 5) THEN
    v_nota_fac := p_nota;
  END IF;

  IF v_resp IS NULL THEN
    SELECT responsavel INTO v_resp FROM public.tickets WHERE id = p_ticket_id;
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
    v_nota_fac,
    coalesce(v_resp, 'Equipe de TI'),
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
    'nota_facilidade', v_nota_fac
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_ticket_evaluation(integer, integer, text, integer, text) TO anon, authenticated, service_role;

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

CREATE OR REPLACE FUNCTION public.get_evaluations_for_dashboard()
RETURNS TABLE (
  id integer,
  ticket_id integer,
  nota integer,
  nota_facilidade integer,
  atendente text,
  categoria text,
  setor text,
  comentario text,
  created_at timestamptz
) LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    a.id,
    a.ticket_id,
    a.nota,
    coalesce(a.nota_facilidade, a.nota) as nota_facilidade,
    coalesce(nullif(btrim(a.atendente), ''), nullif(btrim(t.responsavel), ''), 'Equipe de TI') as atendente,
    coalesce(nullif(btrim(t.categoria), ''), 'Geral / Outros') as categoria,
    coalesce(nullif(btrim(t.setor), ''), 'Geral') as setor,
    a.comentario,
    a.created_at
  FROM public.avaliacoes_chamados a
  LEFT JOIN public.tickets t ON t.id = a.ticket_id
  ORDER BY a.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_evaluations_for_dashboard() TO anon, authenticated, service_role;

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

INSERT INTO public.avaliacoes_chamados (
  ticket_id, user_id, user_email, nota, nota_facilidade, comentario, created_at
)
VALUES
  (133, '2ca810d4-487f-40c0-8207-c76f45c76fa1'::uuid, 'klawdhynney@gmail.com', 5, 5, NULL, '2026-10-10 04:27:37.920+00'::timestamptz),
  (15, NULL, NULL, 5, 5, NULL, '2026-10-07 08:23:02.361+00'::timestamptz),
  (14, NULL, NULL, 5, 5, NULL, '2026-10-07 08:22:56.005+00'::timestamptz),
  (13, NULL, NULL, 5, 5, NULL, '2026-10-07 08:22:50.502+00'::timestamptz),
  (12, NULL, NULL, 5, 5, NULL, '2026-10-07 08:22:44.278+00'::timestamptz),
  (11, NULL, NULL, 5, 5, NULL, '2026-10-07 08:22:35.799+00'::timestamptz),
  (10, NULL, NULL, 5, 5, NULL, '2026-10-07 08:22:28.379+00'::timestamptz),
  (9, NULL, NULL, 5, 5, NULL, '2026-10-07 08:22:25.292+00'::timestamptz),
  (8, NULL, NULL, 5, 5, NULL, '2026-10-07 08:22:17.472+00'::timestamptz),
  (7, NULL, NULL, 5, 5, NULL, '2026-10-07 08:22:10.945+00'::timestamptz),
  (6, NULL, NULL, 5, 5, NULL, '2026-10-07 08:22:05.590+00'::timestamptz),
  (5, NULL, NULL, 5, 5, NULL, '2026-10-07 08:21:59.586+00'::timestamptz),
  (4, NULL, NULL, 5, 5, NULL, '2026-10-07 08:21:54.064+00'::timestamptz),
  (3, NULL, NULL, 5, 5, NULL, '2026-10-07 08:21:45.171+00'::timestamptz),
  (126, '2ca810d4-487f-40c0-8207-c76f45c76fa1'::uuid, 'klawdhynney@gmail.com', 5, 5, 'Gostei do sisteminha.', '2026-10-07 07:01:37.193+00'::timestamptz),
  (123, '2ca810d4-487f-40c0-8207-c76f45c76fa1'::uuid, 'klawdhynney@gmail.com', 5, 5, 'Muito bom', '2026-10-07 02:50:19.420+00'::timestamptz),
  (118, '2ca810d4-487f-40c0-8207-c76f45c76fa1'::uuid, 'klawdhynney@gmail.com', 5, 5, NULL, '2026-10-06 04:58:13.594+00'::timestamptz),
  (111, NULL, NULL, 5, 5, NULL, '2026-10-05 06:07:06.742+00'::timestamptz)
ON CONFLICT (ticket_id) DO UPDATE SET
  nota = EXCLUDED.nota,
  nota_facilidade = coalesce(EXCLUDED.nota_facilidade, public.avaliacoes_chamados.nota_facilidade),
  comentario = coalesce(EXCLUDED.comentario, public.avaliacoes_chamados.comentario);
