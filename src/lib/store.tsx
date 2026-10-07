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
  ALERTAS_EMAIL_PADRAO,
  MOTIVOS_PAUSA_SLA_PADRAO,
  MENU_PADRAO,
  CHAT_PADRAO,
  LOGIN_PADRAO,
  SEO_PADRAO,
  ATENDIMENTO_PADRAO,
  MEUS_CHAMADOS_PADRAO,
  type ConfiguracaoHistoricoItem,
  type Regras,
  type Ticket,
  type Prioridade,
  type Status,
  type PapelUsuario,
  obterDataHojeCuiaba,
} from "./types";

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
    sobre: { ...SOBRE_PADRAO, ...(regrasSalvas.sobre || {}) },
    menu: Array.isArray(regrasSalvas.menu) ? regrasSalvas.menu : [...MENU_PADRAO],
    chat: { ...CHAT_PADRAO, ...(regrasSalvas.chat || {}) },
    login: { ...LOGIN_PADRAO, ...(regrasSalvas.login || {}) },
    seo: { ...SEO_PADRAO, ...(regrasSalvas.seo || {}) },
    atendimento: { ...ATENDIMENTO_PADRAO, ...(regrasSalvas.atendimento || {}) },
    meusChamados: { ...MEUS_CHAMADOS_PADRAO, ...(regrasSalvas.meusChamados || {}) },
    alertasEmail: {
      ...ALERTAS_EMAIL_PADRAO,
      ...(regrasSalvas.alertasEmail || {}),
      eventos: {
        ...ALERTAS_EMAIL_PADRAO.eventos,
        ...(regrasSalvas.alertasEmail?.eventos || {}),
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
  };
}

function fromRow(r: Row): Ticket {
  return {
    id: r.id,
    abertoEm: r.aberto_em,
    hora: r.hora,
    solicitante: r.solicitante,
    solicitanteEmail: r.solicitante_email,
    setor: r.setor,
    local: r.local,
    descricao: r.descricao,
    categoria: r.categoria ?? "",
    prioridade: r.prioridade as Prioridade,
    responsavel: r.responsavel,
    status: r.status as Status,
    fechadoEm: r.fechado_em,
    horario: r.horario,
    procedimento: r.procedimento,
    contato: r.contato,
    slaReiniciadoEm: r.sla_reiniciado_em,
    slaPausado: Boolean((r as any).sla_pausado),
    slaPausadoEm: (r as any).sla_pausado_em,
    slaPausaMotivo: (r as any).sla_pausa_motivo,
    slaPausaAutor: (r as any).sla_pausa_autor,
    slaHistoricoPausas: Array.isArray((r as any).sla_historico_pausas) ? (r as any).sla_historico_pausas : [],
    slaSegundosPausadosAcumulados: Number((r as any).sla_segundos_pausados_acumulados) || 0,
  };
}

function toRow(p: Partial<Ticket>) {
  const m: Record<string, unknown> = {};
  const map: Record<string, string> = {
    abertoEm: "aberto_em", hora: "hora", solicitante: "solicitante", solicitanteEmail: "solicitante_email", setor: "setor", local: "local",
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
  const [emailAlertsAtivos, setEmailAlertsAtivos] = useState(true);

  // Sessão
  useEffect(() => {
    if (typeof window !== "undefined") {
      const testUser =
        (window as any).__TEST_USER__ ||
        (localStorage.getItem("sb-mock-user")
          ? JSON.parse(localStorage.getItem("sb-mock-user") || "null")
          : null);
      if (testUser) {
        const role = testUser.user_metadata?.role || testUser.role || "usuario";
        const eAdmin = role === "admin";
        const eGestor = eAdmin || role === "gestor";
        setSession({
          user: testUser,
          access_token: "mock-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "mock-refresh",
          expires_at: Date.now() + 3600000,
        } as any);
        setIsAdmin(eAdmin);
        setIsGestor(eGestor);
        setUserRole(role);
        setUserBlocked(false);
        setAuthPronto(true);
        return;
      }
    }
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
      setEmailAlertsAtivos(true);
      setAuthPronto(true);
      return;
    }

    if (typeof window !== "undefined") {
      const testUser =
        (window as any).__TEST_USER__ ||
        (localStorage.getItem("sb-mock-user")
          ? JSON.parse(localStorage.getItem("sb-mock-user") || "null")
          : null);
      if (testUser && testUser.id === uid) {
        const role = testUser.user_metadata?.role || testUser.role || "usuario";
        const eAdmin = role === "admin";
        const eGestor = eAdmin || role === "gestor";
        setIsAdmin(eAdmin);
        setIsGestor(eGestor);
        setUserRole(role);
        setUserBlocked(false);
        setAuthPronto(true);
        return;
      }
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
          if (p.emailAlertsAtivos !== undefined) {
            setEmailAlertsAtivos(Boolean(p.emailAlertsAtivos));
          }
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
        supabase.from("user_profiles").select("bloqueado, notificacoes_email_ativas" as any).eq("id", uid).maybeSingle(),
      ]);

      if (!ativo) return;

      const profileData = profileRes.status === "fulfilled" ? profileRes.value.data : null;
      if (profileData && (profileData as any).notificacoes_email_ativas !== undefined) {
        setEmailAlertsAtivos((profileData as any).notificacoes_email_ativas !== false);
      }
      const bloqueado = profileData?.bloqueado === true;
      if (bloqueado) {
        setUserBlocked(true);
        setIsAdmin(false);
        setIsGestor(false);
        setUserRole("usuario");
        setAuthPronto(true);
        try { sessionStorage.removeItem(cacheChave); } catch {}
        await supabase.auth.signOut();
        return;
      }

      const ADMINS_INICIAIS = [
        "klaw.com@gmail.com",
        "klawdhynney@gmail.com",
        "claudineigoncalvesdelima@hotmail.com",
        "claudinei.lima@senaimt.ind.br",
      ];
      const emailNormalizado = (session?.user.email || "").toLowerCase().trim();
      const eAdminAutorizado = ADMINS_INICIAIS.includes(emailNormalizado);

      const adminVal = adminRes.status === "fulfilled" ? adminRes.value.data : false;
      const gestorVal = gestorRes.status === "fulfilled" ? gestorRes.value.data : false;

      const eAdmin = adminVal === true || eAdminAutorizado;
      const eGestor = eAdmin || gestorVal === true;
      const papelFinal: PapelUsuario = eAdmin ? "admin" : eGestor ? "gestor" : "usuario";

      setUserBlocked(false);
      setIsAdmin(eAdmin);
      setIsGestor(eGestor);
      setUserRole(papelFinal);
      setAuthPronto(true);

      try {
        sessionStorage.setItem(
          cacheChave,
          JSON.stringify({ isAdmin: eAdmin, isGestor: eGestor, userRole: papelFinal, userBlocked: false })
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

    // Timer de 60 segundos para atualizar em caso de virada de dia no fuso America/Cuiaba
    const intervaloDia = setInterval(() => {
      recarregarDailyStats();
    }, 60000);

    return () => {
      clearInterval(intervaloDia);
      supabase.removeChannel(channel);
    };
  }, [recarregarDailyStats]);

  // Estatísticas agregadas de avaliações (públicas e anônimas)
  const recarregarEvaluationStats = useCallback(async () => {
    try {
      // 1. Tenta a RPC get_public_evaluation_stats
      const { data, error } = await supabase.rpc("get_public_evaluation_stats");
      if (!error && data && typeof data === "object") {
        const stats = data as unknown as AvaliacaoResumoPublico;
        if (typeof stats.total === "number") {
          setEvaluationStats({
            total: stats.total || 0,
            media: Number(stats.media || 0),
            satisfacao_pct: stats.satisfacao_pct || 0,
            distribuicao: {
              1: stats.distribuicao?.[1] || 0,
              2: stats.distribuicao?.[2] || 0,
              3: stats.distribuicao?.[3] || 0,
              4: stats.distribuicao?.[4] || 0,
              5: stats.distribuicao?.[5] || 0,
            },
          });
          // Se a RPC respondeu com sucesso, sincroniza eventuais avaliações pendentes do cache local para o banco
          if (typeof window !== "undefined") {
            try {
              const salvasLocais = JSON.parse(localStorage.getItem("tisenai_avaliacoes_locais") || "[]");
              if (Array.isArray(salvasLocais) && salvasLocais.length > 0) {
                for (const p of salvasLocais) {
                  if (p.ticket_id && p.nota) {
                    supabase.rpc("submit_ticket_evaluation", {
                      p_ticket_id: p.ticket_id,
                      p_nota: p.nota,
                      p_comentario: p.comentario || null,
                    }).catch(() => {});
                  }
                }
                localStorage.removeItem("tisenai_avaliacoes_locais");
              }
            } catch {
              // ignore
            }
          }
          return;
        }
      }

      // 2. View pública agregada se a RPC falhar
      const { data: viewData, error: viewError } = await supabase
        .from("avaliacoes_public_stats" as any)
        .select("*")
        .maybeSingle();

      if (!viewError && viewData) {
        const v = viewData as any;
        setEvaluationStats({
          total: v.total || 0,
          media: Number(v.media || 0),
          satisfacao_pct: v.satisfacao_pct || 0,
          distribuicao: {
            1: v.nota_1 || 0,
            2: v.nota_2 || 0,
            3: v.nota_3 || 0,
            4: v.nota_4 || 0,
            5: v.nota_5 || 0,
          },
        });
        return;
      }

      // 3. Fallback com avaliações locais no navegador
      if (typeof window !== "undefined") {
        const salvasLocais = JSON.parse(localStorage.getItem("tisenai_avaliacoes_locais") || "[]");
        if (Array.isArray(salvasLocais) && salvasLocais.length > 0) {
          const total = salvasLocais.length;
          const soma = salvasLocais.reduce((acc, a) => acc + (Number(a.nota) || 0), 0);
          const media = Number((soma / total).toFixed(2));
          const sat = Math.round((salvasLocais.filter((a) => Number(a.nota) >= 4).length / total) * 100);
          const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          for (const a of salvasLocais) {
            const n = Math.min(5, Math.max(1, Math.round(Number(a.nota) || 0)));
            if (n in dist) dist[n as keyof typeof dist]++;
          }
          setEvaluationStats({
            total,
            media,
            satisfacao_pct: sat,
            distribuicao: dist,
          });
        }
      }
    } catch (err) {
      console.warn("Não foi possível carregar estatísticas agregadas de avaliações:", err);
    }
  }, []);

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

      return insertData?.id ?? null;
    } catch (err) {
      console.error("Erro fatal ao salvar chamado:", err);
      return null;
    }
  }, [session?.user?.id]);

   const updateTicket = useCallback(async (id: number, patch: Partial<Ticket>) => {
     const { error } = await supabase.from("tickets").update(toRow(patch) as never).eq("id", id);
     if (error) { console.error(error); return false; }
     setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
     return true;
  }, []);

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

  const alternarEmailAlertas = useCallback(async (ativo: boolean) => {
    setEmailAlertsAtivos(ativo);
    const uid = session?.user.id;
    if (!uid) return true;
    try {
      const { error } = await supabase.from("user_profiles").update({
        notificacoes_email_ativas: ativo,
        updated_at: new Date().toISOString(),
      } as any).eq("id", uid);
      if (error) {
        await supabase.rpc("set_user_email_notifications", { p_ativo: ativo } as any);
      }
      return true;
    } catch {
      return false;
    }
  }, [session?.user.id]);

  const sair = useCallback(async () => {
    try {
      sessionStorage.clear();
    } catch {}
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      tickets,
      publicStats,
      dailyStats,
      recarregarDailyStats,
      evaluationStats,
      recarregarEvaluationStats,
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
      emailAlertsAtivos,
      alternarEmailAlertas,
      sair,
    }),
    [
      tickets,
      publicStats,
      dailyStats,
      recarregarDailyStats,
      evaluationStats,
      recarregarEvaluationStats,
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
      emailAlertsAtivos,
      alternarEmailAlertas,
      sair,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

