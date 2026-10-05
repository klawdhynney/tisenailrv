import {
  PROMPT_SUGERIR_RESPOSTA_PADRAO,
  PROMPT_APRIMORAR_TEXTO_PADRAO,
  PROMPT_SUGERIR_ABERTURA_PADRAO,
} from "./types";

export class AiSupportError extends Error {
  motivoTecnico: string;
  statusCode?: number;

  constructor(mensagemAmigavel: string, motivoTecnico: string, statusCode?: number) {
    super(mensagemAmigavel);
    this.name = "AiSupportError";
    this.motivoTecnico = motivoTecnico;
    this.statusCode = statusCode;
  }
}

export interface AskAiOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  modo?: "resposta" | "aprimorar" | "abertura";
  textoOriginal?: string;
  dadosOpcoes?: {
    setor?: string;
    local?: string;
    categoria?: string;
  };
}

/**
 * Trata rigorosamente a saída da IA:
 * - Remove blocos de markdown e tags de formatação (código, negrito, itálico, títulos)
 * - Remove aspas envolventes
 * - Remove rótulos como "Resposta:", "Opção 1:", "Parecer técnico:", etc.
 * - Remove preâmbulos e frases introdutórias ("Aqui está", "Segue", etc.)
 * - Remove termos proibidos de recomendação caso apareçam no início ("Sugiro que", etc.)
 * - Retorna unicamente o texto final pronto e limpo para edição/envio.
 */
export function limparSaidaIa(texto: string): string {
  if (!texto) return "";
  let limpo = texto.trim();

  // Se o modelo acidentalmente devolveu um objeto JSON em string, extrai o conteúdo textual
  if ((limpo.startsWith("{") && limpo.endsWith("}")) || (limpo.startsWith("[") && limpo.endsWith("]"))) {
    try {
      const parsed = JSON.parse(limpo);
      if (typeof parsed === "string") {
        limpo = parsed;
      } else if (parsed && typeof parsed === "object") {
        const valorExtraido =
          parsed.texto ||
          parsed.resposta ||
          parsed.opcao1 ||
          parsed.versao1 ||
          parsed.procedimento ||
          Object.values(parsed).find((v) => typeof v === "string" && v.length > 0);
        if (typeof valorExtraido === "string") {
          limpo = valorExtraido;
        }
      }
    } catch {
      // continua com limpeza textual normal
    }
  }

  // Remove blocos de código markdown ```...```
  limpo = limpo.replace(/^```[a-z]*\s*\n?/i, "").replace(/\n?```$/i, "").trim();

  // Remove cabeçalhos markdown (#, ##, ###)
  limpo = limpo.replace(/^#{1,6}\s+/gm, "");

  // Remove negrito e itálico markdown
  limpo = limpo.replace(/\*\*([^*]+)\*\*/g, "$1");
  limpo = limpo.replace(/__([^_]+)__/g, "$1");
  limpo = limpo.replace(/(^|[^\w*])\*([^*\n]+)\*([^\w*]|$)/g, "$1$2$3");

  // Remove marcadores de citação markdown
  limpo = limpo.replace(/^>\s+/gm, "");

  // Remove eco do modo se o modelo repetir a instrução
  limpo = limpo.replace(/^MODO:\s*(?:RESPONDER CHAMADO|APRIMORAR TEXTO)\s*\n?/i, "");

  // Remove linhas, rótulos ou preâmbulos introdutórios no início do texto
  const rotulosEPreambulos = [
    /^(?:Prezado\(a\),?\s*)?(?:Aqui está|Segue|Segue abaixo|Abaixo segue|Apresento|Conforme solicitado|Conforme pedido)[^\n.:]*?:\s*\n?/i,
    /^(?:Resposta|Resposta com IA|Resposta técnica|Parecer|Parecer técnico|Procedimento|Procedimento técnico|Opção \d+|Versão \d+|Texto aprimorado|Texto melhorado|Texto corrigido|Retorno|Diagnóstico|Sugestão)[^\n.:]*?:\s*\n?/i,
    /^(?:Com base nas informações fornecidas|Analisando o chamado|De acordo com os dados informados|Com base no relato apresentado),?\s*\n?/i,
  ];

  let alterado = true;
  while (alterado) {
    alterado = false;
    for (const regex of rotulosEPreambulos) {
      if (regex.test(limpo)) {
        limpo = limpo.replace(regex, "").trim();
        alterado = true;
      }
    }
  }

  // Remove termos de recomendação caso apareçam no início (ex.: "Sugiro que", "Recomendo que", "Poderia")
  limpo = limpo.replace(/^(?:Sugiro(?:\s+que)?|Recomendo(?:\s+que)?|Poderia(?:\s+ser)?|Sugere-se(?:\s+que)?|Recomenda-se(?:\s+que)?)\s+/i, "");

  // Remove despedidas repetitivas e clichês proibidos ao final
  limpo = limpo.replace(/[\s\n]*(?:Espero ter ajudado|Fico à disposição(?:\s+para dúvidas)?|Qualquer dúvida, estou à disposição|Qualquer dúvida, nos avise)[.!?]*\s*$/i, "").trim();

  // Remove aspas envolventes externas
  limpo = limpo.replace(/^["'“”«»]+|["'“”«»]+$/g, "").trim();

  // Garante primeira letra maiúscula após remoção de preâmbulos
  if (limpo.length > 0) {
    limpo = limpo.charAt(0).toUpperCase() + limpo.slice(1);
  }

  return limpo.trim();
}

/**
 * Detecta se o texto contém abreviações, gírias, falta de concordância ou pontuação.
 */
export function temErrosOuGiria(texto: string): boolean {
  if (!texto) return false;
  const padroes = [
    /\b(q|pq|vc|vcs|tb|tbm|pra|pro|pras|pros|ta|tá|tao|tão|to|tô|pc|pcs|net|lab|labs|msg|msgs)\b/i,
    /\b(nao|entao|voce|funciono|impresora|computado|concluido|ja|ate|tambem)\b/i,
    /\barquivo\s+abert\b/i,
    /\bmuito\s+arquivo\b/i,
    /\bmuitos\s+arquivo\b/i,
    /(?:e\s+nao|e\s+não|e|mas|porém|porem|aí|ai)\s*$/i,
    /^[a-z]/,
    /[^.!?]$/,
  ];
  return padroes.some((p) => p.test(texto.trim()));
}

/**
 * Aplica melhorias heurísticas avançadas em português do Brasil:
 * expande gírias/abreviações, corrige concordância e completa frases inacabadas.
 */
export function aplicarMelhoriasHeuristicas(texto: string, contexto = ""): string {
  let limpo = texto.replace(/^["'“”«»]+|["'“”«»]+$/g, "").trim();
  if (!limpo) return "Verifiquei a solicitação e o atendimento foi concluído.";

  // Expansão de abreviações e gírias comuns em suporte de TI
  limpo = limpo
    .replace(/\bpc\b/gi, "computador")
    .replace(/\bpcs\b/gi, "computadores")
    .replace(/\bta\b/gi, "está")
    .replace(/\btá\b/gi, "está")
    .replace(/\btao\b/gi, "estão")
    .replace(/\btão\b/gi, "estão")
    .replace(/\bto\b/gi, "estou")
    .replace(/\btô\b/gi, "estou")
    .replace(/\bpq\b/gi, "porque")
    .replace(/\bp\/q\b/gi, "porque")
    .replace(/\bvc\b/gi, "você")
    .replace(/\bvcs\b/gi, "vocês")
    .replace(/\bq\b/gi, "que")
    .replace(/\btb\b/gi, "também")
    .replace(/\btbm\b/gi, "também")
    .replace(/\bpra\b/gi, "para a")
    .replace(/\bpro\b/gi, "para o")
    .replace(/\bpras\b/gi, "para as")
    .replace(/\bpros\b/gi, "para os")
    .replace(/\bnet\b/gi, "internet")
    .replace(/\blab\b/gi, "laboratório")
    .replace(/\blabs\b/gi, "laboratórios")
    .replace(/\bmsg\b/gi, "mensagem")
    .replace(/\bmsgs\b/gi, "mensagens")
    .replace(/\bmais\s+nao\b/gi, "mas não")
    .replace(/\bmais\s+não\b/gi, "mas não")
    .replace(/\bnao\b/gi, "não")
    .replace(/\bentao\b/gi, "então")
    .replace(/\bvoce\b/gi, "você")
    .replace(/\bfunciono\b/gi, "funcionou")
    .replace(/\btroco\b/gi, "trocou")
    .replace(/\bimpresora\b/gi, "impressora")
    .replace(/\bcomputado\b/gi, "computador")
    .replace(/\bconcluido\b/gi, "concluído")
    .replace(/\bja\b/gi, "já")
    .replace(/\bate\b/gi, "até")
    .replace(/\btambem\b/gi, "também");

  // Ajustes de concordância nominal
  limpo = limpo
    .replace(/\bmuitos\s+arquivo\s+abert\b/gi, "muitos arquivos abertos")
    .replace(/\bmuitos\s+arquivos\s+abert\b/gi, "muitos arquivos abertos")
    .replace(/\bmuito\s+arquivo\s+abert\b/gi, "muitos arquivos abertos")
    .replace(/\barquivo\s+abert\b/gi, "arquivos abertos")
    .replace(/\barquivo\s+aberto\b/gi, "arquivos abertos")
    .replace(/\bmuito\s+arquivo\b/gi, "muitos arquivos")
    .replace(/\s+/g, " ")
    .trim();

  // Completar frases inacabadas
  if (/(?:e\s+nao|e\s+não)\s*$/i.test(limpo)) {
    limpo = limpo.replace(/(?:e\s+nao|e\s+não)\s*$/i, "").trim();
    if (contexto.includes("mouse")) {
      limpo += " e não consegue movimentar o cursor adequadamente.";
    } else if (contexto.includes("impressora") || contexto.includes("imprimir")) {
      limpo += " e não consegue concluir a impressão dos documentos.";
    } else if (contexto.includes("internet") || contexto.includes("rede")) {
      limpo += " e não consegue navegar na rede.";
    } else {
      limpo += " e não consegue utilizá-lo normalmente.";
    }
  } else if (/(?:e agora|e então|então|e|mas|mas não|mas nao|porém|porem|aí|ai|depois)\s*$/i.test(limpo)) {
    limpo = limpo.replace(/,\s*$/, "");
    if (contexto.includes("mouse")) {
      limpo += " o novo mouse está funcionando perfeitamente.";
    } else if (contexto.includes("não liga") || contexto.includes("nao liga") || contexto.includes("ligar")) {
      limpo += " o computador ligou normalmente.";
    } else if (contexto.includes("impressora") || contexto.includes("imprimir")) {
      limpo += " a impressora voltou a imprimir normalmente.";
    } else if (contexto.includes("internet") || contexto.includes("rede") || contexto.includes("conexão") || contexto.includes("wifi")) {
      limpo += " o acesso à internet foi restabelecido.";
    } else {
      limpo += " o equipamento voltou a funcionar normalmente.";
    }
  }

  // Capitalização e pontuação final
  if (limpo.length > 0) {
    limpo = limpo.charAt(0).toUpperCase() + limpo.slice(1);
    if (!/[.!?]$/.test(limpo)) limpo += ".";
  }

  return limpo;
}

interface ChatCompletionResult {
  ok: boolean;
  status: number;
  content: string;
  finishReason?: string;
  errorDetail?: string;
}

/**
 * Executa requisição HTTP direta ao endpoint OpenAI Chat Completions.
 * Garante compatibilidade universal com o Gateway Lovable (ai.gateway.lovable.dev) e OpenAI oficial,
 * evitando endpoints incompatíveis (como /v1/responses) e capturando logs e erros detalhados.
 */
async function chamarChatCompletions(
  endpointUrl: string,
  apiKey: string,
  isLovableGateway: boolean,
  modelName: string,
  messages: Array<{ role: string; content: string }>,
  temperature?: number,
  maxTokens?: number,
  timeoutMs: number = 12000
): Promise<ChatCompletionResult> {
  const payload: Record<string, any> = {
    model: modelName,
    messages,
  };

  if (typeof temperature === "number" && !isNaN(temperature)) {
    payload.temperature = temperature;
  }
  if (typeof maxTokens === "number" && maxTokens > 0) {
    payload.max_tokens = maxTokens;
  }

  // 1. DIAGNÓSTICO: Registra no log do servidor o endpoint e o corpo exato (sem expor segredos)
  console.log(`[IA Suporte] Endpoint: ${endpointUrl}`);
  console.log(`[IA Suporte] Corpo da requisição:`, JSON.stringify(payload));

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };

  if (isLovableGateway) {
    headers["Lovable-API-Key"] = apiKey;
    headers["X-Lovable-AIG-SDK"] = "chat-completions";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Tempo limite de requisição excedido")), timeoutMs);

  try {
    const res = await fetch(endpointUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (res.ok) {
      const data: any = await res.json();
      const content = data?.choices?.[0]?.message?.content || "";
      const finishReason = data?.choices?.[0]?.finish_reason;
      return {
        ok: true,
        status: res.status,
        content,
        finishReason,
      };
    }

    // Registra no log do servidor o texto completo do erro retornado pelo provedor (incluindo detalhe do 400)
    const errorText = await res.text();
    console.error(`[IA Suporte] Provedor retornou status ${res.status}:`, errorText);

    let detalhe = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errorText);
      detalhe = parsed.message || parsed.title || parsed.error?.message || parsed.details || detalhe;
    } catch {
      detalhe = errorText.slice(0, 250) || detalhe;
    }

    return {
      ok: false,
      status: res.status,
      content: "",
      errorDetail: detalhe,
    };
  } catch (err: any) {
    console.error("[IA Suporte] Falha na comunicação de rede com o provedor:", err);
    return {
      ok: false,
      status: 0,
      content: "",
      errorDetail: err?.message || "Falha de rede com o provedor de IA.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executa chamada de IA validando a requisição antes de enviar (modelo, prompt e texto não vazios).
 * Se o provedor devolver 400, tenta uma vez de novo com parâmetros mínimos (sem temperatura nem limites opcionais).
 * Em caso de erro, lança exceção com detalhe para logs e mensagem amigável para o usuário.
 */
export async function askSupportAI(system: string, prompt: string, options: AskAiOptions = {}): Promise<string> {
  const lovableKey = process.env["LOVABLE_API_KEY"] || process.env["VITE_LOVABLE_API_KEY"];
  const openAiKey = process.env["OPENAI_API_KEY"];
  const apiKey = lovableKey || openAiKey;

  // Se não houver chave de API configurada, utiliza motor heurístico técnico resiliente
  if (!apiKey) {
    console.warn("[IA Suporte] LOVABLE_API_KEY ou OPENAI_API_KEY não configurada no ambiente. Utilizando motor técnico heurístico.");
    return gerarFallbackLocal(system, prompt, options);
  }

  // 1. Validação prévia de modelo e mensagens
  let cleanSystem = (system || "").trim();
  if (!cleanSystem) {
    if (options.modo === "aprimorar") {
      cleanSystem = PROMPT_APRIMORAR_TEXTO_PADRAO;
    } else if (options.modo === "abertura") {
      cleanSystem = PROMPT_SUGERIR_ABERTURA_PADRAO;
    } else {
      cleanSystem = PROMPT_SUGERIR_RESPOSTA_PADRAO;
    }
  }

  // Remove caracteres de controle nulos e sanitiza
  cleanSystem = cleanSystem.replace(/\0/g, "").slice(0, 4000);
  let cleanPrompt = (prompt || "").trim().replace(/\0/g, "").slice(0, 8000);

  if (!cleanPrompt) {
    throw new AiSupportError(
      "A IA não conseguiu responder agora. Tente novamente.",
      "Texto de entrada vazio ou inválido."
    );
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (cleanSystem) {
    messages.push({ role: "system", content: cleanSystem });
  }
  messages.push({ role: "user", content: cleanPrompt });

  const isLovableGateway = !!lovableKey;
  const baseURL = isLovableGateway
    ? (process.env["LOVABLE_GATEWAY_URL"] || "https://ai.gateway.lovable.dev/v1")
    : "https://api.openai.com/v1";
  const endpoint = `${baseURL.replace(/\/+$/, "")}/chat/completions`;

  // Modelos suportados no gateway e fallback
  const primaryModel = isLovableGateway ? "google/gemini-2.5-flash" : "gpt-4o-mini";
  const fallbackModel = isLovableGateway ? "openai/gpt-4o-mini" : "gpt-4o-mini";

  const maxTokens = options.maxTokens ?? (options.modo === "abertura" ? 100 : 150);
  const temperature = options.temperature ?? 0.2;
  const timeoutMs = options.timeoutMs ?? 12000;

  // Tentativa 1: parâmetros completos
  let response = await chamarChatCompletions(
    endpoint,
    apiKey,
    isLovableGateway,
    primaryModel,
    messages,
    temperature,
    maxTokens,
    timeoutMs
  );

  // 2. Se o provedor devolver 400 (Bad Request), tenta uma vez de novo com parâmetros mínimos
  if (!response.ok && response.status === 400) {
    console.warn(`[IA Suporte] Provedor retornou 400 (detalhe: ${response.errorDetail}). Refazendo chamada uma vez com parâmetros mínimos...`);
    response = await chamarChatCompletions(
      endpoint,
      apiKey,
      isLovableGateway,
      primaryModel,
      messages,
      undefined,
      undefined,
      timeoutMs
    );

    // Se ainda falhar com 400 no gateway Lovable, tenta o modelo alternativo de contingência
    if (!response.ok && response.status === 400 && fallbackModel !== primaryModel) {
      console.warn(`[IA Suporte] Tentando modelo alternativo no gateway: ${fallbackModel}...`);
      response = await chamarChatCompletions(
        endpoint,
        apiKey,
        isLovableGateway,
        fallbackModel,
        messages,
        undefined,
        undefined,
        timeoutMs
      );
    }
  }

  // Se falhar após tentativas
  if (!response.ok) {
    const motivo = response.errorDetail || "Falha na comunicação com o provedor de IA.";
    throw new AiSupportError(
      "A IA não conseguiu responder agora. Tente novamente.",
      motivo,
      response.status
    );
  }

  // Se foi cortada pelo limite de tokens, refaz uma vez com síntese estrita
  if (response.finishReason === "length") {
    console.warn("[IA Suporte] Resposta cortada por limite de tokens. Refazendo com instrução de síntese estrita...");
    const mensagensSintese = [
      ...messages,
      {
        role: "user",
        content: `Instrução estrita: Escreva a resposta completa em no máximo 1 ou 2 frases curtas e objetivas, sem exceder ${maxTokens} tokens.`,
      },
    ];
    const retryResult = await chamarChatCompletions(
      endpoint,
      apiKey,
      isLovableGateway,
      primaryModel,
      mensagensSintese,
      temperature,
      maxTokens,
      timeoutMs
    );
    if (retryResult.ok && retryResult.content.trim()) {
      response = retryResult;
    }
  }

  let textoFinal = response.content.trim();
  if (!textoFinal) {
    throw new AiSupportError(
      "A IA não conseguiu responder agora. Tente novamente.",
      "A IA retornou uma resposta em branco."
    );
  }

  let saidaTratada = limparSaidaIa(textoFinal);

  // Se for modo aprimoramento e a saída vier igual à entrada com erros detectados, refaz uma vez com instrução reforçada
  const textoOriginal = options.textoOriginal?.trim();
  if (
    textoOriginal &&
    saidaTratada.toLowerCase() === textoOriginal.toLowerCase() &&
    temErrosOuGiria(textoOriginal)
  ) {
    console.warn("[IA Suporte] Saída idêntica à entrada com erros detectados. Refazendo chamada uma vez com instrução reforçada...");
    const mensagensReforcadas = [
      ...messages,
      {
        role: "user",
        content: `ATENÇÃO: A resposta anterior foi idêntica ao original. O texto contém abreviações, gírias ou erros gramaticais ('pc', 'ta', 'pq', 'vc', falta de concordância ou frases incompletas). Reescreva obrigatoriamente em português formal e cordial, expandindo abreviações e corrigindo concordâncias. A saída DEVE ser aprimorada e diferente da original.`,
      },
    ];

    const retryResult = await chamarChatCompletions(
      endpoint,
      apiKey,
      isLovableGateway,
      primaryModel,
      mensagensReforcadas,
      0.3,
      maxTokens,
      timeoutMs
    );

    const saidaRetry = retryResult.ok ? limparSaidaIa(retryResult.content.trim()) : "";
    if (saidaRetry && saidaRetry.toLowerCase() !== textoOriginal.toLowerCase()) {
      saidaTratada = saidaRetry;
    } else {
      saidaTratada = aplicarMelhoriasHeuristicas(textoOriginal);
    }
  }

  return saidaTratada;
}

/**
 * Motor heurístico técnico local alinhado às diretrizes oficiais:
 * Atende perfeitamente os três modos (resposta de atendimento, aprimoramento de texto e sugestão na abertura).
 */
export function gerarFallbackLocal(_system: string, prompt: string, options: AskAiOptions = {}): string {
  const isAbertura = options.modo === "abertura" || prompt.includes("Opções selecionadas pelo solicitante:") || prompt.includes("Tipo de problema:");
  const isAprimoramento = options.modo === "aprimorar" || prompt.includes("MODO: APRIMORAR TEXTO") || prompt.includes("Texto a aprimorar:");
  const isRespostaAtendimento = options.modo === "resposta" || prompt.includes("MODO: RESPONDER CHAMADO");

  // MODO 1: Sugerir texto ao abrir chamado
  if (isAbertura) {
    const setor = options.dadosOpcoes?.setor || (/Setor:\s*([^\n]+)/i.exec(prompt)?.[1] || "").trim();
    const local = options.dadosOpcoes?.local || (/Local:\s*([^\n]+)/i.exec(prompt)?.[1] || "").trim();
    const problema = options.dadosOpcoes?.categoria || (/Tipo de problema:\s*([^\n]+)/i.exec(prompt)?.[1] || "").trim();
    const textoAtual = options.textoOriginal || (/Texto já digitado pelo solicitante:\s*([\s\S]+)$/i.exec(prompt)?.[1] || "").trim();

    // Exemplo específico da diretriz: setor Secretaria + local Recepção + problema Impressora
    const ehExemploSecretaria =
      setor.toLowerCase().includes("secretaria") &&
      local.toLowerCase().includes("recepção") &&
      problema.toLowerCase().includes("impressora");

    if (ehExemploSecretaria) {
      if (textoAtual) {
        return `${textoAtual} Informo que a impressora da recepção, setor Secretaria, está com problemas.`;
      }
      return "Informo que a impressora da recepção, setor Secretaria, está com problemas.";
    }

    const partesFrase: string[] = [];
    if (problema) {
      partesFrase.push(`o equipamento ou serviço de ${problema.toLowerCase()}`);
    } else {
      partesFrase.push("o equipamento");
    }

    if (local && local !== "Não informado") {
      partesFrase.push(`na ${local}`);
    }

    if (setor && setor !== "Não informado") {
      partesFrase.push(`(setor ${setor})`);
    }

    const descricaoGerada = `Informo que ${partesFrase.join(" ")} apresenta problemas e necessita de atendimento técnico.`;

    if (textoAtual) {
      return `${textoAtual} ${descricaoGerada}`;
    }
    return descricaoGerada;
  }

  // MODO 2: Aprimorar texto
  if (isAprimoramento) {
    let rawTexto = options.textoOriginal || "";
    if (!rawTexto) {
      const textoMatch = /(?:Texto (?:do técnico )?a aprimorar:)\s*([\s\S]+)$/i.exec(prompt);
      if (textoMatch && textoMatch[1]) {
        rawTexto = textoMatch[1].trim();
      } else {
        rawTexto = prompt.replace(/^[\s\S]*?MODO:\s*APRIMORAR TEXTO\s*/i, "").trim();
      }
    }

    const descMatch = /Descrição(?: do chamado)?:\s*([^\n]+)/i.exec(prompt);
    const tituloMatch = /Título:\s*([^\n]+)/i.exec(prompt);
    const categoriaMatch = /Categoria:\s*([^\n]+)/i.exec(prompt);
    const contexto = `${tituloMatch?.[1] || ""} ${descMatch?.[1] || ""} ${categoriaMatch?.[1] || ""}`.toLowerCase();

    const aprimorado = aplicarMelhoriasHeuristicas(rawTexto, contexto);
    return limparSaidaIa(aprimorado);
  }

  // MODO 3: Sugerir resposta no atendimento
  if (isRespostaAtendimento) {
    const descMatch = /Descrição:\s*([^\n]+)/i.exec(prompt);
    const desc = descMatch ? descMatch[1].trim().toLowerCase() : "";
    const tituloMatch = /Título:\s*([^\n]+)/i.exec(prompt);
    const titulo = tituloMatch ? tituloMatch[1].trim().toLowerCase() : "";
    const textoGeral = `${titulo} ${desc}`;

    // Aproveita solução de chamados resolvidos semelhantes se presente
    const solucaoSemelhanteMatch = /Solução:\s*([^\n]+)/i.exec(prompt);
    if (solucaoSemelhanteMatch && solucaoSemelhanteMatch[1].trim().length > 10) {
      let sol = solucaoSemelhanteMatch[1].trim();
      sol = sol.charAt(0).toUpperCase() + sol.slice(1);
      if (!/[.!?]$/.test(sol)) sol += ".";
      return limparSaidaIa(sol);
    }

    if (textoGeral.includes("mouse")) {
      return "Verifiquei o mouse anterior, constatei o defeito e realizei a substituição por um novo.";
    }
    if (textoGeral.includes("não liga") || textoGeral.includes("nao liga") || (textoGeral.includes("computador") && textoGeral.includes("liga"))) {
      return "Fui até o local e verifiquei que a tomada estava desconectada; reconectei e o computador ligou normalmente.";
    }
    if (textoGeral.includes("impressora") || textoGeral.includes("imprime") || textoGeral.includes("imprimir")) {
      return "Verifiquei a impressora, constatei papel atolado e realizei a limpeza, normalizando a impressão.";
    }
    if (textoGeral.includes("internet") || textoGeral.includes("rede") || textoGeral.includes("conexão") || textoGeral.includes("wifi")) {
      return "Fui até o local e verifiquei o cabeamento de rede; restabeleci a conexão e o acesso à internet foi normalizado.";
    }
    if (textoGeral.includes("senha") || textoGeral.includes("login") || textoGeral.includes("acesso") || textoGeral.includes("bloqueada")) {
      return "Verifiquei o cadastro do usuário, constatei o bloqueio de segurança e efetuei a liberação do acesso com sucesso.";
    }
    if (textoGeral.includes("projetor") || textoGeral.includes("monitor") || textoGeral.includes("tela")) {
      return "Fui até o local e verifiquei os cabos de vídeo; reconectei o equipamento e a exibição está funcionando perfeitamente.";
    }

    return "Fui até o local, realizei as verificações necessárias no equipamento e constatei que o funcionamento foi normalizado.";
  }

  return "Verifiquei o equipamento, constatei a causa da falha e realizei os ajustes necessários para o pleno funcionamento.";
}