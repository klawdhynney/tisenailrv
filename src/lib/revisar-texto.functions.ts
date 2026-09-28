import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

const inputSchema = z.object({
  texto: z.string().trim().min(10).max(3000),
  modo: z.enum(["revisao", "tecnica"]).default("revisao"),
});

export const revisarTexto = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Revisão assistida indisponível no momento.");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        maxRetries: 0,
        providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
        system: data.modo === "tecnica"
          ? "Você é assistente de suporte de TI. Em português brasileiro, sugira até três verificações técnicas seguras e objetivas para o problema informado. Não afirme diagnóstico, não invente fatos, não solicite senhas nem proponha passos destrutivos. Responda apenas com sugestões, sem alterar o chamado."
          : "Revise apenas ortografia, gramática e clareza em português brasileiro. Preserve todos os fatos, nomes, horários e detalhes técnicos. Não invente informações. Responda somente com o texto revisado.",
        prompt: data.texto,
      });
      const sugestao = (await result.text).trim();
      if (!sugestao || sugestao.length > 4000) throw new Error("Nenhuma sugestão disponível.");
      return sugestao;
    } catch (error) {
      const status = (error as { statusCode?: number; status?: number }).statusCode ?? (error as { status?: number }).status;
      if (status) {
        const safe = error instanceof Error ? error.message.slice(0, 350) : "Falha na revisão.";
        throw new Error(safe);
      }
      throw error;
    }
  });