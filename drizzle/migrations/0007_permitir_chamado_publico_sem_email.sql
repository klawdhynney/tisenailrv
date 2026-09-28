DROP POLICY IF EXISTS "Visitante abre chamado limitado" ON public.tickets;

CREATE POLICY "Qualquer pessoa abre chamado"
ON public.tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (
    (auth.uid() IS NULL AND criado_por IS NULL)
    OR
    (auth.uid() IS NOT NULL AND criado_por = auth.uid())
  )
  AND (solicitante_email IS NULL OR btrim(solicitante_email) = '')
  AND length(btrim(solicitante)) BETWEEN 2 AND 120
  AND length(btrim(setor)) BETWEEN 2 AND 120
  AND length(btrim(local)) BETWEEN 3 AND 240
  AND length(btrim(descricao)) BETWEEN 10 AND 3000
  AND categoria IS NOT NULL
  AND length(btrim(categoria)) BETWEEN 2 AND 120
  AND prioridade = 'Média'
  AND status = 'Aberto'
  AND responsavel IS NULL
  AND procedimento IS NULL
  AND fechado_em IS NULL
  AND horario IS NULL
  AND sla_reiniciado_em IS NULL
  AND aberto_em = CURRENT_DATE
  AND hora = to_char(now(), 'HH24:MI')
);