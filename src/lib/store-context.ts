import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Regras, Ticket } from "./types";

export interface StoreValue {
  tickets: Ticket[];
  publicStats: Database["public"]["Tables"]["ticket_public_stats"]["Row"][];
  dailyStats: { chamadosDoDia: number; atendidosNoDia: number };
  recarregarDailyStats: () => Promise<void>;
  evaluationStats: import("./types").AvaliacaoResumoPublico;
  evaluationError: boolean;
  evaluationLoading: boolean;
  avaliacoesList: import("./types").AvaliacaoItemDashboard[];
  recarregarEvaluationStats: () => Promise<void>;
  sincronizarAvaliacoes: () => Promise<{ sincronizados: number; falhas: number; mensagem: string }>;
  regras: Regras;
  hidratado: boolean;
  session: Session | null;
  isGestor: boolean;
  isAdmin: boolean;
  userRole: import("./types").PapelUsuario;
  userBlocked: boolean;
  authPronto: boolean;
  addTicket: (t: Omit<Ticket, "id">, email: string) => Promise<number | null>;
  updateTicket: (id: number, patch: Partial<Ticket>) => Promise<boolean>;
  removeTicket: (id: number) => Promise<boolean>;
  setRegras: (
    r: Regras,
    mudancasHistorico?: { secao: string; chave: string; descricao?: string; anterior: any; novo: any }[],
  ) => Promise<boolean>;
  carregarHistoricoConfig: () => Promise<import("./types").ConfiguracaoHistoricoItem[]>;
  desfazerAlteracaoConfig: (id: number) => Promise<boolean>;
  emailAlertsAtivos: boolean;
  alternarEmailAlertas: (ativo: boolean) => Promise<boolean>;
  perfilUsuario: import("./types").UsuarioCadastro | null;
  recarregarPerfilUsuario: () => Promise<void>;
  atualizarMeuCadastro: (dados: {
    nome: string;
    setor: string;
    cargo?: string;
    telefone?: string;
    localPadrao?: string;
    matricula?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  sair: () => Promise<void>;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}