import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import seed from "@/data/tickets.seed.json";
import { REGRAS_PADRAO, type Regras, type Ticket } from "./types";

const TICKETS_KEY = "chamados-ti:tickets:v1";
const REGRAS_KEY = "chamados-ti:regras:v1";

const seedTickets = seed as unknown as Ticket[];

interface Ctx {
  tickets: Ticket[];
  regras: Regras;
  hidratado: boolean;
  addTicket: (t: Omit<Ticket, "id">) => number;
  updateTicket: (id: number, patch: Partial<Ticket>) => void;
  removeTicket: (id: number) => void;
  setRegras: (r: Regras) => void;
  resetTudo: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(seedTickets);
  const [regras, setRegrasState] = useState<Regras>(REGRAS_PADRAO);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setTickets(load(TICKETS_KEY, seedTickets));
    setRegrasState({ ...REGRAS_PADRAO, ...load(REGRAS_KEY, REGRAS_PADRAO) });
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (hidratado) window.localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  }, [tickets, hidratado]);

  useEffect(() => {
    if (hidratado) window.localStorage.setItem(REGRAS_KEY, JSON.stringify(regras));
  }, [regras, hidratado]);

  const addTicket = useCallback((t: Omit<Ticket, "id">) => {
    let novoId = 1;
    setTickets((prev) => {
      novoId = prev.reduce((m, x) => Math.max(m, x.id), 0) + 1;
      return [...prev, { ...t, id: novoId }];
    });
    return novoId;
  }, []);

  const updateTicket = useCallback((id: number, patch: Partial<Ticket>) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const removeTicket = useCallback((id: number) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const resetTudo = useCallback(() => {
    setTickets(seedTickets);
    setRegrasState(REGRAS_PADRAO);
  }, []);

  const value = useMemo(
    () => ({ tickets, regras, hidratado, addTicket, updateTicket, removeTicket, setRegras: setRegrasState, resetTudo }),
    [tickets, regras, hidratado, addTicket, updateTicket, removeTicket, resetTudo],
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
