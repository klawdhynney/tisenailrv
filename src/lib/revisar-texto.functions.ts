import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askSupportAI } from "./ai-support.server";

const revisarInputSchema = z.object({
  texto: z.string().trim().min(5).max(3000),
  modo: z.enum(["revisao", "tecnica"]).default("revisao"),
});

function parseJsonResponse<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    // If not json, try to find { ... }
    const match = /{[\s\S]*}/.exec(raw);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // fallback
      }
    }
    return fallback;
  }
}

export const revisarTexto = createServerFn({ method: "POST" })
  .validator((input: unknown) => revisarInputSchema.parse(input))
  .handler(async ({ data }) => {
    const systemPrompt = `Você é o assistente técnico de suporte de TI do SENAI.
Adote sempre um tom exemplarmente gentil, cortês, respeitoso, formal e com elevado rigor técnico em português brasileiro.
Sua missão é aprimorar o texto fornecido pelo usuário para um chamado de TI (como descrição do problema ou solicitação técnica), preservando com exatidão todos os fatos, nomes, locais, horários e termos já mencionados. Não invente senhas ou fatos inexistentes.
Gere DUAS versões distintas, gentis, formais e técnicas:
- versao1 (Formal & Direta): Uma redação polida, gentil, formal, clara e objetiva com terminologia técnica precisa.
- versao2 (Técnica & Descritiva): Uma redação descritiva, estruturada, técnica e detalhada com elevado padrão de formalidade e cordialidade.

Responda ESTRITAMENTE em formato JSON válido:
{
  "versao1": "...",
  "versao2": "..."
}`;

    const raw = await askSupportAI(systemPrompt, data.texto);
    const parsed = parseJsonResponse(raw, {
      versao1: raw,
      versao2: raw,
    });

    return {
      versao1: parsed.versao1 || raw,
      versao2: parsed.versao2 || raw,
    };
  });

const atendimentoInputSchema = z.object({
  ticketId: z.number().optional(),
  solicitante: z.string().optional(),
  setor: z.string().optional(),
  local: z.string().optional(),
  categoria: z.string().optional(),
  descricao: z.string().min(3).max(3000),
  procedimentoAtual: z.string().optional(),
});

export const sugerirRespostasAtendimento = createServerFn({ method: "POST" })
  .validator((input: unknown) => atendimentoInputSchema.parse(input))
  .handler(async ({ data }) => {
    const systemPrompt = `Você é o especialista sênior de suporte técnico de TI do SENAI.
Seu tom de atendimento deve ser cortês, formal, técnico, altamente breve e objetivo (sem prolixidade, direto ao ponto).
Com base nas informações do chamado de TI fornecido (solicitante, setor, categoria e descrição do problema), elabore DUAS sugestões distintas de respostas técnicas breves e objetivas para o procedimento/atendimento do chamado:

- opcao1 (Ação Técnica Direta e Breve): Um registro conciso em 2 a 4 linhas das etapas executadas de diagnóstico e solução técnica implementada, com validação de funcionamento.
- opcao2 (Parecer Técnico Objetivo com Conclusão): Um registro breve e direto apontando a causa-raiz identificada, intervenção realizada e encerramento cordial com o usuário.

Mantenha objetividade, brevidade, rigor técnico e polidez. Não invente senhas nem solicite credenciais.
Responda ESTRITAMENTE em formato JSON válido:
{
  "opcao1": "...",
  "opcao2": "..."
}`;

    const promptContext = JSON.stringify({
      chamadoId: data.ticketId,
      solicitante: data.solicitante,
      setor: data.setor,
      local: data.local,
      categoria: data.categoria,
      descricaoProblema: data.descricao,
      procedimentoAtual: data.procedimentoAtual || "",
    });

    const raw = await askSupportAI(systemPrompt, promptContext);
    const parsed = parseJsonResponse(raw, {
      opcao1: raw,
      opcao2: raw,
    });

    return {
      opcao1: parsed.opcao1 || raw,
      opcao2: parsed.opcao2 || raw,
    };
  });