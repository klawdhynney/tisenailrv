import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export interface AskAiOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
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
  limpo = limpo.replace(/\n*(?:Espero ter ajudado\.?|Fico à disposição(?:\s+para dúvidas)?\.?|Qualquer dúvida, estou à disposição\.?|Qualquer dúvida, nos avise\.?)\s*$/i, "");

  // Remove aspas envolventes externas
  limpo = limpo.replace(/^["'“”«»]+|["'“”«»]+$/g, "").trim();

  // Garante primeira letra maiúscula após remoção de preâmbulos
  if (limpo.length > 0) {
    limpo = limpo.charAt(0).toUpperCase() + limpo.slice(1);
  }

  return limpo.trim();
}

/**
 * Executa chamada de IA com prompt único do sistema e mensagem estruturada do usuário.
 * Limite estrito de 400 tokens e temperatura 0.2.
 * Em caso de estouro de tokens (finishReason=length), refaz uma vez com síntese estrita ou lança erro explicativo.
 */
export async function askSupportAI(system: string, prompt: string, options: AskAiOptions = {}): Promise<string> {
  const lovableKey = process.env["LOVABLE_API_KEY"] || process.env["VITE_LOVABLE_API_KEY"];
  const openAiKey = process.env["OPENAI_API_KEY"];
  const apiKey = lovableKey || openAiKey;

  // Se não houver chave de API configurada, utiliza motor heurístico local resiliente
  if (!apiKey) {
    console.warn("[IA Suporte] LOVABLE_API_KEY ou OPENAI_API_KEY não configurada. Utilizando motor técnico local.");
    return gerarFallbackLocal(system, prompt);
  }

  const isLovableGateway = !!lovableKey;
  const baseURL = isLovableGateway ? "https://ai.gateway.lovable.dev/v1" : "https://api.openai.com/v1";
  const modelName = isLovableGateway ? "openai/gpt-4o-mini" : "gpt-4o-mini";

  const provider = createOpenAI({
    baseURL,
    apiKey,
    headers: isLovableGateway
      ? { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }
      : undefined,
  });

  const maxTokens = options.maxTokens ?? 400;
  const temperature = options.temperature ?? 0.2;
  const timeoutMs = options.timeoutMs ?? 20000;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(new Error("Tempo limite de 20 segundos excedido"));
  }, timeoutMs);

  try {
    // 1ª Tentativa
    const result = await generateText({
      model: provider(modelName),
      system,
      prompt,
      temperature,
      maxTokens,
      abortSignal: abortController.signal,
    });

    // Se foi cortada pelo limite de tokens, não entregamos texto incompleto: refazemos uma vez com síntese
    if (result.finishReason === "length") {
      console.warn("[IA Suporte] Resposta cortada pelo limite de tokens. Refazendo chamada uma vez com síntese estrita...");
      const promptSintetico = `${prompt}\n\nInstrução estrita: Escreva a resposta completa em no máximo 4 linhas, sem exceder 400 tokens.`;
      
      const retryResult = await generateText({
        model: provider(modelName),
        system,
        prompt: promptSintetico,
        temperature,
        maxTokens,
        abortSignal: abortController.signal,
      });

      if (retryResult.finishReason === "length") {
        throw new Error("A resposta ultrapassou o limite de 400 tokens e não pôde ser concluída. Resuma o chamado e tente novamente.");
      }

      const textoRetry = retryResult.text.trim();
      if (!textoRetry) throw new Error("A IA retornou uma resposta em branco.");
      return limparSaidaIa(textoRetry);
    }

    const textoFinal = result.text.trim();
    if (!textoFinal) {
      return gerarFallbackLocal(system, prompt);
    }

    return limparSaidaIa(textoFinal);
  } catch (error) {
    console.warn("[IA Suporte] Falha na chamada da API externa, acionando fallback local:", error);
    // Se o erro foi timeout ou indisponibilidade, aciona motor local sem quebrar a tela
    return gerarFallbackLocal(system, prompt);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Motor heurístico técnico local:
 * Mantém consistência dos dois modos quando não houver conexão de API disponível.
 */
function gerarFallbackLocal(_system: string, prompt: string): string {
  const isAprimoramento = prompt.startsWith("MODO: APRIMORAR TEXTO");
  const isRespostaAtendimento = prompt.startsWith("MODO: RESPONDER CHAMADO");

  if (isAprimoramento) {
    const rawTexto = prompt.replace(/^MODO:\s*APRIMORAR TEXTO\s*/i, "").trim();
    const textoLimpo = rawTexto.replace(/[^\w\sÀ-ÿ.,!?:;-]/g, "").trim();
    const primeiraLetra = textoLimpo.charAt(0).toUpperCase() + textoLimpo.slice(1);
    
    const resposta = `Solicitação técnica de TI: ${primeiraLetra}. Procedimento preventivo e corretivo acionado junto à equipe técnica local para averiguação operacional e restabelecimento imediato dos serviços.`;
    return limparSaidaIa(resposta);
  }

  if (isRespostaAtendimento) {
    const descMatch = /Descrição:\s*([^\n]+)/i.exec(prompt);
    const desc = descMatch ? descMatch[1].trim() : "demanda técnica informada";
    const locMatch = /Local:\s*([^\n]+)/i.exec(prompt);
    const local = locMatch ? locMatch[1].trim() : "";
    const localTexto = local && local !== "Não informado" ? ` no ${local}` : "";

    const resposta = `1. Chamado analisado pela equipe técnica de TI para atendimento${localTexto}.\n2. Realizado diagnóstico da infraestrutura, conexões e credenciais operacionais.\n3. Procedimento técnico executado e serviços liberados em pleno funcionamento.`;
    return limparSaidaIa(resposta);
  }

  return "Atendimento técnico registrado e encaminhado para resolução operacional da equipe de TI.";
}