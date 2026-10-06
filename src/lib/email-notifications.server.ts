import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  ALERTAS_EMAIL_PADRAO,
  formatarDataHoraCuiaba,
  type AlertasEmailConfig,
} from "./types";

/**
 * Sanitiza valores de texto para evitar injeção em HTML
 */
function escaparHtml(texto: string | null | undefined): string {
  if (!texto) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Substitui variáveis do template: {numero}, {titulo}, {status}, {prioridade}, {prazo}, {resposta}, {link}
 */
export function compilarTemplate(template: string, vars: Record<string, string>): string {
  let resultado = template;
  for (const [chave, valor] of Object.entries(vars)) {
    const regex = new RegExp(`\\{${chave}\\}`, "gi");
    resultado = resultado.replace(regex, valor);
  }
  return resultado;
}

/**
 * Obtém as configurações de alerta de e-mail do banco de dados
 */
export async function obterConfigAlertasEmail(): Promise<AlertasEmailConfig> {
  try {
    const { data } = await supabase.from("configuracoes").select("regras").eq("id", 1).maybeSingle();
    const regrasSalvas = (data?.regras as any) || {};
    const alertasSalvo = (regrasSalvas.alertasEmail as any) || {};

    return {
      ativo: alertasSalvo.ativo ?? ALERTAS_EMAIL_PADRAO.ativo,
      eventos: {
        status: alertasSalvo.eventos?.status ?? ALERTAS_EMAIL_PADRAO.eventos.status,
        novaResposta: alertasSalvo.eventos?.novaResposta ?? ALERTAS_EMAIL_PADRAO.eventos.novaResposta,
        slaPausadoRetomado: alertasSalvo.eventos?.slaPausadoRetomado ?? ALERTAS_EMAIL_PADRAO.eventos.slaPausadoRetomado,
        finalizacao: alertasSalvo.eventos?.finalizacao ?? ALERTAS_EMAIL_PADRAO.eventos.finalizacao,
      },
      nomeRemetente: (alertasSalvo.nomeRemetente || ALERTAS_EMAIL_PADRAO.nomeRemetente).trim(),
      emailResposta: (alertasSalvo.emailResposta || ALERTAS_EMAIL_PADRAO.emailResposta).trim(),
      modeloAssunto: alertasSalvo.modeloAssunto || ALERTAS_EMAIL_PADRAO.modeloAssunto,
      modeloCorpo: alertasSalvo.modeloCorpo || ALERTAS_EMAIL_PADRAO.modeloCorpo,
      modeloFinalizadoAssunto: alertasSalvo.modeloFinalizadoAssunto || ALERTAS_EMAIL_PADRAO.modeloFinalizadoAssunto,
      modeloFinalizadoCorpo: alertasSalvo.modeloFinalizadoCorpo || ALERTAS_EMAIL_PADRAO.modeloFinalizadoCorpo,
    };
  } catch (err) {
    console.warn("[Email] Falha ao ler configurações de alertas:", err);
    return ALERTAS_EMAIL_PADRAO;
  }
}

/**
 * Monta o layout HTML responsivo sem imagens, otimizado para celulares e desktop.
 */
export function gerarEmailHtml(dados: {
  numero: number | string;
  titulo: string;
  status: string;
  prioridade: string;
  prazo: string;
  resposta: string;
  link: string;
  isFinalizado?: boolean;
  nomeRemetente?: string;
}): string {
  const isFinalizado = Boolean(dados.isFinalizado);
  const statusCor = isFinalizado
    ? "#0D652D"
    : dados.status === "Aguardando"
    ? "#FA7B17"
    : dados.status === "Em andamento"
    ? "#34A853"
    : "#1A73E8";

  const numSafe = escaparHtml(String(dados.numero));
  const titSafe = escaparHtml(dados.titulo);
  const statusSafe = escaparHtml(dados.status);
  const prioSafe = escaparHtml(dados.prioridade);
  const prazoSafe = escaparHtml(dados.prazo);
  const respSafe = escaparHtml(dados.resposta).replace(/\n/g, "<br>");
  const linkSafe = escaparHtml(dados.link);
  const remetenteSafe = escaparHtml(dados.nomeRemetente || "TI SENAI LRV");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificação de Chamado #${numSafe}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Barra de Destaque Superior Google SENAI -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #1A73E8 0%, #1A73E8 25%, #EA4335 25%, #EA4335 50%, #FBBC04 50%, #FBBC04 75%, #34A853 75%);"></td>
          </tr>

          <!-- Cabeçalho (Sem imagens) -->
          <tr>
            <td style="padding: 24px 28px 16px 28px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1A73E8; display: block; margin-bottom: 4px;">SENAI Lucas do Rio Verde</span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">${remetenteSafe}</h1>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 9999px; background-color: #f1f5f9; color: #475569;">#${numSafe}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do Conteúdo -->
          <tr>
            <td style="padding: 24px 28px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
                ${isFinalizado ? "Seu chamado foi finalizado com sucesso." : "Seu chamado recebeu uma atualização da equipe de suporte."}
              </p>

              <!-- Bloco de Resumo do Chamado -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600;">CHAMADO:</td>
                        <td style="padding-bottom: 8px; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">#${numSafe}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600;">STATUS:</td>
                        <td style="padding-bottom: 8px; text-align: right;">
                          <span style="display: inline-block; padding: 3px 10px; font-size: 12px; font-weight: 700; border-radius: 6px; background-color: ${statusCor}; color: #ffffff;">
                            ${statusSafe}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600;">PRIORIDADE:</td>
                        <td style="padding-bottom: 8px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">${prioSafe}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600;">${isFinalizado ? "DATA DE CONCLUSÃO:" : "PRAZO / SLA (CUIABÁ):"}</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">${prazoSafe}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Detalhes / Resposta da Equipe -->
              <div style="background-color: #ffffff; border-left: 4px solid #1A73E8; border-radius: 4px; padding: 14px 18px; margin-bottom: 24px; background-color: #f8fafc;">
                <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1A73E8; letter-spacing: 0.05em;">
                  ${isFinalizado ? "Resumo do atendimento realizado" : "Última resposta da equipe de TI"}
                </p>
                <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                  ${respSafe || "Acompanhe as atualizações pelo painel do chamado."}
                </div>
              </div>

              <!-- Botão de Ação Primária -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 8px;">
                <tr>
                  <td align="center">
                    <a href="${linkSafe}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; background-color: #1A73E8; color: #ffffff; box-shadow: 0 2px 4px rgba(26, 115, 232, 0.25); text-align: center;">
                      Ver chamado no sistema &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="text-align: center; font-size: 11px; color: #94a3b8; margin: 8px 0 0 0;">
                (É necessário estar conectado à sua conta institucional)
              </p>
            </td>
          </tr>

          <!-- Rodapé de Conformidade e LGPD -->
          <tr>
            <td style="padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                Mensagem automática de suporte da Central de TI SENAI Lucas do Rio Verde.
              </p>
              <div style="font-size: 11px; color: #94a3b8;">
                <a href="https://tisenailrv.app/lgpd" target="_blank" style="color: #64748b; text-decoration: underline;">Política de Privacidade (LGPD)</a>
                &nbsp;·&nbsp;
                <a href="https://tisenailrv.app/preferencias-email" target="_blank" style="color: #64748b; text-decoration: underline;">Desativar ou gerenciar alertas</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Envia um e-mail através da API REST do Resend.
 * Não utiliza bibliotecas externas, usando a API nativa fetch.
 */
export async function enviarEmailResend(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  senderName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    const msg = "RESEND_API_KEY não configurada no servidor. Configure a chave secreta de ambiente.";
    console.warn(`[Email Resend] ${msg}`);
    return { success: false, error: msg };
  }

  const senderName = payload.senderName || "TI SENAI LRV";
  // O remetente pode ser personalizado por variável de ambiente ou usa o domínio padrão
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "notificacoes@tisenailrv.app";
  const from = `${senderName} <${fromEmail}>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        reply_to: payload.replyTo || undefined,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const erroMsg = data?.message || data?.error?.message || `Erro HTTP ${res.status}`;
      console.error(`[Email Resend] Falha no disparo (${res.status}):`, erroMsg);
      return { success: false, error: erroMsg };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const erroMsg = err instanceof Error ? err.message : String(err);
    console.error("[Email Resend] Falha de conexão ou rede:", erroMsg);
    return { success: false, error: erroMsg };
  }
}

/**
 * Server Function: Processa a fila outbox (notificacoes_email)
 */
export const processarFilaEmailsServerFn = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      // 1. Carrega configurações do sistema
      const config = await obterConfigAlertasEmail();
      if (!config.ativo) {
        return { processados: 0, enviados: 0, falhas: 0, motivo: "Alertas gerais desativados nas regras." };
      }

      // 2. Busca até 20 itens pendentes que já passaram da janela de 3 minutos
      const { data: pendentes, error: pendError } = await supabase.rpc("get_pending_email_notifications", {
        p_limite: 20,
      });

      if (pendError) {
        console.error("[Email Outbox] Falha ao consultar fila:", pendError.message);
        return { processados: 0, enviados: 0, falhas: 0, erro: pendError.message };
      }

      if (!pendentes || pendentes.length === 0) {
        return { processados: 0, enviados: 0, falhas: 0, status: "Fila vazia." };
      }

      let enviados = 0;
      let falhas = 0;
      const detalhes: string[] = [];

      for (const item of pendentes) {
        const dados = (item.dados_evento as any) || {};
        const isFinalizado = item.tipo === "finalizado";
        const link = `https://tisenailrv.app/chamados/${item.ticket_id}`;

        const variaveis = {
          numero: String(item.ticket_id),
          titulo: dados.titulo || `Chamado #${item.ticket_id}`,
          status: dados.status || (isFinalizado ? "Resolvido" : "Atualizado"),
          prioridade: dados.prioridade || "Média",
          prazo: dados.prazo || formatarDataHoraCuiaba(new Date()),
          resposta: dados.resposta || "Atualização realizada pela equipe de suporte.",
          link,
        };

        const templateAssunto = isFinalizado ? config.modeloFinalizadoAssunto : config.modeloAssunto;
        const templateCorpo = isFinalizado ? config.modeloFinalizadoCorpo : config.modeloCorpo;

        const assunto = compilarTemplate(templateAssunto, variaveis);
        const corpoTexto = compilarTemplate(templateCorpo, variaveis);
        const corpoHtml = gerarEmailHtml({
          numero: item.ticket_id,
          titulo: variaveis.titulo,
          status: variaveis.status,
          prioridade: variaveis.prioridade,
          prazo: variaveis.prazo,
          resposta: variaveis.resposta,
          link,
          isFinalizado,
          nomeRemetente: config.nomeRemetente,
        });

        const resultado = await enviarEmailResend({
          to: item.destinatario,
          subject: assunto,
          html: corpoHtml,
          text: corpoTexto,
          replyTo: config.emailResposta,
          senderName: config.nomeRemetente,
        });

        if (resultado.success) {
          enviados++;
          detalhes.push(`Ticket ${item.ticket_id} enviado para ${item.destinatario}`);
          await supabase.rpc("mark_email_notification_result", {
            p_id: item.id,
            p_status: "enviado",
            p_erro: null,
          });
        } else {
          falhas++;
          detalhes.push(`Ticket ${item.ticket_id} falhou: ${resultado.error}`);
          await supabase.rpc("mark_email_notification_result", {
            p_id: item.id,
            p_status: "erro",
            p_erro: resultado.error || "Falha no envio",
          });
        }
      }

      return {
        processados: pendentes.length,
        enviados,
        falhas,
        detalhes,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Email Outbox] Exceção no processamento:", msg);
      return { processados: 0, enviados: 0, falhas: 1, erro: msg };
    }
  });

/**
 * Server Function: Dispara um e-mail de teste para o endereço informado
 */
export const enviarEmailTesteServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    return z.object({
      destinatario: z.string().email("Endereço de e-mail inválido"),
    }).parse(input);
  })
  .handler(async ({ data }) => {
    const { destinatario } = data;
    const config = await obterConfigAlertasEmail();

    const link = "https://tisenailrv.app/chamados/1";
    const variaveis = {
      numero: "1",
      titulo: "Chamado de Teste - TI SENAI LRV",
      status: "Em atendimento",
      prioridade: "Média",
      prazo: formatarDataHoraCuiaba(new Date()),
      resposta: "Este é um disparo de teste efetuado a partir do Painel de Ajustes para validar a integração com o serviço de e-mail.",
      link,
    };

    const assunto = `[TESTE] ${compilarTemplate(config.modeloAssunto, variaveis)}`;
    const corpoTexto = compilarTemplate(config.modeloCorpo, variaveis);
    const corpoHtml = gerarEmailHtml({
      numero: "1",
      titulo: variaveis.titulo,
      status: variaveis.status,
      prioridade: variaveis.prioridade,
      prazo: variaveis.prazo,
      resposta: variaveis.resposta,
      link,
      isFinalizado: false,
      nomeRemetente: config.nomeRemetente,
    });

    const res = await enviarEmailResend({
      to: destinatario,
      subject: assunto,
      html: corpoHtml,
      text: corpoTexto,
      replyTo: config.emailResposta,
      senderName: config.nomeRemetente,
    });

    // Registra na tabela de log outbox
    try {
      await supabase.from("notificacoes_email").insert({
        ticket_id: 1,
        destinatario,
        tipo: "teste",
        status: res.success ? "enviado" : "erro",
        tentativas: 1,
        erro_mensagem: res.error || null,
        dados_evento: variaveis,
        agendado_para: new Date().toISOString(),
        enviado_em: res.success ? new Date().toISOString() : null,
      });
    } catch (e) {
      console.warn("Falha ao registrar log de teste na tabela:", e);
    }

    if (!res.success) {
      return {
        sucesso: false,
        erro: res.error || "Não foi possível enviar o e-mail de teste.",
      };
    }

    return {
      sucesso: true,
      mensagem: `E-mail de teste enviado com sucesso para ${destinatario}!`,
      messageId: res.messageId,
    };
  });
