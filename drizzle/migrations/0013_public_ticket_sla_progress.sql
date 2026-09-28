CREATE FUNCTION public.public_ticket_sla_progress()
RETURNS TABLE (id integer, aberto_em date, hora text, prioridade text, status text, categoria text, fechado_em date, horario text, sla_reiniciado_em text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT t.id, t.aberto_em, t.hora, t.prioridade, t.status, COALESCE(t.categoria, 'Outros'), t.fechado_em, t.horario, t.sla_reiniciado_em
 FROM public.tickets t ORDER BY t.id DESC
$$;
REVOKE ALL ON FUNCTION public.public_ticket_sla_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_ticket_sla_progress() TO anon, authenticated;