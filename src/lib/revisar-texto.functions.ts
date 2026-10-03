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
        maxTokensResposta: 400,
        maxTokensAprimoramento: 400,
        temperatura: 0.2,
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

    // MODO: APRIMORAR TEXTO - envia estritamente o texto digitado pelo técnico, sem dados pessoais
    const userMessage = [
      "MODO: APRIMORAR TEXTO",
      data.texto.trim(),
    ].join("\n");

    // Usa estritamente o prompt do sistema salvo no painel, sem prompts fixos divergentes
    const raw = await askSupportAI(config.promptSistema, userMessage, {
      maxTokens: 400,
      temperature: 0.2,
      timeoutMs: 20000,
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

    // Obtém até as 5 últimas mensagens anteriores registradas (sem e-mail, telefone, foto ou dados pessoais)
    let ultimasMensagens: string[] = [];
    if (Array.isArray(data.mensagens) && data.mensagens.length > 0) {
      ultimasMensagens = data.mensagens.map((m) => String(m).trim()).filter(Boolean).slice(-5);
    } else if (data.procedimentoAtual && data.procedimentoAtual.trim()) {
      ultimasMensagens = [data.procedimentoAtual.trim()];
    }

    const blocoMensagens =
      ultimasMensagens.length > 0
        ? ultimasMensagens.map((m, idx) => `- Mensagem ${idx + 1}: ${m}`).join("\n")
        : "Nenhuma mensagem anterior registrada.";

    const titulo = data.titulo || (data.ticketId ? `Chamado #${data.ticketId}` : "Chamado Técnico");

    // MODO: RESPONDER CHAMADO - envia dados técnicos contextuais sem qualquer dado pessoal
    const userMessage = [
      "MODO: RESPONDER CHAMADO",
      `Título: ${titulo}`,
      `Descrição: ${data.descricao}`,
      `Categoria: ${data.categoria || "Geral"}`,
      `Prioridade: ${data.prioridade || "Média"}`,
      `Local: ${data.local || "Não informado"}`,
      `Últimas mensagens do chamado:`,
      blocoMensagens,
    ].join("\n");

    // Usa estritamente o prompt do sistema salvo no painel, sem prompts fixos divergentes
    const raw = await askSupportAI(config.promptSistema, userMessage, {
      maxTokens: 400,
      temperature: 0.2,
      timeoutMs: 20000,
    });

    const textoFinal = limparSaidaIa(raw);

    return {
      texto: textoFinal,
      opcao1: textoFinal,
      opcao2: textoFinal,
    };
  });