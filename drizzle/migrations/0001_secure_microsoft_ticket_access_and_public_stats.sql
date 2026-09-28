ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS solicitante_email text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS criado_por uuid;
CREATE INDEX IF NOT EXISTS tickets_criado_por_idx ON public.tickets(criado_por);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_import_source_idx ON public.tickets (id);
REVOKE INSERT ON public.tickets FROM anon;
DROP POLICY IF EXISTS "Qualquer pessoa abre chamado" ON public.tickets;
CREATE POLICY "Usuario corporativo abre chamado" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por AND lower(solicitante_email) = lower(auth.jwt() ->> 'email') AND (lower(auth.jwt() ->> 'email') LIKE '%@senaimt.%' OR lower(auth.jwt() ->> 'email') LIKE '%@sesisenaimt.%') AND status = 'Aberto' AND responsavel IS NULL AND procedimento IS NULL AND fechado_em IS NULL);
CREATE POLICY "Usuario corporativo ve seus chamados" ON public.tickets FOR SELECT TO authenticated USING (criado_por = auth.uid() AND (lower(auth.jwt() ->> 'email') LIKE '%@senaimt.%' OR lower(auth.jwt() ->> 'email') LIKE '%@sesisenaimt.%'));
CREATE TABLE public.ticket_public_stats (
  mes text NOT NULL,
  prioridade text NOT NULL,
  status text NOT NULL,
  setor text NOT NULL,
  categoria text NOT NULL,
  total integer NOT NULL,
  PRIMARY KEY (mes, prioridade, status, setor, categoria)
);
GRANT SELECT ON public.ticket_public_stats TO anon, authenticated;
GRANT ALL ON public.ticket_public_stats TO service_role;
ALTER TABLE public.ticket_public_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem agregados" ON public.ticket_public_stats FOR SELECT TO anon, authenticated USING (true);
CREATE OR REPLACE FUNCTION public.refresh_ticket_public_stats() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  DELETE FROM public.ticket_public_stats;
  INSERT INTO public.ticket_public_stats (mes, prioridade, status, setor, categoria, total)
  SELECT to_char(aberto_em, 'YYYY-MM'), prioridade, status, setor, coalesce(categoria, 'Outros'), count(*)::integer
  FROM public.tickets GROUP BY 1,2,3,4,5;
  RETURN NULL;
END $$;
CREATE TRIGGER refresh_ticket_public_stats_trigger AFTER INSERT OR UPDATE OR DELETE ON public.tickets FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_ticket_public_stats();
INSERT INTO public.ticket_public_stats (mes, prioridade, status, setor, categoria, total)
SELECT to_char(aberto_em, 'YYYY-MM'), prioridade, status, setor, coalesce(categoria, 'Outros'), count(*)::integer FROM public.tickets GROUP BY 1,2,3,4,5;