-- ============================================================================
-- Migração: 20261005070000_dashboard_seguranca_indicadores_dia.sql
-- Módulo: Segurança do Dashboard e Novos Indicadores Diários (America/Cuiaba)
-- ============================================================================

-- 1. get_public_daily_stats()
-- Retorna os indicadores do dia corrente (chamados_do_dia e atendidos_no_dia)
-- calculados estritamente na timezone 'America/Cuiaba' (UTC-4) no intervalo 00:00 às 23:59.
-- Acessível publicamente sem expor dados pessoais ou tickets individuais.
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
  -- Data de hoje calculada pelo fuso horário oficial America/Cuiaba (UTC-4)
  v_hoje_cuiaba := (timezone('America/Cuiaba', now()))::date;

  -- Chamados abertos no dia corrente (00:00 às 23:59)
  SELECT COUNT(*)::integer
  INTO v_chamados_dia
  FROM public.tickets t
  WHERE (t.aberto_em = v_hoje_cuiaba)
     OR (t.created_at IS NOT NULL AND (timezone('America/Cuiaba', t.created_at))::date = v_hoje_cuiaba);

  -- Chamados atendidos/concluídos no dia corrente (00:00 às 23:59)
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

-- 2. Restringir public_ticket_sla_progress() exclusivamente para usuários autenticados
-- Garante que o dashboard e métricas detalhadas exijam login no backend
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
  -- Requer autenticação ativa para proteção dos dados da esteira de chamados
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
