/**
 * ============================================================================
 * Processador Server-Side de Alertas por E-mail (TI SENAI LRV)
 * ============================================================================
 * Lê a fila outbox (alertas_email_fila), aplica limites de taxa (rate limiting),
 * proteção de ambiente não-produtivo, renderiza templates e despacha pelo
 * provedor de envio.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { enviarEmailAlerta } from "./provider.server";
import { renderizarEmailAlerta, type DadosEmailAlerta } from "./templates";
import type { AlertasEmailSolicitanteConfig } from "@/lib/types";

function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL || "https://c--7870cf2d-1046-4d67-8cc7-2076d631485a-prod.lovable.cloud";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_IqnMaNAnDUs0Sv9ODF-XfA_A20VGIko";

  return createClient(url, serviceKey || publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Processa itens pendentes da fila de alertas.
 */
export const processarFilaAlertasServerFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const supabase = getSupabaseServerClient();

    // 1. Carrega configurações do sistema
    const { data: configRow } = await supabase
      .from("configuracoes")
      .select("regras")
      .eq("id", 1)
      .maybeSingle();

    const config: Partial<AlertasEmailSolicitanteConfig> =
      ((configRow?.regras as any)?.alertasEmailSolicitante) || {};

    // 2. Reclama itens atômicos para processamento
    const { data: itens, error: itensErr } = await supabase.rpc("reclamar_itens_fila_alertas", {
      p_limite: 15,
    });

    if (itensErr || !itens || itens.length === 0) {
      return { processados: 0, enviados: 0, falhas: 0, mensagem: "Fila vazia ou nenhum item pendente." };
    }

    let enviados = 0;
    let falhas = 0;

    // Detecta ambiente de execução
    const isProducao = process.env.NODE_ENV === "production" && !process.env.VERCEL_PREVIEW_URL;
    const modoTeste = config.modoAmbienteTeste || "redirecionar";
    const emailAdminTeste = config.emailAmbienteTeste || "admin@tisenailrv.app";

    for (const item of itens) {
      try {
        const destinatarioReal = item.destinatario;
        const dadosEvento = (item.dados_evento || {}) as DadosEmailAlerta;
        const eventoTipo = item.evento as "aberto" | "atualizado" | "finalizado" | "teste";

        // Proteção contra abuso (Rate Limit: máx 20 e-mails por hora por destinatário)
        const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: enviosRecentes } = await supabase
          .from("alertas_email_fila")
          .select("id", { count: "exact", head: true })
          .eq("destinatario", destinatarioReal)
          .eq("status", "enviado")
          .gte("enviado_em", umaHoraAtras);

        if ((enviosRecentes || 0) >= 20) {
          await supabase.rpc("concluir_processamento_alerta", {
            p_id: item.id,
            p_sucesso: false,
            p_erro: "Limite de taxa excedido (máximo de 20 e-mails/hora para o mesmo destinatário). Adiado.",
          });
          falhas++;
          continue;
        }

        // Proteção de Ambiente de Teste (Preview / Local / Staging)
        let destinatarioEfetivo = destinatarioReal;
        let prefixoAssunto = "";

        if (!isProducao && eventoTipo !== "teste") {
          if (modoTeste === "apenas_log") {
            // Em modo apenas_log, registra sucesso simulado sem disparar e-mail real
            await supabase.rpc("concluir_processamento_alerta", {
              p_id: item.id,
              p_sucesso: true,
              p_message_id: "simulado_ambiente_teste_log",
            });
            enviados++;
            continue;
          }

          // Em modo redirecionar: envia somente para o e-mail do admin de teste
          destinatarioEfetivo = emailAdminTeste;
          prefixoAssunto = `[TESTE - Destinatário Original: ${destinatarioReal}] `;
        }

        // Renderiza o template do e-mail
        const renderizado = renderizarEmailAlerta({
          evento: eventoTipo,
          dados: dadosEvento,
          nomeRemetente: config.nomeRemetente || "TI SENAI LRV",
          textoRodape: config.textoRodape,
        });

        // Envio através do provedor isolado
        const resultado = await enviarEmailAlerta({
          to: destinatarioEfetivo,
          subject: `${prefixoAssunto}${renderizado.assunto}`,
          html: renderizado.html,
          text: renderizado.text,
          idempotencyKey: item.idempotency_key,
          evento: eventoTipo,
          replyTo: config.emailRemetente || "avisos@tisenailrv.app",
        });

        if (resultado.sucesso) {
          await supabase.rpc("concluir_processamento_alerta", {
            p_id: item.id,
            p_sucesso: true,
            p_message_id: resultado.messageId || `id_${Date.now()}`,
          });
          enviados++;
        } else {
          await supabase.rpc("concluir_processamento_alerta", {
            p_id: item.id,
            p_sucesso: false,
            p_erro: resultado.erro || "Falha desconhecida no provedor de envio.",
          });
          falhas++;
        }
      } catch (err: any) {
        console.error("Erro ao processar item da fila de alertas:", item.id, err);
        await supabase.rpc("concluir_processamento_alerta", {
          p_id: item.id,
          p_sucesso: false,
          p_erro: err?.message || String(err),
        });
        falhas++;
      }
    }

    return {
      processados: itens.length,
      enviados,
      falhas,
      mensagem: `Processamento concluído: ${enviados} enviado(s), ${falhas} falha(s).`,
    };
  });

/**
 * Envia um e-mail de teste manual imediato a partir do Painel de Ajustes.
 */
export const enviarEmailTesteServerFn = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ destinatario: z.string().email() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const dest = data.destinatario.trim().toLowerCase();

    // 1. Enfileira o e-mail de teste
    const { data: idFila, error: filaErr } = await supabase.rpc("enviar_email_alerta_teste", {
      p_destinatario: dest,
    });

    if (filaErr || !idFila) {
      return { sucesso: false, erro: filaErr?.message || "Não foi possível registrar o teste na fila." };
    }

    // 2. Processa a fila imediatamente para entrega instantânea
    await processarFilaAlertasServerFn();

    return {
      sucesso: true,
      mensagem: `E-mail de teste disparado com sucesso para ${dest}. Verifique sua caixa de entrada e o log de envios.`,
      id: idFila,
    };
  });

/**
 * Reenvia um alerta que falhou.
 */
export const reenviarAlertaFalhaServerFn = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ logId: z.number() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: ok, error } = await supabase.rpc("reenviar_email_alerta_falha", {
      p_log_id: data.logId,
    });

    if (error || !ok) {
      return { sucesso: false, erro: error?.message || "Não foi possível reagendar o alerta." };
    }

    // Processa a fila
    await processarFilaAlertasServerFn();

    return { sucesso: true, mensagem: "Alerta reagendado e processado com sucesso!" };
  });

/**
 * Obtém os logs de envio com filtros.
 */
export const obterLogsAlertasServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (input) =>
      z
        .object({
          limite: z.number().optional().default(50),
          filtroStatus: z.string().optional().default("todos"),
          filtroEvento: z.string().optional().default("todos"),
        })
        .parse(input)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: logs, error } = await supabase.rpc("get_email_alertas_logs", {
      p_limite: data.limite,
      p_filtro_status: data.filtroStatus,
      p_filtro_evento: data.filtroEvento,
    });

    if (error) {
      console.warn("Erro ao buscar logs de alertas de e-mail:", error);
      return [];
    }

    return logs || [];
  });
