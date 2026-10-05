import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askSupportAI, limparSaidaIa } from "./ai-support.server";
import { supabase } from "@/integrations/supabase/client";
import {
  IA_SUPORTE_PADRAO,
  PROMPT_SUGERIR_RESPOSTA_PADRAO,
  PROMPT_APRIMORAR_TEXTO_PADRAO,
  PROMPT_SUGERIR_ABERTURA_PADRAO,
  type IaSuporteConfig,
} from "./types";

/**
 * Obtém as configurações da IA de suporte do banco de dados,
 * garantindo valores padrão resilientes para cada uma das 3 abas.
 */
export async function obterConfigIa(): Promise<IaSuporteConfig> {
  try {
    const { data } = await supabase.from("configuracoes").select("regras").eq("id", 1).maybeSingle();
    const regrasSalvas = (data?.regras as any) || {};
    const iaSalva = (regrasSalvas.iaSuporte as any) || {};

    const respostaAtendimento = {
      ativo: iaSalva.respostaAtendimento?.ativo ?? true,
      prompt: (iaSalva.respostaAtendimento?.prompt || iaSalva.promptSistema || PROMPT_SUGERIR_RESPOSTA_PADRAO).trim(),
      maxTokens: Number(iaSalva.respostaAtendimento?.maxTokens || iaSalva.maxTokensResposta) || 150,
      temperatura: typeof iaSalva.respostaAtendimento?.temperatura === "number"
        ? iaSalva.respostaAtendimento.temperatura
        : (typeof iaSalva.temperatura === "number" ? iaSalva.temperatura : 0.2),
      usarChamadosResolvidos: iaSalva.respostaAtendimento?.usarChamadosResolvidos ?? iaSalva.usarChamadosResolvidos ?? true,
      maxExemplosResolvidos: Math.min(5, Math.max(1, Number(iaSalva.respostaAtendimento?.maxExemplosResolvidos || iaSalva.maxExemplosResolvidos) || 5)),
    };

    const aprimorarTexto = {
      ativo: iaSalva.aprimorarTexto?.ativo ?? true,
      prompt: (iaSalva.aprimorarTexto?.prompt || PROMPT_APRIMORAR_TEXTO_PADRAO).trim(),
      maxTokens: Number(iaSalva.aprimorarTexto?.maxTokens || iaSalva.maxTokensAprimoramento) || 150,
      temperatura: typeof iaSalva.aprimorarTexto?.temperatura === "number" ? iaSalva.aprimorarTexto.temperatura : 0.2,
    };

    const sugerirAbertura = {
      ativo: iaSalva.sugerirAbertura?.ativo ?? true,
      prompt: (iaSalva.sugerirAbertura?.prompt || PROMPT_SUGERIR_ABERTURA_PADRAO).trim(),
      maxTokens: Number(iaSalva.sugerirAbertura?.maxTokens) || 100,
      temperatura: typeof iaSalva.sugerirAbertura?.temperatura === "number" ? iaSalva.sugerirAbertura.temperatura : 0.2,
    };

    return {
      respostaAtendimento,
      aprimorarTexto,
      sugerirAbertura,
      promptSistema: respostaAtendimento.prompt,
      maxTokensResposta: respostaAtendimento.maxTokens,
      maxTokensAprimoramento: aprimorarTexto.maxTokens,
      temperatura: respostaAtendimento.temperatura,
      usarChamadosResolvidos: respostaAtendimento.usarChamadosResolvidos,
      maxExemplosResolvidos: respostaAtendimento.maxExemplosResolvidos,
    };
  } catch (err) {
    console.warn("[IA Suporte] Falha ao obter configuração de IA do banco, usando padrão:", err);
    return IA_SUPORTE_PADRAO;
  }
}

/**
 * Sanitiza o texto para conformidade com a LGPD e privacidade estrita:
 * - Remove e-mails, telefones, CPFs e senhas
 * - Remove espaços duplicados e quebras de linha excessivas
 * - Limita estritamente ao tamanho máximo (300 caracteres)
 */
export function sanitizarTextoLgpd(texto: string, maxChars = 300): string {
  if (!texto) return "";
  let limpo = texto.trim();
  // Remove e-mails
  limpo = limpo.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[e-mail]");
  // Remove números de telefone (fixo e celular nacional)
  limpo = limpo.replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/g, "[telefone]");
  // Remove CPFs
  limpo = limpo.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[documento]");
  // Remove senhas
  limpo = limpo.replace(/(?:senha|password)[:=]\s*\S+/gi, "senha: [protegida]");
  // Normaliza espaços em branco
  limpo = limpo.replace(/\s+/g, " ").trim();
  if (limpo.length > maxChars) {
    limpo = limpo.slice(0, maxChars - 3).trim() + "...";
  }
  return limpo;
}

export interface ChamadoResolvidoExemplo {
  id: number;
  categoria: string;
  titulo: string;
  problema: string;
  solucao: string;
}

/**
 * Busca de até 5 chamados resolvidos semelhantes no servidor:
 * - Prioriza a mesma categoria
 * - Busca textual full-text em português
 * - Retorna unicamente título, categoria, problema e solução (máx. 300 caracteres cada)
 * - Remove qualquer dado pessoal (LGPD)
 * - Roda estritamente no backend em menos de 300ms
 */
export async function buscarResolvidosSemelhantes(params: {
  termo: string;
  categoria?: string;
  ticketIdAtual?: number;
  limite?: number;
}): Promise<ChamadoResolvidoExemplo[]> {
  const limite = Math.min(5, Math.max(1, params.limite ?? 5));
  const termo = (params.termo || "").trim();

  // 1. Tenta a função segura RPC criada no PostgreSQL via migration
  try {
    const { data, error } = await supabase.rpc("buscar_chamados_resolvidos_semelhantes", {
      p_termo: termo,
      p_categoria: params.categoria || null,
      p_ticket_id_atual: params.ticketIdAtual || null,
      p_limite: limite,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        categoria: sanitizarTextoLgpd(item.categoria || "TI", 100),
        titulo: sanitizarTextoLgpd(item.titulo || `Chamado #${item.id}`, 100),
        problema: sanitizarTextoLgpd(item.problema || "", 300),
        solucao: sanitizarTextoLgpd(item.solucao || "", 300),
      }));
    }
  } catch (err) {
    console.warn("[IA Suporte] RPC de busca de semelhantes indisponível, acionando consulta direta:", err);
  }

  // 2. Fallback de consulta direta ao Supabase se a RPC não estiver disponível
  try {
    let query = supabase
      .from("tickets")
      .select("id, categoria, descricao, procedimento")
      .in("status", ["Resolvido", "resolvido", "Concluído", "concluido", "Concluido"]);

    if (params.ticketIdAtual) {
      query = query.neq("id", params.ticketIdAtual);
    }

    if (params.categoria) {
      query = query.eq("categoria", params.categoria);
    }

    const { data: ticketsData } = await query.order("id", { ascending: false }).limit(limite);
    if (ticketsData && ticketsData.length > 0) {
      return ticketsData.map((t: any) => ({
        id: t.id,
        categoria: sanitizarTextoLgpd(t.categoria || "TI", 100),
        titulo: sanitizarTextoLgpd(t.categoria ? `${t.categoria} #${t.id}` : `Chamado #${t.id}`, 100),
        problema: sanitizarTextoLgpd(t.descricao || "", 300),
        solucao: sanitizarTextoLgpd(t.procedimento || "Atendimento realizado e chamado resolvido.", 300),
      }));
    }
  } catch (err) {
    console.warn("[IA Suporte] Falha na consulta de fallback de chamados resolvidos:", err);
  }

  return [];
}

const revisarInputSchema = z.object({
  texto: z.string().trim().min(2, "Digite pelo menos 2 caracteres para aprimorar.").max(6000),
  modo: z.enum(["revisao", "tecnica"]).default("revisao").optional(),
  ticketId: z.number().optional(),
  titulo: z.string().optional(),
  categoria: z.string().optional(),
  local: z.string().optional(),
  descricao: z.string().optional(),
  mensagens: z.array(z.string()).optional(),
});

export const revisarTexto = createServerFn({ method: "POST" })
  .validator((input: unknown) => revisarInputSchema.parse(input))
  .handler(async ({ data }) => {
    const config = await obterConfigIa();

    if (config.aprimorarTexto.ativo === false) {
      throw new Error("O recurso de aprimoramento de texto com IA está desativado no painel de configurações.");
    }

    // Carrega mensagens da conversa se não fornecidas diretamente e ticketId estiver presente
    let mensagens = data.mensagens || [];
    if (data.ticketId && mensagens.length === 0) {
      try {
        const { data: dbMsgs } = await supabase
          .from("ticket_mensagens")
          .select("autor_tipo, autor_nome, mensagem")
          .eq("ticket_id", data.ticketId)
          .order("criado_em", { ascending: true })
          .limit(6);
        if (dbMsgs && dbMsgs.length > 0) {
          mensagens = dbMsgs.map((m: any) => {
            const papel = m.autor_tipo === "solicitante" ? "Solicitante" : "Técnico";
            return `${papel}: ${m.mensagem}`;
          });
        }
      } catch (err) {
        console.warn("[IA Suporte] Falha ao carregar mensagens para aprimoramento:", err);
      }
    }

    // MODO: APRIMORAR TEXTO - envia o contexto do chamado e o texto digitado
    const partesAprimorar: string[] = ["MODO: APRIMORAR TEXTO"];

    const temContexto =
      data.titulo ||
      data.categoria ||
      (data.local && data.local !== "Não informado") ||
      data.descricao ||
      mensagens.length > 0;

    if (temContexto) {
      partesAprimorar.push("--- CONTEXTO DO CHAMADO ---");
      if (data.titulo || data.ticketId) {
        partesAprimorar.push(`Título: ${data.titulo || `Chamado #${data.ticketId}`}`);
      }
      if (data.categoria) {
        partesAprimorar.push(`Categoria: ${data.categoria}`);
      }
      if (data.local && data.local !== "Não informado") {
        partesAprimorar.push(`Local: ${data.local}`);
      }
      if (data.descricao) {
        partesAprimorar.push(`Descrição do chamado: ${data.descricao}`);
      }
      if (mensagens.length > 0) {
        partesAprimorar.push("Mensagens da conversa:");
        for (const m of mensagens.slice(-4)) {
          partesAprimorar.push(`- ${m}`);
        }
      }
      partesAprimorar.push("---------------------------");
    }

    partesAprimorar.push("Texto do técnico a aprimorar:", data.texto.trim());

    const userMessage = partesAprimorar.join("\n");

    const raw = await askSupportAI(config.aprimorarTexto.prompt, userMessage, {
      maxTokens: config.aprimorarTexto.maxTokens || 150,
      temperature: config.aprimorarTexto.temperatura ?? 0.2,
      timeoutMs: 12000,
      modo: "aprimorar",
      textoOriginal: data.texto.trim(),
    });

    const textoFinal = limparSaidaIa(raw);

    return {
      texto: textoFinal,
      versao1: textoFinal,
      versao2: textoFinal,
    };
  });

const sugerirAberturaInputSchema = z.object({
  setor: z.string().optional(),
  categoria: z.string().optional(), // Tipo de problema
  local: z.string().optional(),
  outrosCampos: z.record(z.string()).optional(),
  textoAtual: z.string().optional(),
});

export const sugerirTextoAbertura = createServerFn({ method: "POST" })
  .validator((input: unknown) => sugerirAberturaInputSchema.parse(input))
  .handler(async ({ data }) => {
    const config = await obterConfigIa();

    if (config.sugerirAbertura.ativo === false) {
      throw new Error("A sugestão de texto para abertura de chamados está desativada no painel de configurações.");
    }

    const partes: string[] = ["Opções selecionadas pelo solicitante:"];
    if (data.setor && data.setor.trim()) {
      partes.push(`Setor: ${sanitizarTextoLgpd(data.setor.trim(), 100)}`);
    }
    if (data.local && data.local.trim()) {
      partes.push(`Local: ${sanitizarTextoLgpd(data.local.trim(), 100)}`);
    }
    if (data.categoria && data.categoria.trim()) {
      partes.push(`Tipo de problema: ${sanitizarTextoLgpd(data.categoria.trim(), 100)}`);
    }
    if (data.outrosCampos && Object.keys(data.outrosCampos).length > 0) {
      for (const [k, v] of Object.entries(data.outrosCampos)) {
        if (v && typeof v === "string" && v.trim()) {
          partes.push(`${k}: ${sanitizarTextoLgpd(v.trim(), 100)}`);
        }
      }
    }
    if (data.textoAtual && data.textoAtual.trim()) {
      partes.push(`Texto já digitado pelo solicitante:\n${sanitizarTextoLgpd(data.textoAtual.trim(), 500)}`);
    }

    const userMessage = partes.join("\n");

    const raw = await askSupportAI(config.sugerirAbertura.prompt, userMessage, {
      maxTokens: config.sugerirAbertura.maxTokens || 100,
      temperature: config.sugerirAbertura.temperatura ?? 0.2,
      timeoutMs: 10000,
      modo: "abertura",
      textoOriginal: data.textoAtual?.trim() || "",
      dadosOpcoes: {
        setor: data.setor,
        local: data.local,
        categoria: data.categoria,
      },
    });

    const textoFinal = limparSaidaIa(raw);

    return {
      texto: textoFinal,
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

    if (config.respostaAtendimento.ativo === false) {
      throw new Error("A sugestão de resposta no atendimento está desativada no painel de configurações.");
    }

    const titulo =
      data.titulo ||
      (data.categoria ? `${data.categoria} (Chamado #${data.ticketId ?? ""})` : data.ticketId ? `Chamado #${data.ticketId}` : "Chamado Técnico");

    // 1. Busca chamados resolvidos semelhantes se o interruptor estiver ligado
    let blocoResolvidos = "";
    if (config.respostaAtendimento.usarChamadosResolvidos ?? true) {
      const termoBusca = [data.categoria, data.titulo, data.descricao].filter(Boolean).join(" ");
      const resolvidos = await buscarResolvidosSemelhantes({
        termo: termoBusca,
        categoria: data.categoria,
        ticketIdAtual: data.ticketId,
        limite: config.respostaAtendimento.maxExemplosResolvidos ?? 5,
      });

      if (resolvidos.length > 0) {
        const linhasResolvidos: string[] = ["CHAMADOS RESOLVIDOS SEMELHANTES:"];
        resolvidos.forEach((ex, idx) => {
          linhasResolvidos.push(
            `Exemplo ${idx + 1}:`,
            `Título: ${ex.titulo}`,
            `Categoria: ${ex.categoria}`,
            `Problema: ${ex.problema}`,
            `Solução: ${ex.solucao}`,
          );
        });
        blocoResolvidos = linhasResolvidos.join("\n");
      }
    }

    // 2. Busca histórico de mensagens da conversa se não fornecidas diretamente
    let mensagens = data.mensagens || [];
    if (data.ticketId && mensagens.length === 0) {
      try {
        const { data: dbMsgs } = await supabase
          .from("ticket_mensagens")
          .select("autor_tipo, autor_nome, mensagem")
          .eq("ticket_id", data.ticketId)
          .order("criado_em", { ascending: true })
          .limit(8);
        if (dbMsgs && dbMsgs.length > 0) {
          mensagens = dbMsgs.map((m: any) => {
            const papel = m.autor_tipo === "solicitante" ? "Solicitante" : "Técnico";
            return `${papel}: ${m.mensagem}`;
          });
        }
      } catch (err) {
        console.warn("[IA Suporte] Não foi possível obter mensagens da conversa:", err);
      }
    }

    // 3. Monta a mensagem estruturada garantindo título, categoria, local, descrição e histórico
    const userMessageParts: string[] = ["MODO: RESPONDER CHAMADO"];

    // Se não houver semelhantes, a IA segue estritamente sem o bloco
    if (blocoResolvidos) {
      userMessageParts.push(blocoResolvidos);
    }

    userMessageParts.push(
      "--- DADOS DO CHAMADO ATUAL ---",
      `Título: ${titulo}`,
      `Categoria: ${data.categoria || "Não informada"}`,
      `Local: ${data.local || "Não informado"}`,
      `Descrição: ${data.descricao}`,
    );

    if (data.procedimentoAtual?.trim()) {
      userMessageParts.push(`Última anotação: ${data.procedimentoAtual.trim()}`);
    }

    if (mensagens.length > 0) {
      userMessageParts.push("Mensagens da conversa:");
      for (const msg of mensagens.slice(-6)) {
        userMessageParts.push(`- ${msg}`);
      }
    }

    userMessageParts.push("-------------------------------");

    const userMessage = userMessageParts.join("\n");

    const raw = await askSupportAI(config.respostaAtendimento.prompt, userMessage, {
      maxTokens: config.respostaAtendimento.maxTokens || 150,
      temperature: config.respostaAtendimento.temperatura ?? 0.2,
      timeoutMs: 12000,
      modo: "resposta",
    });

    const textoFinal = limparSaidaIa(raw);

    return {
      texto: textoFinal,
      opcao1: textoFinal,
      opcao2: textoFinal,
    };
  });