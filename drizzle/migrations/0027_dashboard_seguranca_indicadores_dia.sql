-- ============================================================================
-- Migração Drizzle: 0027_dashboard_seguranca_indicadores_dia.sql
-- Módulo: Segurança do Dashboard e Novos Indicadores Diários (America/Cuiaba)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_daily_stats()
RETURNS TABLE (
  chamados_do_dia integer,
  atendidos_no_dia integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hoje_cuiaba date;
  v_chamados_dia integer := 0;
  v_atendidos_dia integer := 0;
BEGIN
  v_hoje_cuiaba := (timezone('America/Cuiaba', now()))::date;

  SELECT COUNT(*)::integer
  INTO v_chamados_dia
  FROM public.tickets t
  WHERE (t.aberto_em = v_hoje_cuiaba)
     OR (t.created_at IS NOT NULL AND (timezone('America/Cuiaba', t.created_at))::date = v_hoje_cuiaba);

  SELECT COUNT(*)::integer
  INTO v_atendidos_dia
  FROM public.tickets t
  WHERE (t.status IN ('Concluído', 'Resolvido'))
    AND (
      (t.fechado_em = v_hoje_cuiaba)
      OR (t.fechado_em IS NULL AND t.updated_at IS NOT NULL AND (timezone('America/Cuiaba', t.updated_at))::date = v_hoje_cuiaba)
    );

  RETURN QUERY SELECT COALESCE(v_chamados_dia, 0), COALESCE(v_atendidos_dia, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_daily_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_daily_stats() TO anon, authenticated, service_role;

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
  sla_reiniciado_em text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

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
    t.sla_reiniciado_em
  FROM public.tickets t
  ORDER BY t.id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.public_ticket_sla_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_ticket_sla_progress() TO authenticated;
