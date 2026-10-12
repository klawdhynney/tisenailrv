/**
 * ============================================================================
 * Modelos de E-mail Responsivos para Alertas de Chamados (TI SENAI LRV)
 * ============================================================================
 * Gera HTML compatível com clientes de e-mail modernos e legados (Gmail, Outlook,
 * Apple Mail, mobile) e versão em texto simples (plain text).
 * Sanitiza e escapa todas as entradas do usuário contra injeção de HTML.
 */

export interface DadosEmailAlerta {
  numero: number | string;
  solicitante?: string;
  setor?: string;
  prioridade?: string;
  status?: string;
  status_anterior?: string;
  local?: string;
  descricao?: string;
  resposta?: string;
  autor_resposta?: string;
  procedimento?: string;
  aberto_em?: string;
  atualizado_em?: string;
  finalizado_em?: string;
  prazo?: string;
}

export interface RenderTemplateOptions {
  evento: "aberto" | "atualizado" | "finalizado" | "teste";
  dados: DadosEmailAlerta;
  nomeRemetente?: string;
  textoRodape?: string;
}

export interface TemplateRenderizado {
  assunto: string;
  html: string;
  text: string;
}

/**
 * Escapa caracteres HTML para prevenir injeção (XSS).
 */
export function escaparHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Trunca texto em tamanho máximo seguro com reticências.
 */
export function truncarTexto(str: string | null | undefined, max = 300): string {
  if (!str) return "";
  const limpo = str.trim();
  if (limpo.length <= max) return limpo;
  return limpo.substring(0, max - 3).trim() + "...";
}

/**
 * Monta o assunto oficial do e-mail.
 */
export function gerarAssuntoEmail(evento: string, dados: DadosEmailAlerta): string {
  const num = dados.numero || "?";
  if (evento === "aberto") {
    return `Chamado #${num} aberto`;
  }
  if (evento === "finalizado") {
    return `Chamado #${num} finalizado`;
  }
  if (evento === "atualizado") {
    const st = dados.status || "Em andamento";
    return `Chamado #${num} atualizado: ${st}`;
  }
  return `Chamado #${num} - Notificação de TI`;
}

/**
 * Renderiza o e-mail completo nos formatos HTML e Plain Text.
 */
export function renderizarEmailAlerta(options: RenderTemplateOptions): TemplateRenderizado {
  const { evento, dados } = options;
  const num = dados.numero || "?";
  const linkChamado = `https://tisenailrv.app/chamados/${num}`;
  const linkMeuCadastro = "https://tisenailrv.app/meu-cadastro";
  const linkLgpd = "https://tisenailrv.app/lgpd";
  const textoRodapeCustom = options.textoRodape || "Você recebeu esta notificação porque é o solicitante cadastrado neste chamado.";

  const assunto = gerarAssuntoEmail(evento, dados);

  // Sanitização de dados do chamado
  const solicitanteEsc = escaparHtml(dados.solicitante || "Solicitante");
  const setorEsc = escaparHtml(dados.setor || "Não informado");
  const prioridadeEsc = escaparHtml(dados.prioridade || "Média");
  const statusEsc = escaparHtml(dados.status || (evento === "finalizado" ? "Finalizado" : "Aberto"));
  const localEsc = escaparHtml(dados.local || "");
  const descricaoEsc = escaparHtml(truncarTexto(dados.descricao, 300));
  const respostaEsc = escaparHtml(truncarTexto(dados.resposta, 300));
  const procedimentoEsc = escaparHtml(truncarTexto(dados.procedimento, 400));
  const autorRespostaEsc = escaparHtml(dados.autor_resposta || "Equipe de TI");
  const prazoEsc = escaparHtml(dados.prazo || "Definido conforme SLA");
  const dataAbertoEsc = escaparHtml(dados.aberto_em || "Hoje");
  const dataAtualizadoEsc = escaparHtml(dados.atualizado_em || "Agora");
  const dataFinalizadoEsc = escaparHtml(dados.finalizado_em || "Agora");

  // Cores por evento
  let corBadge = "#1A73E8"; // Azul
  let rotuloBadge = "Chamado Aberto";
  let badgeFundo = "#E8F0FE";
  let badgeTexto = "#1A73E8";

  if (evento === "atualizado") {
    corBadge = "#D97706";
    rotuloBadge = "Chamado Atualizado";
    badgeFundo = "#FEF3C7";
    badgeTexto = "#92400E";
  } else if (evento === "finalizado") {
    corBadge = "#16A34A";
    rotuloBadge = "Chamado Finalizado";
    badgeFundo = "#DCFCE7";
    badgeTexto = "#15803D";
  } else if (evento === "teste") {
    corBadge = "#9333EA";
    rotuloBadge = "E-mail de Teste";
    badgeFundo = "#F3E8FF";
    badgeTexto = "#6B21A8";
  }

  // Bloco de conteúdo específico do evento
  let blocoEspecificoHtml = "";
  let blocoEspecificoText = "";

  if (evento === "aberto") {
    blocoEspecificoHtml = `
      <div style="background-color: #f8fafc; border-left: 4px solid #1A73E8; padding: 14px 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #1e293b;">Resumo da Solicitação:</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #334155;">${descricaoEsc || "Nenhuma descrição detalhada informada."}</p>
        ${localEsc ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;"><strong>Local / Sala:</strong> ${localEsc}</p>` : ""}
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0;">
        Sua solicitação foi registrada na fila de atendimento da equipe de Tecnologia da Informação do SENAI Lucas do Rio Verde e será triada conforme o prazo de SLA.
      </p>
    `;
    blocoEspecificoText = `Resumo da Solicitação:\n${dados.descricao || "-"}\n\nLocal: ${dados.local || "-"}\n`;
  } else if (evento === "atualizado") {
    blocoEspecificoHtml = `
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #92400e;">Última Atualização da Equipe de TI:</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #78350f;">${respostaEsc || `O chamado teve seu status atualizado para <strong>${statusEsc}</strong>.`}</p>
        ${dados.autor_resposta ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #b45309;">Registrado por: <strong>${autorRespostaEsc}</strong> em ${dataAtualizadoEsc}</p>` : ""}
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0;">
        Acompanhe os detalhes da resposta ou envie uma mensagem diretamente para a equipe pelo painel do chamado.
      </p>
    `;
    blocoEspecificoText = `Última Atualização:\n${dados.resposta || `Status alterado para ${dados.status}`}\nPor: ${dados.autor_resposta || "Equipe de TI"}\n`;
  } else if (evento === "finalizado") {
    blocoEspecificoHtml = `
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 18px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #166534;">Procedimento Realizado:</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #14532d;">${procedimentoEsc || "Atendimento concluído com sucesso pela equipe técnica."}</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #15803d;">Finalizado em: <strong>${dataFinalizadoEsc}</strong></p>
      </div>

      <!-- Card de Destaque para Avaliação -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center; color: #ffffff;">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #ffffff;">Sua opinião é fundamental!</p>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #cbd5e1; line-height: 1.4;">
          Avalie como foi o atendimento do seu chamado em menos de 1 minuto para nos ajudar a aprimorar o suporte.
        </p>
        <a href="${linkChamado}" style="display: inline-block; background-color: #fbbf24; color: #78350f; font-size: 14px; font-weight: 700; text-decoration: none; padding: 10px 22px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          ★ Avaliar Atendimento Agora
        </a>
      </div>
    `;
    blocoEspecificoText = `Procedimento Realizado:\n${dados.procedimento || "Atendimento finalizado com sucesso."}\nData de Conclusão: ${dataFinalizadoEsc}\n\nPor favor, avalie o atendimento acessando:\n${linkChamado}\n`;
  } else {
    // Teste
    blocoEspecificoHtml = `
      <div style="background-color: #faf5ff; border-left: 4px solid #9333ea; padding: 14px 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #581c87;">E-mail de Teste do Administrador</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #6b21a8;">
          Este e-mail valida com sucesso o envio de notificações de chamados a partir do domínio <strong>tisenailrv.app</strong>.
        </p>
      </div>
    `;
    blocoEspecificoText = `E-mail de Teste de Notificações - TI SENAI LRV\nValidação de envio realizada com sucesso.\n`;
  }

  // Template HTML completo
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${assunto}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <div style="max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">

    <!-- Faixa colorida institucional SENAI / Google (Azul, Vermelho, Amarelo, Verde) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="height: 5px;">
      <tr>
        <td width="25%" style="background-color: #1A73E8; height: 5px;"></td>
        <td width="25%" style="background-color: #EA4335; height: 5px;"></td>
        <td width="25%" style="background-color: #FBBC04; height: 5px;"></td>
        <td width="25%" style="background-color: #34A853; height: 5px;"></td>
      </tr>
    </table>

    <!-- Cabeçalho com Logo -->
    <div style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #f1f5f9;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" width="56">
            <img src="https://tisenailrv.app/icone.png" width="44" height="44" alt="TI SENAI LRV" style="display: block; border-radius: 8px; border: 0;" />
          </td>
          <td valign="middle" style="padding-left: 14px;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">TI SENAI LRV</h1>
            <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 500; color: #64748b;">Suporte Técnico e Atendimento de Chamados</p>
          </td>
          <td valign="middle" align="right">
            <span style="display: inline-block; background-color: ${badgeFundo}; color: ${badgeTexto}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
              ${rotuloBadge}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Corpo Principal -->
    <div style="padding: 28px 32px 32px 32px;">
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.5;">
        Olá, <strong>${solicitanteEsc}</strong>!
      </p>

      <!-- Cartão com Dados do Chamado -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 35%;">Número do Chamado:</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a; font-family: monospace; font-size: 15px;">#${num}</td>
        </tr>
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Setor Solicitante:</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${setorEsc}</td>
        </tr>
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Prioridade:</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${prioridadeEsc}</td>
        </tr>
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Status Atual:</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: ${corBadge};">${statusEsc}</td>
        </tr>
        <tr>
          <td style="padding: 10px 16px; color: #64748b;">Prazo Limite (SLA):</td>
          <td style="padding: 10px 16px; font-weight: 600; color: #1e293b;">${prazoEsc}</td>
        </tr>
      </table>

      <!-- Conteúdo Específico do Evento -->
      ${blocoEspecificoHtml}

      <!-- Botão Primário de Ação -->
      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="${linkChamado}" style="display: inline-block; background-color: #1A73E8; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 8px; box-shadow: 0 2px 6px rgba(26, 115, 232, 0.35); text-align: center;">
          Acompanhar Chamado no Portal
        </a>
      </div>
      <p style="text-align: center; font-size: 11px; color: #94a3b8; margin: 8px 0 0 0;">
        (Será necessário estar conectado com sua conta de e-mail institucional)
      </p>
    </div>

    <!-- Rodapé Institucional e LGPD -->
    <div style="padding: 22px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; line-height: 1.6; color: #64748b;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #475569;">
        ⚠️ Mensagem automática. Por favor, não responda a este e-mail.
      </p>
      <p style="margin: 0 0 10px 0;">
        ${textoRodapeCustom} O acompanhamento oficial é realizado exclusivamente através do portal.
      </p>
      <p style="margin: 0; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #94a3b8;">
        Para ajustar suas preferências de notificação, acesse <a href="${linkMeuCadastro}" style="color: #1A73E8; text-decoration: underline;">Meu Cadastro</a>.
        •
        Saiba como tratamos seus dados na <a href="${linkLgpd}" style="color: #1A73E8; text-decoration: underline;">Política de Privacidade (LGPD)</a>.
      </p>
    </div>
  </div>
</body>
</html>`;

  // Versão Texto Simples (Plain Text)
  const text = `TI SENAI LRV - NOTIFICAÇÃO DE SUPORTE
=========================================
${rotuloBadge.toUpperCase()}: Chamado #${num}

Olá, ${dados.solicitante || "Solicitante"}!

DADOS DO CHAMADO:
- Número: #${num}
- Setor: ${dados.setor || "-"}
- Prioridade: ${dados.prioridade || "-"}
- Status: ${dados.status || (evento === "finalizado" ? "Finalizado" : "Aberto")}
- Prazo (SLA): ${dados.prazo || "-"}

${blocoEspecificoText}
Para acompanhar o chamado no portal de suporte:
${linkChamado}

-----------------------------------------
ATENÇÃO: Esta é uma mensagem automática. Não responda a este e-mail.
${textoRodapeCustom}
Gerenciar alertas: ${linkMeuCadastro}
Política de Privacidade: ${linkLgpd}
`;

  return {
    assunto,
    html,
    text,
  };
}
