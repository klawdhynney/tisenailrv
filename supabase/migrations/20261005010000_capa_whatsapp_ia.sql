-- Migração 20261005010000: Atualização de Capa Hero Oficial, Notificação WhatsApp e IA de Suporte Rápida
-- 1. Limpa bannerUrl legado da tabela configuracoes (id: 1) para exibir a nova capa oficial sem cache antigo
-- 2. Atualiza iaSuporte para o prompt em 1ª pessoa simples e cordial, com limite de 150 tokens e temperatura 0.2
-- 3. Configura valores padrão de whatsapp com número de suporte com DDI e modelo de mensagem formatada

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
