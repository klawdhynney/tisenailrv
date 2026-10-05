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
        maxTokensResposta: Number(regrasSalvas.iaSuporte.maxTokensResposta) || 150,
        maxTokensAprimoramento: Number(regrasSalvas.iaSuporte.maxTokensAprimoramento) || 150,
        temperatura: typeof regrasSalvas.iaSuporte.temperatura === "number" ? regrasSalvas.iaSuporte.temperatura : 0.2,
      };
    }
  } catch (err) {
    console.warn("Falha ao obter configuração de IA do banco, usando padrão:", err);
  }
  return IA_SUPORTE_PADRAO;
}

const revisarInputSchema = z.object({
  texto: z.string().trim().min(2, "Digite pelo menos 2 caracteres para aprimorar.").max(6000),
  modo: z.enum(["revisao", "tecnica"]).default("revisao").optional(),
});

export const revisarTexto = createServerFn({ method: "POST" })
  .validator((input: unknown) => revisarInputSchema.parse(input))
  .handler(async ({ data }) => {
    const config = await obterConfigIa();

    // MODO: APRIMORAR TEXTO - envia estritamente o texto essencial digitado pelo técnico
    const userMessage = [
      "MODO: APRIMORAR TEXTO",
      data.texto.trim(),
    ].join("\n");

    const raw = await askSupportAI(config.promptSistema, userMessage, {
      maxTokens: config.maxTokensAprimoramento || 150,
      temperature: config.temperatura ?? 0.2,
      timeoutMs: 12000,
    });

    const textoFinal = limparSaidaIa(raw);

    return {
      texto: textoFinal,
      versao1: textoFinal,
      versao2: textoFinal,
    };
  });

const atendimentoInputSchema = z.object({
  ticketId: z.number().optional(),
  titulo: z.string().optional(),
  categoria: z.string().optional(),
  prioridade: z.string().optional(),
  local: z.string().optional(),
  descricao: z.string().min(1).max(3000),
  mensagens: z.array(z.string()).optional(),
  procedimentoAtual: z.string().optional(),
});

export const sugerirRespostasAtendimento = createServerFn({ method: "POST" })
  .validator((input: unknown) => atendimentoInputSchema.parse(input))
  .handler(async ({ data }) => {
    const config = await obterConfigIa();

    const titulo = data.titulo || (data.ticketId ? `Chamado #${data.ticketId}` : "Chamado Técnico");
    const localInfo = data.local && data.local !== "Não informado" ? ` (${data.local})` : "";

    // MODO: RESPONDER CHAMADO - envia somente o contexto essencial para manter a resposta ultra rápida
    const userMessage = [
      "MODO: RESPONDER CHAMADO",
      `Título: ${titulo}${localInfo}`,
      `Descrição: ${data.descricao}`,
      ...(data.procedimentoAtual?.trim() ? [`Última anotação: ${data.procedimentoAtual.trim()}`] : []),
    ].join("\n");

    const raw = await askSupportAI(config.promptSistema, userMessage, {
      maxTokens: config.maxTokensResposta || 150,
      temperature: config.temperatura ?? 0.2,
      timeoutMs: 12000,
    });

    const textoFinal = limparSaidaIa(raw);

    return {
      texto: textoFinal,
      opcao1: textoFinal,
      opcao2: textoFinal,
    };
  });