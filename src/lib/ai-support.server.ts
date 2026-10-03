import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export interface AskAiOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export function limparSaidaIa(texto: string): string {
  if (!texto) return "";
  let limpo = texto.trim();

  // Remove blocos de markdown envolventes ``` ... ``` se envolver todo o texto
  if (limpo.startsWith("```") && limpo.endsWith("```")) {
    limpo = limpo.replace(/^```[a-z]*\s*\n?/i, "").replace(/\n?```$/i, "").trim();
  }

  // Remove preâmbulos comuns indesejados
  const preambulos = [
    /^(?:Aqui está|Segue|Abaixo segue|Segue abaixo)(?:\s+(?:a|o|uma|um))?(?:\s+(?:resposta|sugestão|parecer|procedimento)(?:\s+técnico|\s+técnica)?)?\s*:\s*/i,
    /^(?:Resposta|Sugestão|Parecer|Procedimento)(?:\s+(?:técnico|técnica))?\s*:\s*/i,
    /^(?:Prezado\(a\),?\s*)?(?:Aqui está|Segue|Segue a resposta técnica)\s*:\s*/i,
  ];

  for (const regex of preambulos) {
    limpo = limpo.replace(regex, "");
  }

  // Remove aspas envolventes se houver
  if (
    (limpo.startsWith('"') && limpo.endsWith('"')) ||
    (limpo.startsWith("“") && limpo.endsWith("”")) ||
    (limpo.startsWith("'") && limpo.endsWith("'"))
  ) {
    limpo = limpo.slice(1, -1).trim();
  }

  return limpo;
}

export async function askSupportAI(system: string, prompt: string, options: AskAiOptions = {}) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Assistência por IA indisponível no momento. Chave não configurada no servidor.");

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  const timeoutMs = options.timeoutMs ?? 20000;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(new Error("Tempo limite de 20 segundos excedido"));
  }, timeoutMs);

  try {
    // Modelo mais rápido disponível com temperatura baixa (0.2) e sem cadeias de raciocínio pesadas
    const result = streamText({
      model: provider("openai/gpt-4o-mini"),
      maxRetries: 0,
      system,
      prompt,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 300,
      abortSignal: abortController.signal,
    });

    const text = (await result.text).trim();
    if (!text || text.length > 4000) {
      throw new Error("Nenhuma resposta válida retornada pela IA.");
    }
    return limparSaidaIa(text);
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new Error("O serviço de IA demorou para responder (tempo limite de 20s). Por favor, tente novamente.");
    }
    const status =
      (error as { statusCode?: number; status?: number }).statusCode ??
      (error as { status?: number }).status;
    if (status) {
      throw new Error(
        error instanceof Error ? error.message.slice(0, 350) : "Assistência por IA indisponível no momento."
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}