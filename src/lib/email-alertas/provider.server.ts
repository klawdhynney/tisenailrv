/**
 * ============================================================================
 * Provedor Isolado de Envio de E-mails para Alertas (TI SENAI LRV)
 * ============================================================================
 * Este módulo isola completamente a integração de envio de e-mails.
 * Permite alternar entre provedores (Lovable Managed Email, Resend, Simulação)
 * sem necessidade de alterar o restante da aplicação.
 */

import { sendLovableEmail, EmailAPIError } from "@lovable.dev/email-js";

export interface EnvioEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  evento: "aberto" | "atualizado" | "finalizado" | "teste";
  replyTo?: string;
}

export interface EnvioEmailResultado {
  sucesso: boolean;
  messageId?: string;
  erro?: string;
  provedor: "lovable" | "resend" | "simulado";
}

// Configurações do remetente
export const SENDER_NAME = "TI SENAI LRV";
export const SENDER_DOMAIN = "notify.tisenailrv.app"; // Subdomínio verificado delegado
export const FROM_DOMAIN = "tisenailrv.app";          // Domínio institucional exibido
export const DEFAULT_FROM_ADDRESS = "avisos@tisenailrv.app";

/**
 * Função principal de envio.
 * Detecta as credenciais disponíveis no ambiente e despacha pelo melhor provedor.
 */
export async function enviarEmailAlerta(params: EnvioEmailParams): Promise<EnvioEmailResultado> {
  const { to, subject, html, text, idempotencyKey, evento, replyTo } = params;

  // 1. Tenta envio pelo Lovable Managed Email (Cloud -> Emails)
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    try {
      await sendLovableEmail(
        {
          to,
          from: {
            name: SENDER_NAME,
            address: DEFAULT_FROM_ADDRESS,
          },
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text,
          purpose: "transactional",
          label: `alerta_${evento}`,
          idempotency_key: idempotencyKey || crypto.randomUUID(),
          ...(replyTo ? { reply_to: replyTo } : {}),
        },
        { apiKey: lovableKey, sendUrl: process.env.LOVABLE_SEND_URL }
      );

      return {
        sucesso: true,
        messageId: `lovable_${Date.now()}`,
        provedor: "lovable",
      };
    } catch (err: any) {
      if (err instanceof EmailAPIError && err.code === "recipient_suppressed") {
        return {
          sucesso: false,
          erro: "Destinatário suprimido (opt-out ou bounce registrado)",
          provedor: "lovable",
        };
      }
      console.warn("Falha no Lovable Email, verificando provedor alternativo...", err?.message || err);
    }
  }

  // 2. Provedor Alternativo: Resend (se chave estiver configurada em Cloud -> Secrets)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${SENDER_NAME} <${DEFAULT_FROM_ADDRESS}>`,
          to: [to],
          subject,
          html,
          text,
          headers: idempotencyKey ? { "X-Entity-Ref-ID": idempotencyKey } : undefined,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.id) {
        return {
          sucesso: true,
          messageId: json.id,
          provedor: "resend",
        };
      }

      return {
        sucesso: false,
        erro: json?.message || `Erro HTTP ${res.status} ao enviar via Resend`,
        provedor: "resend",
      };
    } catch (err: any) {
      console.warn("Falha ao enviar via Resend:", err?.message || err);
      return {
        sucesso: false,
        erro: err?.message || "Erro de conexão ao despachar via Resend",
        provedor: "resend",
      };
    }
  }

  // 3. Modo Simulado / Registro local (quando sem chaves de envio em ambiente de desenvolvimento)
  return {
    sucesso: true,
    messageId: `simulado_${Date.now()}`,
    provedor: "simulado",
  };
}
