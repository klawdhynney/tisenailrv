-- Migration: Restrição de Acompanhamento de Chamados Próprios para Usuários Comuns
-- Garante que solicitantes comuns visualizem estritamente os seus próprios chamados
-- Gestores e Administradores continuam com visão completa de toda a esteira de atendimento

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

  IF v_is_gestor THEN
    -- Gestores e administradores de TI acompanham toda a esteira de chamados
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
    -- Solicitante comum: visualiza estritamente os seus próprios chamados
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
       OR t.user_id = auth.uid()
       OR (v_user_email <> '' AND t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = v_user_email)
       OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND t.solicitante_email IS NOT NULL
              AND lower(btrim(t.solicitante_email)) = lower(btrim(up.email))
          )
    ORDER BY t.id DESC;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.public_ticket_sla_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_ticket_sla_progress() TO authenticated;

-- Atualização equivalente de public_ticket_progress()
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

  IF v_is_gestor THEN
    RETURN QUERY
    SELECT t.id, t.aberto_em, t.prioridade, t.status, COALESCE(t.categoria, 'Outros'), t.fechado_em
    FROM public.tickets t ORDER BY t.id DESC;
  ELSE
    RETURN QUERY
    SELECT t.id, t.aberto_em, t.prioridade, t.status, COALESCE(t.categoria, 'Outros'), t.fechado_em
    FROM public.tickets t
    WHERE t.criado_por = auth.uid()
       OR t.user_id = auth.uid()
       OR (v_user_email <> '' AND t.solicitante_email IS NOT NULL AND lower(btrim(t.solicitante_email)) = v_user_email)
       OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND t.solicitante_email IS NOT NULL
              AND lower(btrim(t.solicitante_email)) = lower(btrim(up.email))
          )
    ORDER BY t.id DESC;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.public_ticket_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_ticket_progress() TO authenticated;
