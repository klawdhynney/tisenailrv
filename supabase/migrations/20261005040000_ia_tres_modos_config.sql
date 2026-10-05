-- Migração 20261005040000: Configurações dedicadas da IA em 3 abas separadas
-- 1. Aba A: "Sugerir resposta no atendimento" (mantém configs atuais de resposta)
-- 2. Aba B: "Aprimorar texto" (revisor de suporte de TI em pt-BR)
-- 3. Aba C: "Sugerir texto ao abrir chamado" (modelo leve, max 100 tokens, 1 a 2 frases)

DO $$
DECLARE
  v_prompt_resposta TEXT := 'Você é o técnico de suporte de TI da Central de Chamados do SENAI LRV. Trate o chamado como uma pergunta ou pedido do solicitante e responda diretamente a ele, em primeira pessoa, como se já tivesse atendido: diga o que foi verificado, o que foi constatado e o que foi feito. Use os CHAMADOS RESOLVIDOS SEMELHANTES como referência de como a equipe costuma resolver; adapte ao chamado atual e não copie dados de outros chamados (nomes, locais, números). Linguagem simples, formal e cordial, até 3 frases (50 palavras), sem termos técnicos, sem markdown, sem dizer que está sugerindo, sem explicações. Exemplos: ''Solicito um mouse novo'' -> ''Verifiquei o mouse anterior, constatei o defeito e realizei a substituição por um novo.'' / ''Computador não liga'' -> ''Fui até o local e verifiquei que a tomada estava desconectada; reconectei e o computador ligou normalmente.'' Sem referência semelhante, responda com a solução mais comum para esse tipo de problema. Se faltar informação essencial, faça uma única pergunta simples. Não invente nomes, números ou prazos. Nunca peça senha.';

  v_prompt_aprimorar TEXT := 'Você é revisor de textos de suporte de TI em português do Brasil. Reescreva o texto recebido: corrija ortografia, acentuação, concordância e pontuação, e expanda abreviações e gírias (q, pq, vc); complete frases inacabadas usando o contexto do chamado; reorganize para ficar claro, simples, formal e cordial. Mantenha sentido, fatos, números e nomes; não invente informações. Havendo qualquer erro ou margem de melhora, devolva uma versão melhorada e diferente da original; só devolva igual se estiver perfeito. Devolva somente o texto final, sem comentários, aspas ou markdown.';

  v_prompt_abertura TEXT := 'Você ajuda o solicitante a descrever um problema de TI ao abrir um chamado. Com base nas opções escolhidas (setor, local, tipo de problema e demais campos), escreva a descrição em 1 a 2 frases simples e claras, em português do Brasil. Exemplo: setor Secretaria + local Recepção + problema Impressora -> ''Informo que a impressora da recepção, setor Secretaria, está com problemas.'' Use somente as informações das opções; não invente sintomas, números ou prazos. Se já houver texto digitado, complemente-o em vez de substituí-lo. Devolva só o texto.';

  v_regras JSONB;
  v_ia JSONB;
BEGIN
  SELECT regras INTO v_regras FROM public.configuracoes WHERE id = 1;
  IF v_regras IS NULL THEN
    v_regras := '{}'::jsonb;
  END IF;

  v_ia := COALESCE(v_regras->'iaSuporte', '{}'::jsonb);

  -- Atualiza com estrutura em 3 abas preservando personalizações prévias
  v_ia := jsonb_build_object(
    'respostaAtendimento', jsonb_build_object(
      'ativo', COALESCE((v_ia->'respostaAtendimento'->>'ativo')::boolean, true),
      'prompt', COALESCE(v_ia->'respostaAtendimento'->>'prompt', v_ia->>'promptSistema', v_prompt_resposta),
      'maxTokens', COALESCE((v_ia->'respostaAtendimento'->>'maxTokens')::int, (v_ia->>'maxTokensResposta')::int, 150),
      'temperatura', COALESCE((v_ia->'respostaAtendimento'->>'temperatura')::numeric, (v_ia->>'temperatura')::numeric, 0.2),
      'usarChamadosResolvidos', COALESCE((v_ia->'respostaAtendimento'->>'usarChamadosResolvidos')::boolean, (v_ia->>'usarChamadosResolvidos')::boolean, true),
      'maxExemplosResolvidos', COALESCE((v_ia->'respostaAtendimento'->>'maxExemplosResolvidos')::int, (v_ia->>'maxExemplosResolvidos')::int, 5)
    ),
    'aprimorarTexto', jsonb_build_object(
      'ativo', COALESCE((v_ia->'aprimorarTexto'->>'ativo')::boolean, true),
      'prompt', COALESCE(v_ia->'aprimorarTexto'->>'prompt', v_prompt_aprimorar),
      'maxTokens', COALESCE((v_ia->'aprimorarTexto'->>'maxTokens')::int, (v_ia->>'maxTokensAprimoramento')::int, 150),
      'temperatura', COALESCE((v_ia->'aprimorarTexto'->>'temperatura')::numeric, 0.2)
    ),
    'sugerirAbertura', jsonb_build_object(
      'ativo', COALESCE((v_ia->'sugerirAbertura'->>'ativo')::boolean, true),
      'prompt', COALESCE(v_ia->'sugerirAbertura'->>'prompt', v_prompt_abertura),
      'maxTokens', COALESCE((v_ia->'sugerirAbertura'->>'maxTokens')::int, 100),
      'temperatura', COALESCE((v_ia->'sugerirAbertura'->>'temperatura')::numeric, 0.2)
    ),
    'promptSistema', COALESCE(v_ia->>'promptSistema', v_prompt_resposta),
    'maxTokensResposta', COALESCE((v_ia->>'maxTokensResposta')::int, 150),
    'maxTokensAprimoramento', COALESCE((v_ia->>'maxTokensAprimoramento')::int, 150),
    'temperatura', COALESCE((v_ia->>'temperatura')::numeric, 0.2),
    'usarChamadosResolvidos', COALESCE((v_ia->>'usarChamadosResolvidos')::boolean, true),
    'maxExemplosResolvidos', COALESCE((v_ia->>'maxExemplosResolvidos')::int, 5)
  );

  UPDATE public.configuracoes
  SET regras = jsonb_set(v_regras, '{iaSuporte}', v_ia, true),
      updated_at = now()
  WHERE id = 1;
END $$;
