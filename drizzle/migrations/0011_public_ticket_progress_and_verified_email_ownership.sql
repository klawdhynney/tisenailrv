DROP POLICY IF EXISTS "Qualquer pessoa abre chamado" ON public.tickets;
CREATE POLICY "Qualquer pessoa abre chamado com email" ON public.tickets FOR INSERT TO anon, authenticated WITH CHECK (
 ((auth.uid() IS NULL AND criado_por IS NULL) OR (auth.uid() IS NOT NULL AND criado_por = auth.uid()))
 AND solicitante_email IS NOT NULL AND length(btrim(solicitante_email)) BETWEEN 5 AND 254
 AND solicitante_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
 AND length(btrim(solicitante)) BETWEEN 2 AND 120
 AND length(btrim(setor)) BETWEEN 2 AND 120
 AND length(btrim(local)) BETWEEN 3 AND 240
 AND length(btrim(descricao)) BETWEEN 10 AND 3000
 AND categoria IS NOT NULL AND length(btrim(categoria)) BETWEEN 2 AND 120
 AND prioridade = 'Média' AND status = 'Aberto' AND responsavel IS NULL
 AND procedimento IS NULL AND fechado_em IS NULL AND horario IS NULL
 AND sla_reiniciado_em IS NULL AND aberto_em = CURRENT_DATE AND hora = to_char(now(), 'HH24:MI')
);
CREATE OR REPLACE FUNCTION public.verified_ticket_owner(ticket_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND ticket_email IS NOT NULL
 AND lower(btrim(ticket_email)) = lower(btrim(auth.jwt() ->> 'email'))
 AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL AND lower(email) = lower(btrim(ticket_email)))
$$;
REVOKE ALL ON FUNCTION public.verified_ticket_owner(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verified_ticket_owner(text) TO authenticated;
CREATE POLICY "Solicitante confirmado ve seus chamados" ON public.tickets FOR SELECT TO authenticated USING (public.verified_ticket_owner(solicitante_email));
CREATE OR REPLACE FUNCTION public.add_ticket_information(ticket_id integer, additional_text text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_description text;
BEGIN
 IF additional_text IS NULL OR length(btrim(additional_text)) < 5 OR length(btrim(additional_text)) > 1000 THEN RAISE EXCEPTION 'Informação deve conter de 5 a 1000 caracteres'; END IF;
 SELECT descricao INTO current_description FROM public.tickets WHERE id = ticket_id AND public.verified_ticket_owner(solicitante_email) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Chamado indisponível para esta conta'; END IF;
 IF length(current_description) + length(additional_text) + 30 > 3000 THEN RAISE EXCEPTION 'Limite de texto do chamado atingido'; END IF;
 UPDATE public.tickets SET descricao = current_description || E'\n\nInformação adicional do solicitante: ' || btrim(additional_text) WHERE id = ticket_id;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.add_ticket_information(integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_ticket_information(integer,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.public_ticket_progress()
RETURNS TABLE (id integer, aberto_em date, prioridade text, status text, categoria text, fechado_em date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT t.id, t.aberto_em, t.prioridade, t.status, COALESCE(t.categoria, 'Outros'), t.fechado_em
 FROM public.tickets t ORDER BY t.id DESC
$$;
REVOKE ALL ON FUNCTION public.public_ticket_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_ticket_progress() TO anon, authenticated;