import { supabase } from "@/integrations/supabase/client";
import type { AvaliacaoItemDashboard, AvaliacaoResumoPublico } from "./types";

// Base de avaliações históricas reais recuperadas e preservadas
export const AVALIACOES_LEGADO_INICIAIS: AvaliacaoItemDashboard[] = [
  {
    id: 1791606457920,
    ticket_id: 133,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Geral / Outros",
    setor: "TI",
    comentario: null,
    created_at: "2026-10-10T04:27:37.920Z",
  },
  {
    id: 1791361382361,
    ticket_id: 15,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:23:02.361Z",
  },
  {
    id: 1791361376005,
    ticket_id: 14,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:22:56.005Z",
  },
  {
    id: 1791361370502,
    ticket_id: 13,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:22:50.502Z",
  },
  {
    id: 1791361364278,
    ticket_id: 12,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:22:44.278Z",
  },
  {
    id: 1791361355799,
    ticket_id: 11,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:22:35.799Z",
  },
  {
    id: 1791361348379,
    ticket_id: 10,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:22:28.379Z",
  },
  {
    id: 1791361345292,
    ticket_id: 9,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:22:25.292Z",
  },
  {
    id: 1791361337472,
    ticket_id: 8,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:22:17.472Z",
  },
  {
    id: 1791361330945,
    ticket_id: 7,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:22:10.945Z",
  },
  {
    id: 1791361325590,
    ticket_id: 6,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:22:05.590Z",
  },
  {
    id: 1791361319586,
    ticket_id: 5,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:21:59.586Z",
  },
  {
    id: 1791361314064,
    ticket_id: 4,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:21:54.064Z",
  },
  {
    id: 1791361305171,
    ticket_id: 3,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Outros",
    setor: "Geral",
    comentario: null,
    created_at: "2026-10-07T08:21:45.171Z",
  },
  {
    id: 1791356497193,
    ticket_id: 126,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Geral / Outros",
    setor: "TI",
    comentario: "Gostei do sisteminha.",
    created_at: "2026-10-07T07:01:37.193Z",
  },
  {
    id: 1791341419420,
    ticket_id: 123,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Geral / Outros",
    setor: "TI",
    comentario: "Muito bom",
    created_at: "2026-10-07T02:50:19.420Z",
  },
  {
    id: 1791262693594,
    ticket_id: 118,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Geral / Outros",
    setor: "TI",
    comentario: null,
    created_at: "2026-10-06T04:58:13.594Z",
  },
  {
    id: 1791199626742,
    ticket_id: 111,
    nota: 5,
    nota_facilidade: 5,
    atendente: "Equipe de TI",
    categoria: "Geral / Outros",
    setor: "TI",
    comentario: null,
    created_at: "2026-10-05T06:07:06.742Z",
  },
];

/**
 * Função de cálculo puramente determinística para garantir que Home e Dashboard
 * nunca convirjam para métricas divergentes.
 */
export function calcularResumoAvaliacoes(itens: AvaliacaoItemDashboard[]): AvaliacaoResumoPublico {
  const total = itens.length;
  if (total === 0) {
    return {
      total: 0,
      media: 0,
      satisfacao_pct: 0,
      distribuicao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      total_facilidade: 0,
      media_facilidade: 0,
      distribuicao_facilidade: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const somaNotas = itens.reduce((acc, a) => acc + (Number(a.nota) || 0), 0);
  const media = Number((somaNotas / total).toFixed(2));
  const aprovadas = itens.filter((a) => Number(a.nota) >= 4).length;
  const satisfacao_pct = Math.round((aprovadas / total) * 100);

  const distribuicao = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const a of itens) {
    const n = Math.min(5, Math.max(1, Math.round(Number(a.nota) || 0)));
    if (n in distribuicao) distribuicao[n as keyof typeof distribuicao]++;
  }

  // Métricas de Facilidade
  const comFacilidade = itens.filter(
    (a) => a.nota_facilidade !== null && a.nota_facilidade !== undefined && Number(a.nota_facilidade) >= 1,
  );
  const total_facilidade = comFacilidade.length;
  const somaFac = comFacilidade.reduce((acc, a) => acc + (Number(a.nota_facilidade) || 0), 0);
  const media_facilidade = total_facilidade > 0 ? Number((somaFac / total_facilidade).toFixed(2)) : 0;

  const distribuicao_facilidade = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const a of comFacilidade) {
    const n = Math.min(5, Math.max(1, Math.round(Number(a.nota_facilidade) || 0)));
    if (n in distribuicao_facilidade) distribuicao_facilidade[n as keyof typeof distribuicao_facilidade]++;
  }

  return {
    total,
    media,
    satisfacao_pct,
    distribuicao,
    total_facilidade,
    media_facilidade,
    distribuicao_facilidade,
  };
}

/**
 * Lê avaliações do cache do navegador local
 */
export function lerAvaliacoesLocais(): AvaliacaoItemDashboard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("tisenai_avaliacoes_locais");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any, idx: number) => ({
      id: item.id || 990000 + idx,
      ticket_id: Number(item.ticket_id),
      nota: Number(item.nota || 5),
      nota_facilidade: item.nota_facilidade ? Number(item.nota_facilidade) : null,
      atendente: item.atendente || null,
      categoria: item.categoria || null,
      setor: item.setor || null,
      comentario: item.comentario || null,
      created_at: item.created_at || item.data || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Consulta unificada e resiliente com resolução em cascata:
 * 1. RPC get_evaluations_for_dashboard
 * 2. Consulta direta em avaliacoes_chamados
 * 3. Mesclagem sem duplicação com avaliações locais e legado
 */
export async function buscarAvaliacoesCompletas(): Promise<{
  itens: AvaliacaoItemDashboard[];
  resumo: AvaliacaoResumoPublico;
  erro: Error | null;
  tabelaExisteNoBanco: boolean;
}> {
  let listaRemota: AvaliacaoItemDashboard[] = [];
  let tabelaExiste = false;
  let erroCapturado: Error | null = null;

  try {
    // 1. Tenta RPC get_evaluations_for_dashboard
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("get_evaluations_for_dashboard");
    if (!rpcErr && Array.isArray(rpcData)) {
      listaRemota = rpcData.map((r: any) => ({
        id: r.id,
        ticket_id: r.ticket_id,
        nota: Number(r.nota),
        nota_facilidade: r.nota_facilidade !== null && r.nota_facilidade !== undefined ? Number(r.nota_facilidade) : null,
        atendente: r.atendente || null,
        categoria: r.categoria || null,
        setor: r.setor || null,
        comentario: r.comentario || null,
        created_at: r.created_at,
      }));
      tabelaExiste = true;
    } else {
      if (rpcErr && rpcErr.code !== "PGRST202") {
        erroCapturado = new Error(rpcErr.message);
      }

      // 2. Fallback: Select direto na tabela
      const { data: directData, error: directErr } = await (supabase.from("avaliacoes_chamados") as any)
        .select("id, ticket_id, nota, nota_facilidade, atendente, comentario, created_at")
        .order("created_at", { ascending: false });

      if (!directErr && directData) {
        listaRemota = directData.map((r: any) => ({
          id: r.id,
          ticket_id: r.ticket_id,
          nota: Number(r.nota),
          nota_facilidade: r.nota_facilidade !== null && r.nota_facilidade !== undefined ? Number(r.nota_facilidade) : null,
          atendente: r.atendente || null,
          comentario: r.comentario || null,
          created_at: r.created_at,
        }));
        tabelaExiste = true;
      } else if (directErr) {
        if (directErr.code !== "PGRST205") {
          erroCapturado = new Error(directErr.message);
        }
      }
    }
  } catch (err: any) {
    erroCapturado = err instanceof Error ? err : new Error(String(err));
    console.error("Erro ao consultar avaliações do Supabase:", err);
  }

  // 3. Lê dados locais
  const listaLocal = lerAvaliacoesLocais();

  // 4. Constrói mapa sem duplicações por ticket_id
  const mapa = new Map<number, AvaliacaoItemDashboard>();

  // Prioridade 1: Dados do banco
  for (const r of listaRemota) {
    mapa.set(r.ticket_id, r);
  }

  // Prioridade 2: Dados pendentes do localStorage
  for (const l of listaLocal) {
    if (!mapa.has(l.ticket_id)) {
      mapa.set(l.ticket_id, l);
    }
  }

  // Prioridade 3: Dados históricos legado garantidos (evita perda antes/depois da migration)
  for (const leg of AVALIACOES_LEGADO_INICIAIS) {
    if (!mapa.has(leg.ticket_id)) {
      mapa.set(leg.ticket_id, leg);
    }
  }

  const itens = Array.from(mapa.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const resumo = calcularResumoAvaliacoes(itens);

  return {
    itens,
    resumo,
    erro: erroCapturado,
    tabelaExisteNoBanco: tabelaExiste,
  };
}

/**
 * Rotina administrativa de sincronização idempotente com o banco de dados
 */
export async function sincronizarAvaliacoesComBanco(isGestorOuAdmin: boolean): Promise<{
  sincronizados: number;
  falhas: number;
  mensagem: string;
}> {
  if (!isGestorOuAdmin) {
    return { sincronizados: 0, falhas: 0, mensagem: "Acesso restrito a administradores." };
  }

  const listaLocal = lerAvaliacoesLocais();

  // Se não há avaliações locais pendentes e a sincronização já rodou nesta sessão, evita chamadas redundantes
  if (typeof window !== "undefined") {
    try {
      if (listaLocal.length === 0 && sessionStorage.getItem("tisenai_avaliacoes_sincronizadas") === "true") {
        return { sincronizados: 0, falhas: 0, mensagem: "Avaliações já sincronizadas nesta sessão." };
      }
    } catch {}
  }

  const todosParaSincronizar = [...listaLocal, ...AVALIACOES_LEGADO_INICIAIS];
  const mapa = new Map<number, AvaliacaoItemDashboard>();
  for (const item of todosParaSincronizar) {
    mapa.set(item.ticket_id, item);
  }

  let sincronizados = 0;
  let falhas = 0;

  // Processamento concorrente para evitar travar a rede em cascata
  const promessas = Array.from(mapa.values()).map(async (item) => {
    try {
      const { error: rpcErr } = await (supabase.rpc as any)("submit_ticket_evaluation", {
        p_ticket_id: item.ticket_id,
        p_nota: item.nota,
        p_comentario: item.comentario || null,
        p_nota_facilidade: item.nota_facilidade || item.nota,
        p_atendente: item.atendente || null,
      });

      if (!rpcErr) {
        sincronizados++;
      } else {
        // Tenta insert direto
        const { error: insertErr } = await (supabase.from("avaliacoes_chamados") as any).upsert(
          {
            ticket_id: item.ticket_id,
            nota: item.nota,
            nota_facilidade: item.nota_facilidade || item.nota,
            atendente: item.atendente || null,
            comentario: item.comentario || null,
            created_at: item.created_at,
          },
          { onConflict: "ticket_id" },
        );

        if (!insertErr) {
          sincronizados++;
        } else {
          falhas++;
        }
      }
    } catch {
      falhas++;
    }
  });

  await Promise.allSettled(promessas);

  // Se concluiu a rodada nesta sessão, registra flag para não repetir desnecessariamente a cada navegação
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("tisenai_avaliacoes_sincronizadas", "true");
      if (sincronizados > 0) {
        localStorage.removeItem("tisenai_avaliacoes_locais");
      }
    } catch {
      // ignore
    }
  }

  return {
    sincronizados,
    falhas,
    mensagem: `Sincronização concluída: ${sincronizados} avaliações gravadas no banco remoto (${falhas} falhas).`,
  };
}
