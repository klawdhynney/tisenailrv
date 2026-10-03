import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askSupportAI, limparSaidaIa } from "./ai-support.server";
import { supabase } from "@/integrations/supabase/client";
import { IA_SUPORTE_PADRAO, type IaSuporteConfig } from "./types";

async function obterConfigIa(): Promise<IaSuporteConfig> {
  try {
    const { data } = await supabase.from("configuracoes").select("regras").eq("id", 1).maybeSingle();
    const regrasSalvas = (data?.regras as any) || {};
    if (regrasSalvas.iaSuporte && typeof regrasSalvas.iaSuporte === "object") {
      return {
        promptSistema: regrasSalvas.iaSuporte.promptSistema || IA_SUPORTE_PADRAO.promptSistema,
        maxTokensResposta: Number(regrasSalvas.iaSuporte.maxTokensResposta) || IA_SUPORTE_PADRAO.maxTokensResposta,
        maxTokensAprimoramento:
          Number(regrasSalvas.iaSuporte.maxTokensAprimoramento) || IA_SUPORTE_PADRAO.maxTokensAprimoramento,
        temperatura: Number(regrasSalvas.iaSuporte.temperatura) || IA_SUPORTE_PADRAO.temperatura,
      };
    }
  } catch (err) {
    console.warn("Falha ao obter configuração de IA do banco, usando padrão:", err);
  }
  return IA_SUPORTE_PADRAO;
}

const revisarInputSchema = z.object({
  texto: z.string().trim().min(2, "Digite pelo menos 2 caracteres para aprimorar.").max(3000),
  modo: z.enum(["revisao", "tecnica"]).default("revisao"),
});

function parseJsonResponse<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
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
    const config = await obterConfigIa();

    const systemPrompt = `${config.promptSistema}

INSTRUÇÃO ESPECÍFICA PARA APRIMORAMENTO:
Aprimore o texto fornecido pelo técnico tornando-o estritamente direto, técnico, formal e cordial, mantendo os fatos e sentido original sem comentários ou explicações.
Gere DUAS opções distintas prontas para uso:
- versao1: Redação técnica e direta em frases afirmativas e claras.
- versao2: Redação técnica estruturada e sucinta.

Responda ESTRITAMENTE em formato JSON válido:
{
  "versao1": "...",
  "versao2": "..."
}`;

    const raw = await askSupportAI(systemPrompt, data.texto, {
      maxTokens: config.maxTokensAprimoramento,
      temperature: config.temperatura,
      timeoutMs: 20000,
    });

    const parsed = parseJsonResponse(raw, {
      versao1: raw,
      versao2: raw,
    });

    return {
      versao1: limparSaidaIa(parsed.versao1 || raw),
      versao2: limparSaidaIa(parsed.versao2 || raw),
    };
  });

const atendimentoInputSchema = z.object({
  ticketId: z.number().optional(),
  categoria: z.string().optional(),
  prioridade: z.string().optional(),
  local: z.string().optional(),
  descricao: z.string().min(3).max(3000),
  procedimentoAtual: z.string().optional(),
  // Solicitante/contato/foto não devem ser enviados para preservar privacidade
});

export const sugerirRespostasAtendimento = createServerFn({ method: "POST" })
  .validator((input: unknown) => atendimentoInputSchema.parse(input))
  .handler(async ({ data }) => {
    const config = await obterConfigIa();

    const systemPrompt = `${config.promptSistema}

INSTRUÇÃO ESPECÍFICA DE RESPOSTA AO CHAMADO:
Com base apenas nas informações técnicas do chamado (categoria, prioridade, local, descrição do problema e procedimento atual), elabore DUAS opções de respostas técnicas prontas para envio direto ao solicitante:
- opcao1: Procedimento de ação direta ou resolução técnica passo a passo (máximo 7 passos curtos).
- opcao2: Parecer técnico direto informando causa identificada e encaminhamento executado.

Ambas devem ter até 5 linhas ou 80 palavras. Sem preâmbulos, sem 'sugiro/recomendo'.
Responda ESTRITAMENTE em formato JSON válido:
{
  "opcao1": "...",
  "opcao2": "..."
}`;

    // Somente dados estritamente necessários são enviados à IA (sem e-mail, telefone, foto ou dados pessoais)
    const promptContext = JSON.stringify({
      chamadoId: data.ticketId,
      categoria: data.categoria || "Geral",
      prioridade: data.prioridade || "Média",
      local: data.local || "Não informado",
      descricaoProblema: data.descricao,
      procedimentoAtual: data.procedimentoAtual || "",
    });

    const raw = await askSupportAI(systemPrompt, promptContext, {
      maxTokens: config.maxTokensResposta,
      temperature: config.temperatura,
      timeoutMs: 20000,
    });

    const parsed = parseJsonResponse(raw, {
      opcao1: raw,
      opcao2: raw,
    });

    return {
      opcao1: limparSaidaIa(parsed.opcao1 || raw),
      opcao2: limparSaidaIa(parsed.opcao2 || raw),
    };
  });