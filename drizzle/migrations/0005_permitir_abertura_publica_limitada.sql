GRANT INSERT ON public.tickets TO anon;
CREATE POLICY "Visitante abre chamado limitado" ON public.tickets FOR INSERT TO anon WITH CHECK (
  criado_por IS NULL AND solicitante_email IS NOT NULL
  AND solicitante_email ~* '^[^@[:space:]]+@(senaimt|sesisenaimt)\.[^@[:space:]]+$'
  AND length(solicitante) BETWEEN 2 AND 120 AND length(setor) BETWEEN 2 AND 120
  AND length(local) BETWEEN 3 AND 240 AND length(descricao) BETWEEN 10 AND 3000
  AND categoria IS NOT NULL AND length(categoria) BETWEEN 2 AND 120
  AND prioridade IN ('Crítica','Alta','Média','Baixa')
  AND status = 'Aberto' AND responsavel IS NULL AND procedimento IS NULL
  AND fechado_em IS NULL AND horario IS NULL AND sla_reiniciado_em IS NULL
  AND aberto_em = current_date AND hora = to_char(now(), 'HH24:MI')
);
CREATE OR REPLACE FUNCTION public.limit_public_ticket_submissions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(lower(coalesce(NEW.solicitante_email, '')), 0));
    IF (SELECT count(*) FROM public.tickets WHERE lower(solicitante_email) = lower(NEW.solicitante_email) AND created_at > now() - interval '1 hour') >= 3 THEN
      RAISE EXCEPTION 'Limite de chamados por hora para este e-mail atingido';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tickets_limit_public_submissions BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.limit_public_ticket_submissions();