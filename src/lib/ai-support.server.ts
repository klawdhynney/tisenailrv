import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export async function askSupportAI(system: string, prompt: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Assistência por IA indisponível no momento.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"), maxRetries: 0,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
      system, prompt,
    });
    const text = (await result.text).trim();
    if (!text || text.length > 4000) throw new Error("Nenhuma sugestão disponível.");
    return text;
  } catch (error) {
    const status = (error as { statusCode?: number; status?: number }).statusCode ?? (error as { status?: number }).status;
    if (status) throw new Error(error instanceof Error ? error.message.slice(0, 350) : "Assistência indisponível.");
    throw error;
  }
}