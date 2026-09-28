CREATE OR REPLACE FUNCTION public.limit_public_ticket_submissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.created_at := now();
    NEW.aberto_em := current_date;
    NEW.hora := to_char(now(), 'HH24:MI');
    IF NEW.solicitante_email IS NOT NULL AND btrim(NEW.solicitante_email) <> '' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(lower(NEW.solicitante_email), 0));
      IF (SELECT count(*) FROM public.tickets WHERE lower(solicitante_email) = lower(NEW.solicitante_email) AND created_at > now() - interval '1 hour') >= 3 THEN
        RAISE EXCEPTION 'Limite de chamados por hora para este e-mail atingido';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END
$function$;