import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { REGRAS_PADRAO, type Regras, type Ticket, type Prioridade, type Status } from "./types";

type Row = Database["public"]["Tables"]["tickets"]["Row"];

function fromRow(r: Row): Ticket {
  return {
    id: r.id,
    abertoEm: r.aberto_em,
    hora: r.hora,
    solicitante: r.solicitante,
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
    abertoEm: "aberto_em", hora: "hora", solicitante: "solicitante", setor: "setor", local: "local",
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

interface Ctx {
  tickets: Ticket[];
  regras: Regras;
  hidratado: boolean;
  session: Session | null;
  isGestor: boolean;
  authPronto: boolean;
  addTicket: (t: Omit<Ticket, "id">) => Promise<boolean>;
  updateTicket: (id: number, patch: Partial<Ticket>) => void;
  removeTicket: (id: number) => void;
  setRegras: (r: Regras) => void;
  sair: () => Promise<void>;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
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
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "gestor")
      .maybeSingle()
      .then(({ data }) => {
        if (!ativo) return;
        setIsGestor(!!data);
        setAuthPronto(true);
      });
    return () => {
      ativo = false;
    };
  }, [session?.user.id]);

  // Regras (públicas) + tempo real
  useEffect(() => {
    const carregar = () =>
      supabase.from("configuracoes").select("regras").eq("id", 1).maybeSingle().then(({ data }) => {
        if (data?.regras && typeof data.regras === "object") {
          setRegrasState({ ...REGRAS_PADRAO, ...(data.regras as unknown as Partial<Regras>) });
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
    const carregar = () =>
      supabase.from("tickets").select("*").order("id").then(({ data }) => {
        setTickets((data ?? []).map(fromRow));
        setHidratado(true);
      });
    carregar();
    const ch = supabase
      .channel("tickets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, carregar)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isGestor, authPronto]);

  const addTicket = useCallback(async (t: Omit<Ticket, "id">) => {
    const { error } = await supabase.from("tickets").insert(toRow(t) as never);
    return !error;
  }, []);

  const updateTicket = useCallback((id: number, patch: Partial<Ticket>) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    supabase.from("tickets").update(toRow(patch) as never).eq("id", id).then(({ error }) => {
      if (error) console.error(error);
    });
  }, []);

  const removeTicket = useCallback((id: number) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    supabase.from("tickets").delete().eq("id", id).then(({ error }) => {
      if (error) console.error(error);
    });
  }, []);

  const setRegras = useCallback((r: Regras) => {
    setRegrasState(r);
    supabase
      .from("configuracoes")
      .upsert({ id: 1, regras: r as never, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.error(error);
      });
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ tickets, regras, hidratado, session, isGestor, authPronto, addTicket, updateTicket, removeTicket, setRegras, sair }),
    [tickets, regras, hidratado, session, isGestor, authPronto, addTicket, updateTicket, removeTicket, setRegras, sair],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}

export function mesDoTicket(t: Ticket) {
  return t.abertoEm?.slice(0, 7) ?? "";
}
