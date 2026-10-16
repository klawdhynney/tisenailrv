import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { StoreContext } from "./store-context";
import {
  REGRAS_PADRAO,
  IDENTIDADE_VISUAL_PADRAO,
  PAGINA_INICIAL_PADRAO,
  INDICADORES_PADRAO,
  ABRIR_CHAMADO_PADRAO,
  ACOMPANHAMENTO_PADRAO,
  DASHBOARD_PADRAO,
  RODAPE_PADRAO,
  LGPD_PADRAO,
  SOBRE_PADRAO,
  AVALIACAO_PADRAO,
  AVALIACAO_RESUMO_PUBLICO_PADRAO,
  type AvaliacaoResumoPublico,
  IA_SUPORTE_PADRAO,
  PROMPT_SUGERIR_RESPOSTA_PADRAO,
  PROMPT_APRIMORAR_TEXTO_PADRAO,
  PROMPT_SUGERIR_ABERTURA_PADRAO,
  WHATSAPP_PADRAO,
  ALERTAS_EMAIL_SOLICITANTE_PADRAO,
  MOTIVOS_PAUSA_SLA_PADRAO,
  MENU_PADRAO,
  CHAT_PADRAO,
  LOGIN_PADRAO,
  SEO_PADRAO,
  ATENDIMENTO_PADRAO,
  COLUNAS_ATENDIMENTO_PADRAO,
  MEUS_CHAMADOS_PADRAO,
  type ConfiguracaoHistoricoItem,
  type AvaliacaoItemDashboard,
  type Regras,
  type Ticket,
  type Prioridade,
  type Status,
  type PapelUsuario,
  type UsuarioCadastro,
  obterDataHojeCuiaba,
} from "./types";
import { aplicarCoresCustomizadasNoDocumento } from "./tema";
import { buscarAvaliacoesCompletas, sincronizarAvaliacoesComBanco } from "./evaluations-service";
import { processarFilaAlertasServerFn } from "@/lib/email-alertas/processor.server";

type Row = Database["public"]["Tables"]["tickets"]["Row"];

function mesclarComPadroes(regrasSalvas: Partial<Regras>): Regras {
  const dashSalvo = regrasSalvas.dashboard || {};
  const tipoPadrao = (dashSalvo.tipoGraficoPadrao as any) === "gauge" || (dashSalvo.tipoGraficoPadrao as any) === "combinado"
    ? "kpi"
    : dashSalvo.tipoGraficoPadrao || DASHBOARD_PADRAO.tipoGraficoPadrao;

  // Sanitiza capa legada se contiver base64 antigo ou apontamento desatualizado
  const paginaInicialSalva = { ...regrasSalvas.paginaInicial };
  if (
    paginaInicialSalva.bannerUrl &&
    (paginaInicialSalva.bannerUrl.includes("iVBORw0KGgoAAAANSUhEUgAACAAAAAMACAIAAAA/whCdA") ||
      paginaInicialSalva.bannerUrl.includes("senai-") ||
      paginaInicialSalva.bannerUrl === "/capa.png")
  ) {
    paginaInicialSalva.bannerUrl = "/capa.webp";
  }

  // Sanitiza identidade visual se apontar para arquivos legados
  const identSalva = { ...regrasSalvas.identidadeVisual };
  if (
    identSalva.logoUrl &&
    (identSalva.logoUrl.includes("senai-") || identSalva.logoUrl.endsWith(".jpg"))
  ) {
    identSalva.logoUrl = "/icone.png";
  }
  if (
    identSalva.faviconUrl &&
    (identSalva.faviconUrl.includes("senai-") || identSalva.faviconUrl.endsWith(".jpg"))
  ) {
    identSalva.faviconUrl = "/favicon.png";
  }

  // Atualiza IA de suporte garantindo estrutura em 3 abas e retrocompatibilidade
  const iaSuporteSalva = ((regrasSalvas.iaSuporte || {}) as any);

  const respostaAtendimento = {
    ...IA_SUPORTE_PADRAO.respostaAtendimento,
    ...(iaSuporteSalva.respostaAtendimento || {}),
    prompt: iaSuporteSalva.respostaAtendimento?.prompt || iaSuporteSalva.promptSistema || PROMPT_SUGERIR_RESPOSTA_PADRAO,
    maxTokens: Number(iaSuporteSalva.respostaAtendimento?.maxTokens || iaSuporteSalva.maxTokensResposta) || 150,
    temperatura: typeof iaSuporteSalva.respostaAtendimento?.temperatura === "number"
      ? iaSuporteSalva.respostaAtendimento.temperatura
      : (typeof iaSuporteSalva.temperatura === "number" ? iaSuporteSalva.temperatura : 0.2),
    usarChamadosResolvidos: iaSuporteSalva.respostaAtendimento?.usarChamadosResolvidos ?? iaSuporteSalva.usarChamadosResolvidos ?? true,
    maxExemplosResolvidos: Math.min(5, Math.max(1, Number(iaSuporteSalva.respostaAtendimento?.maxExemplosResolvidos || iaSuporteSalva.maxExemplosResolvidos) || 5)),
  };

  const aprimorarTexto = {
    ...IA_SUPORTE_PADRAO.aprimorarTexto,
    ...(iaSuporteSalva.aprimorarTexto || {}),
    prompt: iaSuporteSalva.aprimorarTexto?.prompt || PROMPT_APRIMORAR_TEXTO_PADRAO,
    maxTokens: Number(iaSuporteSalva.aprimorarTexto?.maxTokens || iaSuporteSalva.maxTokensAprimoramento) || 150,
    temperatura: typeof iaSuporteSalva.aprimorarTexto?.temperatura === "number"
      ? iaSuporteSalva.aprimorarTexto.temperatura
      : 0.2,
  };

  const sugerirAbertura = {
    ...IA_SUPORTE_PADRAO.sugerirAbertura,
    ...(iaSuporteSalva.sugerirAbertura || {}),
    prompt: iaSuporteSalva.sugerirAbertura?.prompt || PROMPT_SUGERIR_ABERTURA_PADRAO,
    maxTokens: Number(iaSuporteSalva.sugerirAbertura?.maxTokens) || 100,
    temperatura: typeof iaSuporteSalva.sugerirAbertura?.temperatura === "number"
      ? iaSuporteSalva.sugerirAbertura.temperatura
      : 0.2,
  };

  const iaSuporteFinal = {
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

  return {
    ...REGRAS_PADRAO,
    ...regrasSalvas,
    prazos: { ...REGRAS_PADRAO.prazos, ...(regrasSalvas.prazos || {}) },
    expediente: { ...REGRAS_PADRAO.expediente, ...(regrasSalvas.expediente || {}) },
    motivosPausaSla: regrasSalvas.motivosPausaSla ?? [...MOTIVOS_PAUSA_SLA_PADRAO],
    identidadeVisual: { ...IDENTIDADE_VISUAL_PADRAO, ...identSalva },
    paginaInicial: { ...PAGINA_INICIAL_PADRAO, ...paginaInicialSalva },
    indicadores: {
      total: { ...INDICADORES_PADRAO.total, ...(regrasSalvas.indicadores?.total || {}) },
      atendimento: { ...INDICADORES_PADRAO.atendimento, ...(regrasSalvas.indicadores?.atendimento || {}) },
      resolvidos: { ...INDICADORES_PADRAO.resolvidos, ...(regrasSalvas.indicadores?.resolvidos || {}) },
    },
    abrirChamado: { ...ABRIR_CHAMADO_PADRAO, ...(regrasSalvas.abrirChamado || {}) },
    acompanhamento: { ...ACOMPANHAMENTO_PADRAO, ...(regrasSalvas.acompanhamento || {}) },
    dashboard: {
      ...DASHBOARD_PADRAO,
      ...dashSalvo,
      tipoGraficoPadrao: tipoPadrao,
      graficosAtivos: { ...DASHBOARD_PADRAO.graficosAtivos, ...(dashSalvo.graficosAtivos || {}) },
      ordemGraficos: dashSalvo.ordemGraficos || DASHBOARD_PADRAO.ordemGraficos,
      titulosGraficos: { ...DASHBOARD_PADRAO.titulosGraficos, ...(dashSalvo.titulosGraficos || {}) },
      descricoesGraficos: { ...DASHBOARD_PADRAO.descricoesGraficos, ...(dashSalvo.descricoesGraficos || {}) },
    },
    rodape: { ...RODAPE_PADRAO, ...(regrasSalvas.rodape || {}) },
    lgpd: { ...LGPD_PADRAO, ...(regrasSalvas.lgpd || {}) },
    avaliacoes: { ...AVALIACAO_PADRAO, ...(regrasSalvas.avaliacoes || {}) },
    iaSuporte: { ...IA_SUPORTE_PADRAO, ...iaSuporteFinal },
    whatsapp: { ...WHATSAPP_PADRAO, ...(regrasSalvas.whatsapp || {}) },
    menu: (() => {
      const padrao = [...MENU_PADRAO];
      if (!Array.isArray(regrasSalvas.menu) || regrasSalvas.menu.length === 0) return padrao;
      let salvos = [...regrasSalvas.menu];
      const temAcomp = salvos.some((m) => m.id === "acompanhamento");
      if (!temAcomp) {
        const idxAbrir = salvos.findIndex((m) => m.id === "abrir");
        const acompItem = padrao.find((m) => m.id === "acompanhamento") || {
          id: "acompanhamento",
          label: "Acompanhar Chamados",
          to: "/dashboard/acompanhamento",
          visivel: true,
          ordem: 3,
        };
        if (idxAbrir !== -1) {
          salvos.splice(idxAbrir + 1, 0, acompItem);
        } else {
          salvos.push(acompItem);
        }
        salvos = salvos.map((item, idx) => ({ ...item, ordem: idx + 1 }));
      }
      for (const itemPadrao of padrao) {
        const existe = salvos.find((m) => m.id === itemPadrao.id);
        if (!existe) {
          salvos.push(itemPadrao);
        } else if (itemPadrao.exigeGestor) {
          existe.exigeGestor = true;
        }
      }
      return salvos;
    })(),
    login: { ...LOGIN_PADRAO, ...(regrasSalvas.login || {}) },
    seo: { ...SEO_PADRAO, ...(regrasSalvas.seo || {}) },
    atendimento: {
      ...ATENDIMENTO_PADRAO,
      ...(regrasSalvas.atendimento || {}),
      colunas:
        Array.isArray(regrasSalvas.atendimento?.colunas) && regrasSalvas.atendimento.colunas.length > 0
          ? regrasSalvas.atendimento.colunas.map((col) =>
              col.id === "slaPrazo" && (col.label === "SLA / Prazo" || col.label === "SLA / PRAZO")
                ? { ...col, label: "SLA" }
                : col
            )
          : [...COLUNAS_ATENDIMENTO_PADRAO],
      botoesStatusVisiveis:
        Array.isArray(regrasSalvas.atendimento?.botoesStatusVisiveis) &&
        regrasSalvas.atendimento.botoesStatusVisiveis.length > 0
          ? regrasSalvas.atendimento.botoesStatusVisiveis
          : [...(ATENDIMENTO_PADRAO.botoesStatusVisiveis || [])],
    },
    meusChamados: { ...MEUS_CHAMADOS_PADRAO, ...(regrasSalvas.meusChamados || {}) },
    alertasEmailSolicitante: {
      ...ALERTAS_EMAIL_SOLICITANTE_PADRAO,
      ...(regrasSalvas.alertasEmailSolicitante || {}),
      eventos: {
        ...ALERTAS_EMAIL_SOLICITANTE_PADRAO.eventos,
        ...(regrasSalvas.alertasEmailSolicitante?.eventos || {}),
      },
    },
    temaConfig: {
      ...(REGRAS_PADRAO.temaConfig ?? {
        modoPadrao: "auto",
        paletaAtiva: "padrao",
        paletaPersonalizada: {
          corPrimaria: "#1A73E8",
          corSucesso: "#34A853",
          corAlerta: "#FBBC04",
          corPerigo: "#EA4335",
          corNeutra: "#1F2430",
        },
      }),
      ...(regrasSalvas.temaConfig || {}),
      paletaPersonalizada: {
        ...(REGRAS_PADRAO.temaConfig?.paletaPersonalizada ?? {
          corPrimaria: "#1A73E8",
          corSucesso: "#34A853",
          corAlerta: "#FBBC04",
          corPerigo: "#EA4335",
          corNeutra: "#1F2430",
        }),
        ...(regrasSalvas.temaConfig?.paletaPersonalizada || {}),
      },
    },
    coresBotoes: {
      claro: {
        ...(REGRAS_PADRAO.coresBotoes?.claro ?? {}),
        ...(regrasSalvas.coresBotoes?.claro || {}),
      },
      escuro: {
        ...(REGRAS_PADRAO.coresBotoes?.escuro ?? {}),
        ...(regrasSalvas.coresBotoes?.escuro || {}),
      },
    },
    coresSite: {
      claro: {
        ...(REGRAS_PADRAO.coresSite?.claro ?? {}),
        ...(regrasSalvas.coresSite?.claro || {}),
      },
      escuro: {
        ...(REGRAS_PADRAO.coresSite?.escuro ?? {}),
        ...(regrasSalvas.coresSite?.escuro || {}),
      },
    },
  };
}

export function fromRow(r: Row): Ticket {
  return {
    id: r.id,
    abertoEm: r.aberto_em,
    hora: r.hora,
    solicitante: r.solicitante || "Solicitante",
    solicitanteEmail: r.solicitante_email || null,
    solicitanteId: (r as any).solicitante_id || null,
    setor: r.setor || "",
    local: r.local || "",
    descricao: r.descricao || "",
    categoria: r.categoria ?? "Geral",
    prioridade: (r.prioridade as Prioridade) || "Média",
    responsavel: r.responsavel || null,
    status: (r.status as Status) || "Aberto",
    fechadoEm: r.fechado_em || null,
    horario: r.horario || null,
    procedimento: r.procedimento || null,
    contato: r.contato || null,
    slaReiniciadoEm: r.sla_reiniciado_em || null,
    slaPausado: Boolean((r as any).sla_pausado),
    slaPausadoEm: (r as any).sla_pausado_em || null,
    slaPausaMotivo: (r as any).sla_pausa_motivo || null,
    slaPausaAutor: (r as any).sla_pausa_autor || null,
    slaHistoricoPausas: Array.isArray((r as any).sla_historico_pausas) ? (r as any).sla_historico_pausas : [],
    slaSegundosPausadosAcumulados: Number((r as any).sla_segundos_pausados_acumulados) || 0,
  };
}

function toRow(p: Partial<Ticket>) {
  const m: Record<string, unknown> = {};
  const map: Record<string, string> = {
    abertoEm: "aberto_em", hora: "hora", solicitante: "solicitante", solicitanteEmail: "solicitante_email", solicitanteId: "solicitante_id", setor: "setor", local: "local",
    descricao: "descricao", categoria: "categoria", prioridade: "prioridade", responsavel: "responsavel",
    status: "status", fechadoEm: "fechado_em", horario: "horario", procedimento: "procedimento",
    contato: "contato", slaReiniciadoEm: "sla_reiniciado_em",
    slaPausado: "sla_pausado", slaPausadoEm: "sla_pausado_em", slaPausaMotivo: "sla_pausa_motivo",
    slaPausaAutor: "sla_pausa_autor", slaHistoricoPausas: "sla_historico_pausas",
    slaSegundosPausadosAcumulados: "sla_segundos_pausados_acumulados",
  };
  for (const [k, v] of Object.entries(p)) {
    const col = map[k];
    if (col) m[col] = v === undefined ? null : v;
  }
  return m;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [publicStats, setPublicStats] = useState<Database["public"]["Tables"]["ticket_public_stats"]["Row"][]>([]);
  const [dailyStats, setDailyStats] = useState<{ chamadosDoDia: number; atendidosNoDia: number }>({
    chamadosDoDia: 0,
    atendidosNoDia: 0,
  });
  const [evaluationStats, setEvaluationStats] = useState<AvaliacaoResumoPublico>(AVALIACAO_RESUMO_PUBLICO_PADRAO);
  const [evaluationError, setEvaluationError] = useState(false);
  const [evaluationLoading, setEvaluationLoading] = useState(true);
  const [avaliacoesList, setAvaliacoesList] = useState<AvaliacaoItemDashboard[]>([]);
  const [regras, setRegrasState] = useState<Regras>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tisenai_regras_cache");
        if (cached) {
          return mesclarComPadroes(JSON.parse(cached));
        }
      } catch {}
    }
    return REGRAS_PADRAO;
  });
  const [hidratado, setHidratado] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isGestor, setIsGestor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<PapelUsuario>("usuario");
  const [userBlocked, setUserBlocked] = useState(false);
  const [authPronto, setAuthPronto] = useState(false);
  const [perfilUsuario, setPerfilUsuario] = useState<UsuarioCadastro | null>(null);

  // Sessão
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data: d }) => setSession(d.session));
    return () => data.subscription.unsubscribe();
  }, []);

  // Papel e sincronização do usuário com paralelismo total e cache rápido
  useEffect(() => {
    let ativo = true;
    const uid = session?.user.id;
    if (!uid) {
      setIsGestor(false);
      setIsAdmin(false);
      setUserRole("usuario");
      setUserBlocked(false);
      setAuthPronto(true);
      return;
    }

    const cacheChave = `auth_perm_cache_${uid}`;
    // Restauração imediata de cache para carregamento instantâneo
    try {
      const salvo = sessionStorage.getItem(cacheChave);
      if (salvo) {
        const p = JSON.parse(salvo);
        if (p && typeof p === "object") {
          setIsAdmin(Boolean(p.isAdmin));
          setIsGestor(Boolean(p.isGestor));
          setUserRole(p.userRole || "usuario");
          setUserBlocked(Boolean(p.userBlocked));
          setAuthPronto(true);
        }
      }
    } catch {}

    (async () => {
      // Executa todas as checagens e sincronizações em paralelo absoluto
      const [, , adminRes, gestorRes, profileRes] = await Promise.allSettled([
        supabase.rpc("sync_user_profile"),
        supabase.rpc("claim_manager_access"),
        supabase.rpc("is_admin"),
        supabase.rpc("is_named_manager"),
        supabase.from("user_profiles").select("*" as any).eq("id", uid).maybeSingle(),
      ]);

      if (!ativo) return;

      const profileData = profileRes.status === "fulfilled" ? profileRes.value.data : null;
      const isBloqueado = profileData?.bloqueado === true || (profileData as any)?.status === "inativo";

      const adminVal = adminRes.status === "fulfilled" ? adminRes.value.data : false;
      const gestorVal = gestorRes.status === "fulfilled" ? gestorRes.value.data : false;

      const eAdmin = adminVal === true;
      const eGestor = eAdmin || gestorVal === true;
      const papelFinal: PapelUsuario = eAdmin ? "admin" : eGestor ? "gestor" : "usuario";

      setUserBlocked(isBloqueado);
      setIsAdmin(isBloqueado ? false : eAdmin);
      setIsGestor(isBloqueado ? false : eGestor);
      setUserRole(isBloqueado ? "usuario" : papelFinal);
      setAuthPronto(true);

      const emailNormalizado = (session?.user.email || (profileData as any)?.email || "").toLowerCase().trim();
      const nomePadrao = session?.user.user_metadata?.full_name || session?.user.user_metadata?.name || emailNormalizado.split("@")[0] || "Usuário";
      setPerfilUsuario({
        id: uid,
        email: emailNormalizado,
        nome: (profileData as any)?.nome || nomePadrao,
        fotoUrl: (profileData as any)?.foto_url || session?.user.user_metadata?.avatar_url || null,
        setor: (profileData as any)?.setor || "Pendente",
        cargo: (profileData as any)?.cargo || null,
        telefone: (profileData as any)?.telefone || null,
        localPadrao: (profileData as any)?.local_padrao || null,
        matricula: (profileData as any)?.matricula || null,
        status: ((profileData as any)?.status as "ativo" | "inativo") || (isBloqueado ? "inativo" : "ativo"),
        bloqueado: isBloqueado,
        role: papelFinal,
        ultimoAcesso: (profileData as any)?.ultimo_acesso || null,
        createdAt: (profileData as any)?.created_at || session?.user.created_at,
        updatedAt: (profileData as any)?.updated_at,
      });

      try {
        sessionStorage.setItem(
          cacheChave,
          JSON.stringify({ isAdmin: eAdmin, isGestor: eGestor, userRole: papelFinal, userBlocked: isBloqueado })
        );
      } catch {}
    })();

    return () => {
      ativo = false;
    };
  }, [session?.user.id, session?.user.email, session?.user.app_metadata?.provider]);

  const recarregarDailyStats = useCallback(async () => {
    const hojeCuiaba = obterDataHojeCuiaba();
    try {
      // 1. Tenta a função segura agregada pública get_public_daily_stats
      const { data, error } = await supabase.rpc("get_public_daily_stats");
      if (!error && Array.isArray(data) && data.length > 0) {
        const item = data[0] as any;
        setDailyStats({
          chamadosDoDia: Number(item.chamados_do_dia ?? 0),
          atendidosNoDia: Number(item.atendidos_no_dia ?? 0),
        });
        return;
      }
    } catch {
      // continua para o fallback
    }

    try {
      // 2. Fallback via public_ticket_progress
      const { data: progressData, error: progErr } = await supabase.rpc("public_ticket_progress");
      if (!progErr && Array.isArray(progressData)) {
        const abertosHoje = progressData.filter((t: any) => t.aberto_em === hojeCuiaba).length;
        const atendidosHoje = progressData.filter(
          (t: any) => (t.status === "Resolvido" || t.status === "Concluído") && t.fechado_em === hojeCuiaba
        ).length;
        setDailyStats({
          chamadosDoDia: abertosHoje,
          atendidosNoDia: atendidosHoje,
        });
      }
    } catch {
      // silencia erro se não autenticado ou indisponível
    }
  }, []);

  useEffect(() => {
    const carregar = () => {
      supabase.from("ticket_public_stats").select("*").then(({ data }) => setPublicStats(data ?? []));
      recarregarDailyStats();
    };
    carregar();
    const channel = supabase.channel("public-stats-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_public_stats" }, carregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, carregar)
      .subscribe();

    // Timer de 30 segundos para atualizar diário e processar alertas da fila
    const intervaloDia = setInterval(() => {
      recarregarDailyStats();
      void processarFilaAlertasServerFn({ data: { authToken: session?.access_token } }).catch(() => {});
    }, 30000);

    // Processa pendências da fila logo na conexão inicial
    void processarFilaAlertasServerFn({ data: { authToken: session?.access_token } }).catch(() => {});

    return () => {
      clearInterval(intervaloDia);
      supabase.removeChannel(channel);
    };
  }, [recarregarDailyStats, session?.access_token]);

  // Estatísticas agregadas e lista unificada de avaliações (públicas e anônimas)
  const recarregarEvaluationStats = useCallback(async () => {
    setEvaluationLoading(true);
    setEvaluationError(false);
    try {
      const res = await buscarAvaliacoesCompletas();
      setAvaliacoesList(res.itens);
      setEvaluationStats(res.resumo);
      if (res.erro && res.itens.length === 0) {
        console.error("Falha ao consultar avaliações do sistema:", res.erro);
        setEvaluationError(true);
      }
    } catch (err) {
      console.error("Erro inesperado ao recarregar estatísticas de avaliação:", err);
      setEvaluationError(true);
    } finally {
      setEvaluationLoading(false);
    }
  }, []);

  const sincronizarAvaliacoes = useCallback(async () => {
    const res = await sincronizarAvaliacoesComBanco(isGestor || isAdmin);
    await recarregarEvaluationStats();
    return res;
  }, [isGestor, isAdmin, recarregarEvaluationStats]);

  useEffect(() => {
    recarregarEvaluationStats();
    const ch = supabase
      .channel("avaliacoes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "avaliacoes_chamados" }, () => {
        recarregarEvaluationStats();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [recarregarEvaluationStats]);

  // Sincronização automática em segundo plano quando gestor/admin conecta
  useEffect(() => {
    if (authPronto && (isGestor || isAdmin)) {
      sincronizarAvaliacoesComBanco(true)
        .then((res) => {
          if (res.sincronizados > 0) {
            console.info("Sincronização de avaliações realizada:", res.mensagem);
            recarregarEvaluationStats();
          }
        })
        .catch((err) => {
          console.warn("Sincronização automática em segundo plano:", err);
        });
    }
  }, [authPronto, isGestor, isAdmin, recarregarEvaluationStats]);

  // Regras (públicas) + tempo real com cache local síncrono
  useEffect(() => {
    const carregar = () =>
      supabase.from("configuracoes").select("regras").eq("id", 1).maybeSingle().then(({ data }) => {
        const merged = data?.regras && typeof data.regras === "object"
          ? mesclarComPadroes(data.regras as unknown as Partial<Regras>)
          : mesclarComPadroes({});
        setRegrasState(merged);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("tisenai_regras_cache", JSON.stringify(merged));
            const isDark = document.documentElement.classList.contains("dark");
            aplicarCoresCustomizadasNoDocumento(document.documentElement, isDark, merged.coresBotoes, merged.coresSite);
          } catch {}
        }
      });
    carregar();
    const ch = supabase
      .channel("regras-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "configuracoes" }, carregar)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Chamados (somente gestor) + tempo real
  useEffect(() => {
    if (!isGestor) {
      setTickets([]);
      setHidratado(authPronto);
      return;
    }
     const carregar = async () => {
       const all: Row[] = [];
       for (let offset = 0; ; offset += 1000) {
         const { data, error } = await supabase.from("tickets").select("*").order("id").range(offset, offset + 999);
         if (error) { console.error("Falha ao carregar chamados", error.message); break; }
         all.push(...(data ?? []));
         if (!data || data.length < 1000) break;
       }
       setTickets(all.map(fromRow));
       setHidratado(true);
     };
    carregar();
    const ch = supabase
      .channel("tickets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, carregar)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isGestor, authPronto]);

  const addTicket = useCallback(async (t: Omit<Ticket, "id">, email: string) => {
    const emailLimpo = email.trim().toLowerCase();
    const contatoLimpo = (t.contato ?? "").trim().slice(0, 120);

    // 1. Tenta via RPC segura de abertura com recibo
    try {
      const { data, error } = await supabase.rpc("open_public_ticket_with_receipt", {
        p_solicitante: t.solicitante.trim().slice(0, 120),
        p_email: emailLimpo,
        p_contato: contatoLimpo,
        p_setor: t.setor.trim().slice(0, 120),
        p_local: (t.local ?? "").trim().slice(0, 240),
        p_categoria: (t.categoria ?? "Geral").trim().slice(0, 120),
        p_descricao: t.descricao.trim().slice(0, 3000),
      });

      if (!error && typeof data === "number") {
        void processarFilaAlertasServerFn({ data: { authToken: session?.access_token } }).catch(() => {});
        return data;
      }
      if (error) {
        console.warn("RPC open_public_ticket_with_receipt indisponível ou falhou, tentando fallback direto:", error.message);
      }
    } catch (e) {
      console.warn("Erro ao invocar RPC open_public_ticket_with_receipt:", e);
    }

    // 2. Fallback: inserção direta autenticada na tabela de chamados
    try {
      const { data: insertData, error: insertError } = await supabase
        .from("tickets")
        .insert({
          solicitante: t.solicitante.trim().slice(0, 120),
          solicitante_email: emailLimpo,
          solicitante_id: session?.user?.id || null,
          contato: contatoLimpo,
          setor: t.setor.trim().slice(0, 120),
          local: (t.local ?? "").trim().slice(0, 240),
          categoria: (t.categoria ?? "Geral").trim().slice(0, 120),
          descricao: t.descricao.trim().slice(0, 3000),
          prioridade: "Média",
          status: "Aberto",
          criado_por: session?.user?.id || null,
        })
        .select("id")
        .maybeSingle();

      if (insertError) {
        console.error("Falha ao registrar chamado no fallback:", insertError.message);
        return null;
      }

      if (insertData?.id) {
        void processarFilaAlertasServerFn({ data: { authToken: session?.access_token } }).catch(() => {});
      }

      return insertData?.id ?? null;
    } catch (err) {
      console.error("Erro fatal ao salvar chamado:", err);
      return null;
    }
  }, [session?.user?.id, session?.access_token]);

   const updateTicket = useCallback(async (id: number, patch: Partial<Ticket>) => {
     // Regra de imutabilidade estrita: Chamados finalizados ou cancelados não podem ser alterados
     // por nenhum perfil (solicitante, gestor ou administrador)
     const ticketAtualMemoria = tickets.find((t) => t.id === id);
     if (ticketAtualMemoria && ["Resolvido", "Finalizado", "Cancelado"].includes(ticketAtualMemoria.status)) {
       toast.error(`Chamado #${id} está ${ticketAtualMemoria.status} e não permite alterações.`);
       return false;
     }

     // Se o chamado não estiver na memória, consulta status no banco
     if (!ticketAtualMemoria) {
       const { data: ticketDb } = await supabase.from("tickets").select("status").eq("id", id).maybeSingle();
       if (ticketDb && ["Resolvido", "Finalizado", "Cancelado"].includes(ticketDb.status)) {
         toast.error(`Chamado #${id} está ${ticketDb.status} e não permite alterações.`);
         return false;
       }
     }

     const row = toRow(patch);
     let { error } = await supabase.from("tickets").update(row as never).eq("id", id);

     // Se o banco falhar porque uma coluna específica não existe no schema ainda (ex: colunas de SLA):
     if (
       error &&
       (error.code === "42703" ||
         error.message.toLowerCase().includes("does not exist") ||
         error.message.toLowerCase().includes("column"))
     ) {
       console.warn("Coluna não encontrada na tabela tickets, retentando update com colunas essenciais:", error.message);
       const colunasBase = [
         "status",
         "fechado_em",
         "horario",
         "procedimento",
         "responsavel",
         "solicitante",
         "solicitante_email",
         "setor",
         "local",
         "descricao",
         "categoria",
         "prioridade",
         "contato",
         "sla_reiniciado_em",
       ];
       const rowFiltrada: Record<string, unknown> = {};
       for (const k of colunasBase) {
         if (k in row) rowFiltrada[k] = row[k];
       }
       const resRetry = await supabase.from("tickets").update(rowFiltrada as never).eq("id", id);
       error = resRetry.error;
     }

     if (error) {
       if (error.message.toLowerCase().includes("finalizados ou cancelados") || error.message.toLowerCase().includes("não podem ser alterados")) {
         toast.error("Chamados finalizados ou cancelados não podem ser alterados.");
       } else {
         console.error("Falha ao atualizar chamado no Supabase:", error.message);
       }
       return false;
     }

     void processarFilaAlertasServerFn({ data: { authToken: session?.access_token } }).catch(() => {});
     setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
     return true;
   }, [tickets, session?.access_token]);

   const removeTicket = useCallback(async (id: number) => {
     const { error } = await supabase.from("tickets").delete().eq("id", id);
     if (error) { console.error(error); return false; }
     setTickets((prev) => prev.filter((t) => t.id !== id));
     return true;
  }, []);

   const setRegras = useCallback(
     async (
       r: Regras,
       mudancasHistorico?: { secao: string; chave: string; descricao?: string; anterior: any; novo: any }[],
     ) => {
       const merged = mesclarComPadroes(r);
       const { error } = await supabase
         .from("configuracoes")
         .upsert({ id: 1, regras: merged as never, updated_at: new Date().toISOString() });
       if (error) { console.error(error); return false; }
       setRegrasState(merged);
       if (typeof window !== "undefined") {
         try {
           localStorage.setItem("tisenai_regras_cache", JSON.stringify(merged));
         } catch {}
       }

       // Registrar no histórico de alterações se fornecido
       if (mudancasHistorico && mudancasHistorico.length > 0) {
         const userEmail = session?.user?.email || "admin@tisenailrv.app";
         const userName =
           session?.user?.user_metadata?.full_name ||
           session?.user?.user_metadata?.name ||
           userEmail.split("@")[0];

         for (const m of mudancasHistorico) {
           try {
             await supabase.from("configuracao_historico").insert({
               secao: m.secao,
               chave: m.chave,
               descricao: m.descricao || `Alteração em ${m.secao}`,
               valor_anterior: m.anterior,
               valor_novo: m.novo,
               alterado_por_email: userEmail,
               alterado_por_nome: userName,
             } as any);
           } catch (e) {
             console.warn("Aviso ao registrar histórico de configuração:", e);
           }
         }
       }

       return true;
     },
     [session],
   );

   const carregarHistoricoConfig = useCallback(async (): Promise<ConfiguracaoHistoricoItem[]> => {
     try {
       const { data, error } = await supabase
         .from("configuracao_historico")
         .select("*")
         .order("criado_em", { ascending: false })
         .limit(50);
       if (error || !data) return [];
       return data.map((d: any) => ({
         id: Number(d.id),
         secao: d.secao,
         chave: d.chave,
         descricao: d.descricao,
         valorAnterior: d.valor_anterior,
         valorNovo: d.valor_novo,
         alteradoPorEmail: d.alterado_por_email,
         alteradoPorNome: d.alterado_por_nome,
         criadoEm: d.criado_em,
       }));
     } catch {
       return [];
     }
   }, []);

   const desfazerAlteracaoConfig = useCallback(async (historicoId: number) => {
     try {
       const { data: item, error } = await supabase
         .from("configuracao_historico")
         .select("*")
         .eq("id", historicoId)
         .maybeSingle();

       if (error || !item) {
         console.error("Histórico não localizado:", error);
         return false;
       }

       const secao = item.secao as keyof Regras;
       const chave = item.chave;
       const valorAnterior = item.valor_anterior;

       const r = { ...regras };
       if (chave && secao && typeof (r as any)[secao] === "object" && !Array.isArray((r as any)[secao])) {
         (r as any)[secao] = {
           ...(r as any)[secao],
           [chave]: valorAnterior,
         };
       } else if (secao) {
         (r as any)[secao] = valorAnterior;
       }

       return await setRegras(r, [
         {
           secao: item.secao,
           chave: item.chave,
           descricao: `Desfazer alteração #${item.id}`,
           anterior: item.valor_novo,
           novo: item.valor_anterior,
         },
       ]);
     } catch (e) {
       console.error("Erro ao desfazer alteração:", e);
       return false;
     }
   }, [regras, setRegras]);


  const carregarPerfilUsuario = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) {
      setPerfilUsuario(null);
      return;
    }
    try {
      const { data: pData } = await supabase
        .from("user_profiles")
        .select("*" as any)
        .eq("id", uid)
        .maybeSingle();

      const email = session?.user?.email || (pData as any)?.email || "";
      const nomePadrao = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || email.split("@")[0] || "Usuário";
      const isBloq = (pData as any)?.bloqueado === true || (pData as any)?.status === "inativo";

      setPerfilUsuario({
        id: uid,
        email,
        nome: (pData as any)?.nome || nomePadrao,
        fotoUrl: (pData as any)?.foto_url || session?.user?.user_metadata?.avatar_url || null,
        setor: (pData as any)?.setor || "Pendente",
        cargo: (pData as any)?.cargo || null,
        telefone: (pData as any)?.telefone || null,
        localPadrao: (pData as any)?.local_padrao || null,
        matricula: (pData as any)?.matricula || null,
        alertaEmailAberto: (pData as any)?.alerta_email_aberto !== false,
        alertaEmailAtualizado: (pData as any)?.alerta_email_atualizado !== false,
        alertaEmailFinalizado: (pData as any)?.alerta_email_finalizado !== false,
        status: ((pData as any)?.status as "ativo" | "inativo") || (isBloq ? "inativo" : "ativo"),
        bloqueado: isBloq,
        role: userRole,
        ultimoAcesso: (pData as any)?.ultimo_acesso || null,
        createdAt: (pData as any)?.created_at || session?.user?.created_at,
        updatedAt: (pData as any)?.updated_at,
      });
    } catch {
      if (session?.user) {
        setPerfilUsuario({
          id: uid,
          email: session.user.email || "",
          nome: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Usuário",
          fotoUrl: session.user.user_metadata?.avatar_url || null,
          setor: "Pendente",
          alertaEmailAberto: true,
          alertaEmailAtualizado: true,
          alertaEmailFinalizado: true,
          status: "ativo",
          bloqueado: false,
          role: userRole,
          createdAt: session.user.created_at,
        });
      }
    }
  }, [session?.user, userRole]);

  const atualizarPreferenciasAlertaEmail = useCallback(async (prefs: {
    aberto: boolean;
    atualizado: boolean;
    finalizado: boolean;
  }) => {
    const uid = session?.user?.id;
    if (!uid) return false;
    try {
      const { error: rpcErr } = await supabase.rpc("update_my_email_alert_preferences", {
        p_aberto: prefs.aberto,
        p_atualizado: prefs.atualizado,
        p_finalizado: prefs.finalizado,
      } as any);

      if (rpcErr) {
        await supabase.from("user_profiles").update({
          alerta_email_aberto: prefs.aberto,
          alerta_email_atualizado: prefs.atualizado,
          alerta_email_finalizado: prefs.finalizado,
          updated_at: new Date().toISOString(),
        } as any).eq("id", uid);
      }

      setPerfilUsuario((ant) => ant ? {
        ...ant,
        alertaEmailAberto: prefs.aberto,
        alertaEmailAtualizado: prefs.atualizado,
        alertaEmailFinalizado: prefs.finalizado,
      } : null);

      return true;
    } catch (e) {
      console.error("Erro ao atualizar preferências de alerta de e-mail:", e);
      return false;
    }
  }, [session?.user?.id]);

  const atualizarMeuCadastro = useCallback(async (dados: {
    nome: string;
    setor: string;
    cargo?: string;
    telefone?: string;
    localPadrao?: string;
    matricula?: string;
  }) => {
    const uid = session?.user?.id;
    if (!uid) {
      return { success: false, message: "Você precisa estar conectado." };
    }

    const nomeLimpo = dados.nome.trim();
    const setorLimpo = dados.setor.trim();

    if (!nomeLimpo || nomeLimpo.length < 2) {
      return { success: false, message: "Nome completo é obrigatório (mínimo 2 caracteres)." };
    }
    if (!setorLimpo || setorLimpo === "Pendente") {
      return { success: false, message: "Por favor, selecione um setor válido da lista." };
    }

    try {
      const { error: rpcErr } = await (supabase as any).rpc("update_my_profile", {
        p_nome: nomeLimpo,
        p_setor: setorLimpo,
        p_cargo: dados.cargo?.trim() || null,
        p_telefone: dados.telefone?.trim() || null,
        p_local_padrao: dados.localPadrao?.trim() || null,
        p_matricula: dados.matricula?.trim() || null,
      });

      if (rpcErr) {
        const { error: updErr } = await (supabase.from("user_profiles") as any).upsert({
          id: uid,
          email: session?.user?.email || "",
          nome: nomeLimpo,
          setor: setorLimpo,
          cargo: dados.cargo?.trim() || null,
          telefone: dados.telefone?.trim() || null,
          local_padrao: dados.localPadrao?.trim() || null,
          matricula: dados.matricula?.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

        if (updErr) {
          return { success: false, message: updErr.message || "Erro ao salvar perfil." };
        }
      }

      setPerfilUsuario((prev) => prev ? {
        ...prev,
        nome: nomeLimpo,
        setor: setorLimpo,
        cargo: dados.cargo?.trim() || null,
        telefone: dados.telefone?.trim() || null,
        localPadrao: dados.localPadrao?.trim() || null,
        matricula: dados.matricula?.trim() || null,
        updatedAt: new Date().toISOString(),
      } : null);

      return { success: true, message: "Cadastro atualizado com sucesso!" };
    } catch (err: any) {
      return { success: false, message: err?.message || "Erro ao atualizar cadastro." };
    }
  }, [session?.user]);

  const sair = useCallback(async () => {
    try {
      sessionStorage.clear();
    } catch {}
    setPerfilUsuario(null);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      tickets,
      publicStats,
      dailyStats,
      recarregarDailyStats,
      evaluationStats,
      evaluationError,
      evaluationLoading,
      avaliacoesList,
      recarregarEvaluationStats,
      sincronizarAvaliacoes,
      regras,
      hidratado,
      session,
      isGestor,
      isAdmin,
      userRole,
      userBlocked,
      authPronto,
      addTicket,
      updateTicket,
      removeTicket,
      setRegras,
      carregarHistoricoConfig,
      desfazerAlteracaoConfig,
      perfilUsuario,
      recarregarPerfilUsuario: carregarPerfilUsuario,
      atualizarMeuCadastro,
      atualizarPreferenciasAlertaEmail,
      sair,
    }),
    [
      tickets,
      publicStats,
      dailyStats,
      recarregarDailyStats,
      evaluationStats,
      evaluationError,
      evaluationLoading,
      avaliacoesList,
      recarregarEvaluationStats,
      sincronizarAvaliacoes,
      regras,
      hidratado,
      session,
      isGestor,
      isAdmin,
      userRole,
      userBlocked,
      authPronto,
      addTicket,
      updateTicket,
      removeTicket,
      setRegras,
      carregarHistoricoConfig,
      desfazerAlteracaoConfig,
      perfilUsuario,
      carregarPerfilUsuario,
      atualizarMeuCadastro,
      atualizarPreferenciasAlertaEmail,
      sair,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

