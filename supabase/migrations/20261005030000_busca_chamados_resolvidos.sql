-- Migração 20261005030000: Busca de chamados resolvidos semelhantes para IA de suporte
-- Cria índice GIN para busca textual em português
-- Cria função segura buscar_chamados_resolvidos_semelhantes (sem expor dados pessoais)
-- Atualiza configurações da IA no banco com o novo prompt oficial e parâmetros

-- 1. Índice GIN para busca full-text rápida em português
CREATE INDEX IF NOT EXISTS idx_tickets_busca_resolvidos
  ON public.tickets
  USING gin (to_tsvector('portuguese', coalesce(categoria, '') || ' ' || coalesce(descricao, '')));

-- 2. Função RPC segura com busca priorizando categoria e relevância textual
CREATE OR REPLACE FUNCTION public.buscar_chamados_resolvidos_semelhantes(
  p_termo text,
  p_categoria text DEFAULT NULL,
  p_ticket_id_atual integer DEFAULT NULL,
  p_limite integer DEFAULT 5
)
RETURNS TABLE (
  id integer,
  categoria text,
  titulo text,
  problema text,
  solucao text,
  relevancia real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_query tsquery;
  v_limite integer;
  v_termo_limpo text;
BEGIN
  v_limite := LEAST(GREATEST(COALESCE(p_limite, 5), 1), 5);
  v_termo_limpo := TRIM(COALESCE(p_termo, ''));

  IF v_termo_limpo <> '' THEN
    BEGIN
      v_query := plainto_tsquery('portuguese', v_termo_limpo);
    EXCEPTION WHEN OTHERS THEN
      v_query := NULL;
    END;
  ELSE
    v_query := NULL;
  END IF;

  RETURN QUERY
  WITH candidatos AS (
    SELECT 
      t.id,
      COALESCE(t.categoria, 'Suporte de TI') AS categoria,
      COALESCE(t.categoria || ' #' || t.id::text, 'Chamado #' || t.id::text) AS titulo,
      SUBSTRING(REGEXP_REPLACE(t.descricao, '\s+', ' ', 'g') FROM 1 FOR 300) AS problema,
      SUBSTRING(
        REGEXP_REPLACE(
          COALESCE(
            (
              SELECT tm.mensagem
              FROM public.ticket_mensagens tm
              WHERE tm.ticket_id = t.id 
                AND tm.autor_tipo IN ('equipe', 'sistema')
                AND tm.mensagem IS NOT NULL
                AND TRIM(tm.mensagem) <> ''
              ORDER BY tm.criado_em DESC
              LIMIT 1
            ),
            NULLIF(TRIM(t.procedimento), ''),
            'Atendimento realizado e chamado resolvido.'
          ),
          '\s+', ' ', 'g'
        ) FROM 1 FOR 300
      ) AS solucao,
      CASE 
        WHEN p_categoria IS NOT NULL AND LOWER(t.categoria) = LOWER(p_categoria) THEN 2.0 
        ELSE 0.0 
      END AS bonus_categoria,
      CASE
        WHEN v_query IS NOT NULL THEN
          ts_rank(to_tsvector('portuguese', coalesce(t.categoria, '') || ' ' || coalesce(t.descricao, '')), v_query)
        ELSE 0.0
      END AS rank_busca
    FROM public.tickets t
    WHERE LOWER(t.status) IN ('resolvido', 'concluido', 'concluído')
      AND (p_ticket_id_atual IS NULL OR t.id <> p_ticket_id_atual)
      AND (
        v_query IS NULL 
        OR to_tsvector('portuguese', coalesce(t.categoria, '') || ' ' || coalesce(t.descricao, '')) @@ v_query
        OR (p_categoria IS NOT NULL AND LOWER(t.categoria) = LOWER(p_categoria))
      )
      AND (
        (t.procedimento IS NOT NULL AND TRIM(t.procedimento) <> '')
        OR EXISTS (
          SELECT 1 FROM public.ticket_mensagens tm 
          WHERE tm.ticket_id = t.id 
            AND tm.autor_tipo IN ('equipe', 'sistema')
            AND tm.mensagem IS NOT NULL 
            AND TRIM(tm.mensagem) <> ''
        )
      )
  )
  SELECT 
    c.id,
    c.categoria,
    c.titulo,
    c.problema,
    c.solucao,
    (c.bonus_categoria + c.rank_busca)::real AS relevancia
  FROM candidatos c
  ORDER BY 
    (c.bonus_categoria + c.rank_busca) DESC,
    c.id DESC
  LIMIT v_limite;
END;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_chamados_resolvidos_semelhantes(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_chamados_resolvidos_semelhantes(text, text, integer, integer) TO service_role;

-- 3. Atualiza o prompt padrão e novas propriedades salvas na tabela configuracoes se for o legado
UPDATE public.configuracoes
SET regras = jsonb_set(
  jsonb_set(
    jsonb_set(
      regras,
      '{iaSuporte,promptSistema}',
      to_jsonb('Você é o técnico de suporte de TI da Central de Chamados do SENAI LRV. Trate o chamado como uma pergunta ou pedido do solicitante e responda diretamente a ele, em primeira pessoa, como se já tivesse atendido: diga o que foi verificado, o que foi constatado e o que foi feito. Use os CHAMADOS RESOLVIDOS SEMELHANTES como referência de como a equipe costuma resolver; adapte ao chamado atual e não copie dados de outros chamados (nomes, locais, números). Linguagem simples, formal e cordial, até 3 frases (50 palavras), sem termos técnicos, sem markdown, sem dizer que está sugerindo, sem explicações. Exemplos: ''Solicito um mouse novo'' -> ''Verifiquei o mouse anterior, constatei o defeito e realizei a substituição por um novo.'' / ''Computador não liga'' -> ''Fui até o local e verifiquei que a tomada estava desconectada; reconectei e o computador ligou normalmente.'' Sem referência semelhante, responda com a solução mais comum para esse tipo de problema. Se faltar informação essencial, faça uma única pergunta simples. Não invente nomes, números ou prazos. Nunca peça senha. MODO APRIMORAR TEXTO: use o contexto do chamado; corrija ortografia, acentuação, concordância e pontuação em português do Brasil; complete frases inacabadas com base no contexto; reescreva de forma mais clara, simples e cordial, mantendo o sentido e os fatos; devolva somente o texto final.'::text)
    ),
    '{iaSuporte,usarChamadosResolvidos}',
    'true'::jsonb
  ),
  '{iaSuporte,maxExemplosResolvidos}',
  '5'::jsonb
)
WHERE id = 1
  AND (
    regras->'iaSuporte'->>'promptSistema' IS NULL
    OR regras->'iaSuporte'->>'promptSistema' NOT LIKE '%CHAMADOS RESOLVIDOS SEMELHANTES%'
  );
