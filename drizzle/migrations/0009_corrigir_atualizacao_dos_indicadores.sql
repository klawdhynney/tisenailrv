CREATE OR REPLACE FUNCTION public.refresh_ticket_public_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.ticket_public_stats WHERE mes IS NOT NULL;
  INSERT INTO public.ticket_public_stats (mes, prioridade, status, setor, categoria, total)
  SELECT to_char(aberto_em, 'YYYY-MM'), prioridade, status, setor, coalesce(categoria, 'Outros'), count(*)::integer
  FROM public.tickets
  GROUP BY 1,2,3,4,5;
  RETURN NULL;
END
$function$;