import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, Search, ArrowLeft, ShieldCheck, ExternalLink, RotateCcw, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PrioridadeChip, SlaChip, StatusChip } from "@/components/Chips";
import { useLoading } from "@/lib/loading-context";
import { useStore } from "@/lib/store-context";
import { calcularSla, formatarData, formatarDataHora } from "@/lib/sla";
import { isColunaAcompAtiva, type Ticket } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/dashboard/acompanhamento")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/auth",
        search: { redirectTo: "/dashboard/acompanhamento" },
      });
    }
  },
  component: Acompanhamento,
  head: () => ({
    meta: [
      { title: "Acompanhar chamados | TI SENAI LRV" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Acompanhamento dos chamados de TI, status, prioridades e prazos de SLA." },
    ],
  }),
});

type ProgressTicket = Database["public"]["Functions"]["public_ticket_sla_progress"]["Returns"][number];

function Acompanhamento() {
  const { regras, isGestor, session, authPronto } = useStore();
  const { wrapAsync, isLoading } = useLoading();
  const navigate = useNavigate();
  const config = regras.acompanhamento;
  const colunas = config?.colunasVisiveis || [
    "verChamado",
    "numero",
    "abertura",
    "status",
    "prioridade",
    "sla",
    "prazo",
  ];

  const [progress, setProgress] = useState<ProgressTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(() => config?.itensPorPaginaPadrao || 10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [chamadoSelecionado, setChamadoSelecionado] = useState<ProgressTicket | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (authPronto && !session) {
      navigate({
        to: "/auth",
        search: { redirectTo: "/dashboard/acompanhamento" },
      });
    }
  }, [authPronto, session, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const carregarChamados = async (mounted = true) => {
    try {
      setLoading(true);
      const all: ProgressTicket[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.rpc("public_ticket_sla_progress").range(offset, offset + 999);
        if (error) {
          console.warn("Falha no public_ticket_sla_progress, tentando public_ticket_progress:", error.message);
          const fallback = await supabase.rpc("public_ticket_progress").range(offset, offset + 999);
          if (fallback.error) {
            console.error("Falha ao carregar acompanhamento:", fallback.error.message);
            break;
          }
          const adaptados: ProgressTicket[] = (fallback.data ?? []).map((t) => ({
            id: t.id,
            aberto_em: t.aberto_em,
            hora: "",
            categoria: t.categoria,
            status: t.status,
            prioridade: t.prioridade,
            fechado_em: t.fechado_em,
            horario: "",
            sla_reiniciado_em: "",
          }));
          all.push(...adaptados);
          if (!fallback.data || fallback.data.length < 1000) break;
        } else {
          all.push(...(data ?? []));
          if (!data || data.length < 1000) break;
        }
      }
      if (mounted) {
        setProgress(all);
      }
    } finally {
      if (mounted) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void carregarChamados(mounted);

    const channel = supabase
      .channel("public-progress-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_public_stats" }, () => {
        void carregarChamados(mounted);
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return progress.filter((t) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase().replace("#", "");
        const matchesId = String(t.id).includes(q);
        const matchesCat = (t.categoria || "").toLowerCase().includes(q.toLowerCase());
        if (!matchesId && !matchesCat) return false;
      }
      if (statusFilter !== "todos") {
        if (statusFilter === "abertos" && ["Resolvido", "Cancelado"].includes(t.status)) return false;
        if (statusFilter === "andamento" && t.status !== "Em andamento") return false;
        if (statusFilter === "pausados" && !t.sla_pausado) return false;
        if (statusFilter === "resolvidos" && t.status !== "Resolvido") return false;
        if (statusFilter === "cancelados" && t.status !== "Cancelado") return false;
      }
      return true;
    });
  }, [progress, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, size]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * size, currentPage * size);

  const isColAtiva = (colId: string) => isColunaAcompAtiva(colunas, colId);

  return (
    <section className="space-y-6">
      {/* Cabeçalho da Página */}
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
          {config?.titulo || "Acompanhamento dos chamados"}
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {config?.descricao || "Consulte seus chamados e acompanhe o status, prazo, prioridade e andamento do atendimento."}
        </p>
      </header>

      {/* Barra de Ações e Filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 font-bold">
            <Link to="/dashboard">
              <ArrowLeft className="size-4" /> Voltar ao dashboard
            </Link>
          </Button>

          {/* Busca por ID ou Categoria */}
          <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar Nº ou tipo..."
              className="h-9 pl-9 pr-3 text-xs"
            />
          </div>

          {/* Filtro rápido de status */}
          <select
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-g-blue"
          >
            <option value="todos">Todos os status</option>
            <option value="abertos">Chamados abertos</option>
            <option value="andamento">Em andamento</option>
            <option value="pausados">SLA pausado</option>
            <option value="resolvidos">Resolvidos</option>
            <option value="cancelados">Cancelados</option>
          </select>

          {(search || statusFilter !== "todos") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("todos");
              }}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Limpar filtros"
            >
              <RotateCcw className="size-3.5 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {/* Quantidade por página */}
        <div className="flex items-center justify-end gap-2 self-end sm:self-center">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Por página:</span>
            <select
              aria-label="Chamados públicos por página"
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-g-blue"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Indicador de carregamento */}
      {loading ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-12 text-center text-sm text-muted-foreground font-medium">
          Carregando chamados...
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <p className="text-base font-bold text-foreground">
            {search || statusFilter !== "todos" ? "Nenhum chamado encontrado" : "Você não possui chamados no momento"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search || statusFilter !== "todos"
              ? "Tente ajustar os filtros de busca para encontrar o que procura."
              : "Abra um novo chamado para relatar um incidente ou solicitar atendimento da TI."}
          </p>
          {search || statusFilter !== "todos" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("todos");
              }}
              className="mt-4"
            >
              <RotateCcw className="mr-1.5 size-3.5" /> Redefinir filtros
            </Button>
          ) : (
            <Button asChild size="sm" variant="google-green" className="mt-4 gap-1.5 font-bold shadow-xs">
              <Link to="/abrir">
                <PlusCircle className="size-4" /> Abrir novo chamado
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* VISÃO MOBILE (Cards intuitivos para telas de 360px a 640px) */}
          <div className="grid gap-3 sm:hidden">
            {visible.map((t) => {
              const sla = calcularSla(
                {
                  abertoEm: t.aberto_em,
                  hora: t.hora,
                  prioridade: t.prioridade as Ticket["prioridade"],
                  status: t.status as Ticket["status"],
                  fechadoEm: t.fechado_em,
                  horario: t.horario,
                  slaReiniciadoEm: t.sla_reiniciado_em,
                  slaPausado: t.sla_pausado,
                  slaPausadoEm: t.sla_pausado_em,
                  slaPausaMotivo: t.sla_pausa_motivo,
                  slaSegundosPausadosAcumulados: t.sla_segundos_pausados_acumulados,
                } as Ticket,
                regras,
                now,
              );

              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3 transition-colors hover:border-g-blue/50"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <span className="font-mono text-sm font-black text-g-blue">#{t.id}</span>
                    <StatusChip valor={t.status as Ticket["status"]} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Abertura</span>
                      <strong className="font-medium text-foreground">{formatarData(t.aberto_em)}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Tipo</span>
                      <strong className="font-medium text-foreground truncate block">{t.categoria || "Geral"}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Prioridade</span>
                      <div className="mt-0.5"><PrioridadeChip valor={t.prioridade as Ticket["prioridade"]} /></div>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">SLA</span>
                      <div className="mt-0.5"><SlaChip valor={sla.situacao} /></div>
                    </div>
                  </div>

                  {sla.prazo && (
                    <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 flex items-center justify-between">
                      <span>Prazo:</span>
                      <strong className="text-foreground">{formatarDataHora(sla.prazo)}</strong>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="google-blue"
                    className="w-full gap-1.5 font-bold shadow-xs text-xs"
                    disabled={isLoading}
                    onClick={() => {
                      wrapAsync(async () => {
                        setChamadoSelecionado(t);
                      }, "Abrindo chamado...");
                    }}
                  >
                    <Eye className="size-3.5" /> Ver chamado
                  </Button>
                </div>
              );
            })}
          </div>

          {/* VISÃO DESKTOP / TABLET (Tabela completa com colunas configuradas) */}
          <div className="hidden sm:block w-full max-w-full overflow-x-auto rounded-2xl border-2 border-g-blue/30 bg-card shadow-md">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white font-bold tracking-wide shadow-xs">
                  {isColAtiva("verChamado") && (
                    <th className="whitespace-nowrap px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-white border-r border-white/10">
                      Ver chamado
                    </th>
                  )}
                  {isColAtiva("numero") && (
                    <th className="whitespace-nowrap px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-white border-r border-white/10">
                      Nº
                    </th>
                  )}
                  {isColAtiva("abertura") && (
                    <th className="whitespace-nowrap px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-white border-r border-white/10">
                      Abertura
                    </th>
                  )}
                  {isColAtiva("status") && (
                    <th className="whitespace-nowrap px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-white border-r border-white/10">
                      Status
                    </th>
                  )}
                  {isColAtiva("prioridade") && (
                    <th className="whitespace-nowrap px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-white border-r border-white/10">
                      Prioridade
                    </th>
                  )}
                  {isColAtiva("sla") && (
                    <th className="whitespace-nowrap px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-white border-r border-white/10">
                      SLA
                    </th>
                  )}
                  {isColAtiva("prazo") && (
                    <th className="whitespace-nowrap px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-white">
                      Prazo
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => {
                  const sla = calcularSla(
                    {
                      abertoEm: t.aberto_em,
                      hora: t.hora,
                      prioridade: t.prioridade as Ticket["prioridade"],
                      status: t.status as Ticket["status"],
                      fechadoEm: t.fechado_em,
                      horario: t.horario,
                      slaReiniciadoEm: t.sla_reiniciado_em,
                      slaPausado: t.sla_pausado,
                      slaPausadoEm: t.sla_pausado_em,
                      slaPausaMotivo: t.sla_pausa_motivo,
                      slaSegundosPausadosAcumulados: t.sla_segundos_pausados_acumulados,
                    } as Ticket,
                    regras,
                    now,
                  );

                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border/80 transition-colors hover:bg-blue-50/70 dark:hover:bg-blue-950/30 even:bg-muted/30"
                    >
                      {isColAtiva("verChamado") && (
                        <td className="px-3.5 py-3.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="google-blue"
                            disabled={isLoading}
                            onClick={() => {
                              wrapAsync(async () => {
                                setChamadoSelecionado(t);
                              }, "Abrindo chamado...");
                            }}
                            className="gap-1.5 font-semibold text-xs shadow-xs"
                          >
                            <Eye className="size-3.5" /> Ver chamado
                          </Button>
                        </td>
                      )}
                      {isColAtiva("numero") && (
                        <td className="px-3.5 py-3.5 font-mono font-bold text-g-blue">
                          #{t.id}
                        </td>
                      )}
                      {isColAtiva("abertura") && (
                        <td className="px-3.5 py-3.5 font-medium whitespace-nowrap">
                          {formatarData(t.aberto_em)}
                        </td>
                      )}
                      {isColAtiva("status") && (
                        <td className="px-3.5 py-3.5 whitespace-nowrap">
                          <StatusChip valor={t.status as Ticket["status"]} />
                        </td>
                      )}
                      {isColAtiva("prioridade") && (
                        <td className="px-3.5 py-3.5 whitespace-nowrap">
                          <PrioridadeChip valor={t.prioridade as Ticket["prioridade"]} />
                        </td>
                      )}
                      {isColAtiva("sla") && (
                        <td className="px-3.5 py-3.5 whitespace-nowrap">
                          <SlaChip valor={sla.situacao} />
                        </td>
                      )}
                      {isColAtiva("prazo") && (
                        <td className="whitespace-nowrap px-3.5 py-3.5 text-xs font-medium text-foreground">
                          {formatarDataHora(sla.prazo)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Paginação e Contador */}
      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm pt-2">
        <span className="text-muted-foreground text-xs sm:text-sm">
          {filtered.length} chamados · página {currentPage} de {pages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((x) => x - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pages}
            onClick={() => setPage((x) => x + 1)}
          >
            Próxima
          </Button>
        </div>
      </footer>

      {/* MODAL DE DETALHES DO CHAMADO AO CLICAR EM "VER CHAMADO" */}
      <Dialog open={!!chamadoSelecionado} onOpenChange={(open) => !open && setChamadoSelecionado(null)}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] sm:w-full">
          {chamadoSelecionado && (() => {
            const t = chamadoSelecionado;
            const sla = calcularSla(
              {
                abertoEm: t.aberto_em,
                hora: t.hora,
                prioridade: t.prioridade as Ticket["prioridade"],
                status: t.status as Ticket["status"],
                fechadoEm: t.fechado_em,
                horario: t.horario,
                slaReiniciadoEm: t.sla_reiniciado_em,
                slaPausado: t.sla_pausado,
                slaPausadoEm: t.sla_pausado_em,
                slaPausaMotivo: t.sla_pausa_motivo,
                slaSegundosPausadosAcumulados: t.sla_segundos_pausados_acumulados,
              } as Ticket,
              regras,
              now,
            );

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2 pr-6">
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-g-blue">
                      Protocolo #{t.id}
                    </span>
                    <StatusChip valor={t.status as Ticket["status"]} />
                  </div>
                  <DialogTitle className="text-xl font-bold text-foreground mt-1">
                    Detalhes do Chamado #{t.id}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Acompanhamento e situação pública do atendimento
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 py-2 text-sm">
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3.5 border border-border/80">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block">Data de abertura</span>
                      <strong className="font-medium text-foreground block">
                        {formatarData(t.aberto_em)} {t.hora ? `às ${t.hora}` : ""}
                      </strong>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block">Prioridade</span>
                      <div className="mt-1"><PrioridadeChip valor={t.prioridade as Ticket["prioridade"]} /></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3.5 border border-border/80">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block">Tipo / Categoria</span>
                      <strong className="font-medium text-foreground block truncate">{t.categoria || "Geral"}</strong>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block">Situação do SLA</span>
                      <div className="mt-1"><SlaChip valor={sla.situacao} /></div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-3.5 border border-border/80 space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground block">Prazo de conclusão previsto</span>
                    <strong className="font-semibold text-foreground text-sm block">
                      {sla.prazo ? formatarDataHora(sla.prazo) : "Não aplicável ou concluído"}
                    </strong>
                    {t.fechado_em && (
                      <p className="text-xs text-g-green font-medium pt-1">
                        ✓ Concluído em: {formatarData(t.fechado_em)} {t.horario ? `às ${t.horario}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 p-3 text-xs text-muted-foreground space-y-1.5">
                    <p className="font-semibold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-g-blue" />
                      Privacidade & Dados Protegidos (LGPD)
                    </p>
                    <p className="leading-relaxed">
                      Os dados pessoais como nome, telefone, local exato e descrição completa são restritos para proteger sua privacidade.
                    </p>
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                  {isGestor && (
                    <Button asChild variant="google-green" size="sm" className="w-full sm:w-auto font-bold">
                      <Link to="/chamados/$ticketId" params={{ ticketId: String(t.id) }}>
                        <ExternalLink className="mr-1.5 size-4" /> Atender como Gestor
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link to="/meus-chamados">
                      Ver em Meus Chamados
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setChamadoSelecionado(null)} className="w-full sm:w-auto">
                    Fechar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </section>
  );
}