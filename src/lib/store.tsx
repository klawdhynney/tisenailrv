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
  ANIMACAO_CARREGAMENTO_PADRAO,
  type Regras,
  type Ticket,
  type Prioridade,
  type Status,
} from "./types";

type Row = Database["public"]["Tables"]["tickets"]["Row"];

function mesclarComPadroes(regrasSalvas: Partial<Regras>): Regras {
  return {
    ...REGRAS_PADRAO,
    ...regrasSalvas,
    prazos: { ...REGRAS_PADRAO.prazos, ...(regrasSalvas.prazos || {}) },
    expediente: { ...REGRAS_PADRAO.expediente, ...(regrasSalvas.expediente || {}) },
    identidadeVisual: { ...IDENTIDADE_VISUAL_PADRAO, ...(regrasSalvas.identidadeVisual || {}) },
    paginaInicial: { ...PAGINA_INICIAL_PADRAO, ...(regrasSalvas.paginaInicial || {}) },
    indicadores: {
      total: { ...INDICADORES_PADRAO.total, ...(regrasSalvas.indicadores?.total || {}) },
      atendimento: { ...INDICADORES_PADRAO.atendimento, ...(regrasSalvas.indicadores?.atendimento || {}) },
      resolvidos: { ...INDICADORES_PADRAO.resolvidos, ...(regrasSalvas.indicadores?.resolvidos || {}) },
    },
    abrirChamado: { ...ABRIR_CHAMADO_PADRAO, ...(regrasSalvas.abrirChamado || {}) },
    acompanhamento: { ...ACOMPANHAMENTO_PADRAO, ...(regrasSalvas.acompanhamento || {}) },
    dashboard: {
      ...DASHBOARD_PADRAO,
      ...(regrasSalvas.dashboard || {}),
      graficosAtivos: { ...DASHBOARD_PADRAO.graficosAtivos, ...(regrasSalvas.dashboard?.graficosAtivos || {}) },
    },
    rodape: { ...RODAPE_PADRAO, ...(regrasSalvas.rodape || {}) },
    lgpd: { ...LGPD_PADRAO, ...(regrasSalvas.lgpd || {}) },
    animacaoCarregamento: { ...ANIMACAO_CARREGAMENTO_PADRAO, ...(regrasSalvas.animacaoCarregamento || {}) },
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
  };
}

function toRow(p: Partial<Ticket>) {
  const m: Record<string, unknown> = {};
  const map: Record<string, string> = {
    abertoEm: "aberto_em", hora: "hora", solicitante: "solicitante", solicitanteEmail: "solicitante_email", setor: "setor", local: "local",
    descricao: "descricao", categoria: "categoria", prioridade: "prioridade", responsavel: "responsavel",
    status: "status", fechadoEm: "fechado_em", horario: "horario", procedimento: "procedimento",
    contato: "contato", slaReiniciadoEm: "sla_reiniciado_em",
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
  const [regras, setRegrasState] = useState<Regras>(REGRAS_PADRAO);
  const [hidratado, setHidratado] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isGestor, setIsGestor] = useState(false);
  const [authPronto, setAuthPronto] = useState(false);

  // Sessão
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data: d }) => setSession(d.session));
    return () => data.subscription.unsubscribe();
  }, []);

  // Papel de gestor
  useEffect(() => {
    let ativo = true;
    const uid = session?.user.id;
    if (!uid) {
      setIsGestor(false);
      setAuthPronto(true);
      return;
    }
    setAuthPronto(false);
    (async () => {
       await supabase.rpc("claim_manager_access");
       const { data } = await supabase.rpc("is_named_manager");
        if (!ativo) return;
         setIsGestor(data === true);
        setAuthPronto(true);
    })();
    return () => {
      ativo = false;
    };
  }, [session?.user.id, session?.user.email, session?.user.app_metadata?.provider]);

  useEffect(() => {
    const carregar = () => supabase.from("ticket_public_stats").select("*").then(({ data }) => setPublicStats(data ?? []));
    carregar();
    const channel = supabase.channel("public-stats-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_public_stats" }, carregar).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Regras (públicas) + tempo real
  useEffect(() => {
    const carregar = () =>
      supabase.from("configuracoes").select("regras").eq("id", 1).maybeSingle().then(({ data }) => {
        if (data?.regras && typeof data.regras === "object") {
          setRegrasState(mesclarComPadroes(data.regras as unknown as Partial<Regras>));
        } else {
          setRegrasState(mesclarComPadroes({}));
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
    // O recibo é devolvido pela própria abertura: anon não tem permissão de leitura na tabela.
    const { data, error } = await supabase.rpc("open_public_ticket_with_receipt", {
      p_solicitante: t.solicitante.trim(), p_email: email.trim().toLowerCase(),
      p_contato: t.contato ?? "", p_setor: t.setor, p_local: t.local,
      p_categoria: t.categoria ?? "", p_descricao: t.descricao,
    });
    if (error) { console.error("Falha ao registrar chamado", error.message); return null; }
    return data;
  }, []);

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

   const setRegras = useCallback(async (r: Regras) => {
     const merged = mesclarComPadroes(r);
     const { error } = await supabase
       .from("configuracoes")
       .upsert({ id: 1, regras: merged as never, updated_at: new Date().toISOString() });
     if (error) { console.error(error); return false; }
     setRegrasState(merged);
     return true;
   }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ tickets, publicStats, regras, hidratado, session, isGestor, authPronto, addTicket, updateTicket, removeTicket, setRegras, sair }),
    [tickets, publicStats, regras, hidratado, session, isGestor, authPronto, addTicket, updateTicket, removeTicket, setRegras, sair],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

