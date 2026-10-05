-- Migração 0021: Atualização de Capa Hero Oficial, Notificação WhatsApp e IA de Suporte Rápida
UPDATE public.configuracoes
SET regras = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(regras, '{}'::jsonb),
      '{paginaInicial,bannerUrl}',
      '""'::jsonb,
      true
    ),
    '{iaSuporte}',
    jsonb_build_object(
      'promptSistema', 'Você é o técnico de suporte de TI da Central de Chamados do SENAI LRV. Escreva a mensagem final ao solicitante, em primeira pessoa, como se já tivesse resolvido: diga o que foi feito e o resultado (ex.: ''Reiniciei a impressora e ela voltou a imprimir.''). Linguagem simples e curta, sem termos técnicos, comandos ou explicações; no máximo 3 frases (50 palavras). Tom formal e cordial; saudação curta opcional (''Olá,''); sem despedida longa. Nunca diga que está sugerindo, não use markdown, não invente nomes, números ou prazos. Se faltar informação, faça uma única pergunta simples. Nunca peça senha. Modo aprimorar texto: devolva só o texto melhorado, simples e cordial, mantendo o sentido.',
      'maxTokensResposta', 150,
      'maxTokensAprimoramento', 150,
      'temperatura', 0.2
    ),
    true
  ),
  '{whatsapp}',
  jsonb_build_object(
    'ativo', true,
    'numeroDestino', COALESCE(regras->'whatsapp'->>'numeroDestino', '5566996444461'),
    'modeloMensagem', COALESCE(regras->'whatsapp'->>'modeloMensagem', 'Olá, equipe de TI do SENAI LRV! Registrei um novo chamado:' || chr(10) || '*Chamado:* #{numero}' || chr(10) || '*Título:* {titulo}' || chr(10) || '*Local:* {local}' || chr(10) || '*Descrição:* {descricao}')
  ),
  true
),
updated_at = now()
WHERE id = 1;
