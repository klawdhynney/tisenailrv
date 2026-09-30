import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Regras, Ticket } from "./types";

export interface StoreValue {
  tickets: Ticket[];
  publicStats: Database["public"]["Tables"]["ticket_public_stats"]["Row"][];
  regras: Regras;
  hidratado: boolean;
  session: Session | null;
  isGestor: boolean;
  authPronto: boolean;
  addTicket: (t: Omit<Ticket, "id">, email: string) => Promise<number | null>;
  updateTicket: (id: number, patch: Partial<Ticket>) => Promise<boolean>;
  removeTicket: (id: number) => Promise<boolean>;
  setRegras: (r: Regras) => Promise<boolean>;
  sair: () => Promise<void>;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}