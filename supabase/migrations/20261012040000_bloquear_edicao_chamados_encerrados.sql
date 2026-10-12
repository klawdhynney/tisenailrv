-- Migration: Bloquear edição de chamados finalizados ou cancelados e permitir visualização completa aos solicitantes
-- 1. Impede qualquer UPDATE (por solicitante, gestor ou admin) em chamados com status Resolvido, Finalizado ou Cancelado
-- 2. Permite ao solicitante visualizar todos os seus chamados (abertos, em atendimento, resolvidos, finalizados e cancelados)
-- 3. Cria a função RPC get_my_tickets() para carregamento direto seguro e atualiza as políticas e RPCs de progresso

-- ============================================================================
-- PARTE 1: TRIGGER DE IMUTABILIDADE PARA CHAMADOS ENCERRADOS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_ticket_not_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o chamado já estava em status de encerramento, rejeita qualquer alteração subsequente
  IF OLD.status IN ('Resolvido', 'Finalizado', 'Cancelado') THEN
    RAISE EXCEPTION 'Chamados finalizados ou cancelados não podem ser alterados.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_update_chamado_encerrado ON public.tickets;
CREATE TRIGGER trg_bloquear_update_chamado_encerrado
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_ticket_not_closed();

-- ============================================================================
-- PARTE 2: RPC add_ticket_information COM BLOQUEIO DE CHAMADOS ENCERRADOS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.add_ticket_information(ticket_id integer, additional_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_description text;
  current_status text;
  v_uid uuid := auth.uid();
  v_email text;
  v_is_owner boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária para atualizar o chamado.';
  END IF;

  IF additional_text IS NULL OR length(btrim(additional_text)) < 3 OR length(btrim(additional_text)) > 1000 THEN
    RAISE EXCEPTION 'A informação complementar deve conter entre 3 e 1000 caracteres.';
  END IF;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  IF v_email = '' THEN
    SELECT lower(btrim(coalesce(email, ''))) INTO v_email
    FROM public.user_profiles
    WHERE id = v_uid;
  END IF;

  SELECT
    t.descricao,
    t.status,
    (
      public.is_gestor_or_admin()
      OR t.criado_por = v_uid
      OR t.solicitante_id = v_uid
      OR (v_email <> '' AND t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = v_email)
      OR (v_email <> '' AND t.contato IS NOT NULL AND lower(t.contato) LIKE '%' || v_email || '%')
    )
  INTO current_description, current_status, v_is_owner
  FROM public.tickets t
  WHERE t.id = ticket_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_is_owner THEN
    RAISE EXCEPTION 'Chamado indisponível para esta conta de usuário.';
  END IF;

  IF current_status IN ('Resolvido', 'Finalizado', 'Cancelado') THEN
    RAISE EXCEPTION 'Chamados finalizados ou cancelados não podem ser alterados.';
  END IF;

  IF length(coalesce(current_description, '')) + length(additional_text) + 60 > 3500 THEN
    RAISE EXCEPTION 'Limite máximo de caracteres do chamado atingido.';
  END IF;

  UPDATE public.tickets
  SET descricao = coalesce(current_description, '') || E'\n\n[Informação do solicitante em ' || to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI') || ']: ' || btrim(additional_text)
  WHERE id = ticket_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.add_ticket_information(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_ticket_information(integer, text) TO authenticated;

-- ============================================================================
-- PARTE 3: RPC get_my_tickets() PARA CARREGAMENTO DIRETO DOS CHAMADOS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_tickets()
RETURNS TABLE (
  id integer,
  aberto_em date,
  hora text,
  descricao text,
  status text,
  prioridade text,
  solicitante text,
  local text,
  setor text,
  procedimento text,
  contato text,
  solicitante_email text,
  fechado_em date,
  horario text,
  sla_reiniciado_em text,
  sla_pausado boolean,
  sla_pausado_em text,
  sla_pausa_motivo text,
  sla_segundos_pausados_acumulados integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_is_gestor boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  v_is_gestor := public.is_gestor_or_admin();
  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  IF v_email = '' THEN
    SELECT lower(btrim(coalesce(email, ''))) INTO v_email
    FROM public.user_profiles
    WHERE id = v_uid;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.aberto_em,
    t.hora,
    t.descricao,
    t.status,
    t.prioridade,
    t.solicitante,
    COALESCE(t.local, ''),
    t.setor,
    t.procedimento,
    t.contato,
    t.solicitante_email,
    t.fechado_em,
    t.horario,
    t.sla_reiniciado_em,
    COALESCE(t.sla_pausado, false),
    t.sla_pausado_em,
    t.sla_pausa_motivo,
    COALESCE(t.sla_segundos_pausados_acumulados, 0)
  FROM public.tickets t
  WHERE (
    v_is_gestor
    OR t.criado_por = v_uid
    OR t.solicitante_id = v_uid
    OR (v_email <> '' AND (
         (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = v_email)
         OR (t.contato IS NOT NULL AND lower(t.contato) LIKE '%' || v_email || '%')
       ))
    OR EXISTS (
         SELECT 1 FROM public.user_profiles up
         WHERE up.id = v_uid
           AND up.email IS NOT NULL
           AND (
             (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(up.email)))
             OR (t.contato IS NOT NULL AND lower(t.contato) LIKE '%' || lower(btrim(up.email)) || '%')
           )
       )
  )
  ORDER BY t.id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_tickets() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_tickets() TO authenticated;

-- ============================================================================
-- PARTE 4: ATUALIZAÇÃO DAS RPCS DE SLA E PROGRESSO COM COBERTURA TOTAL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.public_ticket_sla_progress()
RETURNS TABLE (
  id integer,
  aberto_em date,
  hora text,
  prioridade text,
  status text,
  categoria text,
  fechado_em date,
  horario text,
  sla_reiniciado_em text,
  sla_pausado boolean,
  sla_pausado_em text,
  sla_pausa_motivo text,
  sla_segundos_pausados_acumulados integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_gestor boolean := false;
  v_user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  v_is_gestor := public.is_gestor_or_admin();
  v_user_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  IF v_user_email = '' THEN
    SELECT lower(btrim(coalesce(email, ''))) INTO v_user_email
    FROM public.user_profiles
    WHERE id = auth.uid();
  END IF;

  IF v_is_gestor THEN
    RETURN QUERY
    SELECT
      t.id,
      t.aberto_em,
      t.hora,
      t.prioridade,
      t.status,
      COALESCE(t.categoria, 'Outros'),
      t.fechado_em,
      t.horario,
      t.sla_reiniciado_em,
      COALESCE(t.sla_pausado, false),
      t.sla_pausado_em,
      t.sla_pausa_motivo,
      COALESCE(t.sla_segundos_pausados_acumulados, 0)
    FROM public.tickets t
    ORDER BY t.id DESC;
  ELSE
    RETURN QUERY
    SELECT
      t.id,
      t.aberto_em,
      t.hora,
      t.prioridade,
      t.status,
      COALESCE(t.categoria, 'Outros'),
      t.fechado_em,
      t.horario,
      t.sla_reiniciado_em,
      COALESCE(t.sla_pausado, false),
      t.sla_pausado_em,
      t.sla_pausa_motivo,
      COALESCE(t.sla_segundos_pausados_acumulados, 0)
    FROM public.tickets t
    WHERE t.criado_por = auth.uid()
       OR t.solicitante_id = auth.uid()
       OR (v_user_email <> '' AND t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = v_user_email)
       OR (v_user_email <> '' AND t.contato IS NOT NULL AND lower(t.contato) LIKE '%' || v_user_email || '%')
       OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND up.email IS NOT NULL
              AND (
                (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(up.email)))
                OR (t.contato IS NOT NULL AND lower(t.contato) LIKE '%' || lower(btrim(up.email)) || '%')
              )
          )
    ORDER BY t.id DESC;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.public_ticket_sla_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_ticket_sla_progress() TO authenticated;

CREATE OR REPLACE FUNCTION public.public_ticket_progress()
RETURNS TABLE (
  id integer,
  aberto_em date,
  prioridade text,
  status text,
  categoria text,
  fechado_em date
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_gestor boolean := false;
  v_user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  v_is_gestor := public.is_gestor_or_admin();
  v_user_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  IF v_user_email = '' THEN
    SELECT lower(btrim(coalesce(email, ''))) INTO v_user_email
    FROM public.user_profiles
    WHERE id = auth.uid();
  END IF;

  IF v_is_gestor THEN
    RETURN QUERY
    SELECT t.id, t.aberto_em, t.prioridade, t.status, COALESCE(t.categoria, 'Outros'), t.fechado_em
    FROM public.tickets t ORDER BY t.id DESC;
  ELSE
    RETURN QUERY
    SELECT t.id, t.aberto_em, t.prioridade, t.status, COALESCE(t.categoria, 'Outros'), t.fechado_em
    FROM public.tickets t
    WHERE t.criado_por = auth.uid()
       OR t.solicitante_id = auth.uid()
       OR (v_user_email <> '' AND t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = v_user_email)
       OR (v_user_email <> '' AND t.contato IS NOT NULL AND lower(t.contato) LIKE '%' || v_user_email || '%')
       OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND up.email IS NOT NULL
              AND (
                (t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = lower(btrim(up.email)))
                OR (t.contato IS NOT NULL AND lower(t.contato) LIKE '%' || lower(btrim(up.email)) || '%')
              )
          )
    ORDER BY t.id DESC;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.public_ticket_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_ticket_progress() TO authenticated;

-- ============================================================================
-- PARTE 5: POLÍTICA RLS PARA public.tickets COM IDENTIFICAÇÃO ABRANGENTE
-- ============================================================================
DROP POLICY IF EXISTS "Solicitante ve apenas seus chamados" ON public.tickets;
CREATE POLICY "Solicitante ve apenas seus chamados" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    public.is_gestor_or_admin()
    OR criado_por = auth.uid()
    OR solicitante_id = auth.uid()
    OR (
      solicitante_email IS NOT NULL
      AND (
        lower(btrim(solicitante_email)) = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid()
            AND up.email IS NOT NULL
            AND lower(btrim(up.email)) = lower(btrim(tickets.solicitante_email))
        )
      )
    )
    OR (
      contato IS NOT NULL
      AND (
        (auth.jwt() ->> 'email' IS NOT NULL AND auth.jwt() ->> 'email' <> '' AND lower(contato) LIKE '%' || lower(btrim(auth.jwt() ->> 'email')) || '%')
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid()
            AND up.email IS NOT NULL
            AND lower(tickets.contato) LIKE '%' || lower(btrim(up.email)) || '%'
        )
      )
    )
  );
