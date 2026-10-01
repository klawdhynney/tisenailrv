import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrioridadeChip, SlaChip, StatusChip } from "@/components/Chips";
import { useStore } from "@/lib/store-context";
import { calcularSla, formatarData, formatarDataHora } from "@/lib/sla";
import type { Ticket } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/dashboard/acompanhamento")({
  component: Acompanhamento,
  head: () => ({ meta: [{ title: "Acompanhar chamados | TI SENAI LRV" }] }),
});

function Acompanhamento() {
  const { regras } = useStore();
  const [progress, setProgress] = useState<Database["public"]["Functions"]["public_ticket_sla_progress"]["Returns"]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const all: typeof progress = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.rpc("public_ticket_sla_progress").range(offset, offset + 999);
        if (error) { console.error("Falha ao carregar acompanhamento", error.message); return; }
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      if (mounted) setProgress(all);
    };
    void load();
    const channel = supabase.channel("public-progress-page").on("postgres_changes", { event: "*", schema: "public", table: "ticket_public_stats" }, () => void load()).subscribe();
    return () => { mounted = false; void supabase.removeChannel(channel); };
  }, []);
  const pages = Math.max(1, Math.ceil(progress.length / size));
  return <section className="space-y-5">
    <header className="text-center"><h1 className="text-3xl font-bold">Acompanhamento dos chamados</h1></header>
    <div className="flex flex-wrap items-end justify-between gap-3"><Button asChild variant="outline"><Link to="/dashboard">Voltar ao dashboard</Link></Button><label className="grid gap-1 text-sm font-medium">Por página<select aria-label="Chamados públicos por página" className="h-10 rounded-xl border border-input bg-background px-3" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1); }}>{[10, 30, 50, 100].map(n => <option key={n}>{n}</option>)}</select></label></div>
    <div className="overflow-x-auto rounded-xl border-2 border-g-blue/30 bg-card shadow-md">
      <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white font-bold tracking-wide shadow-sm">
            {["Ver chamado", "Nº", "Abertura", "Categoria", "Prioridade", "Status", "Fechamento", "Prazo", "SLA"].map((x) => (
              <th key={x} className="whitespace-nowrap px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-white border-r border-white/10 last:border-r-0">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {progress.slice((page - 1) * size, page * size).map((t) => {
            const sla = calcularSla({ abertoEm: t.aberto_em, hora: t.hora, prioridade: t.prioridade as Ticket["prioridade"], status: t.status as Ticket["status"], fechadoEm: t.fechado_em, horario: t.horario, slaReiniciadoEm: t.sla_reiniciado_em } as Ticket, regras, now);
            return (
              <tr key={t.id} className="border-b border-border/80 transition-colors hover:bg-blue-50/70 dark:hover:bg-blue-950/30 even:bg-muted/30">
                <td className="px-3.5 py-3.5">
                  <Button asChild size="sm" variant="google-blue">
                    <Link to="/meus-chamados">
                      <Eye className="size-4" /> Ver chamado
                    </Link>
                  </Button>
                </td>
                <td className="px-3.5 py-3.5 font-mono font-bold text-g-blue">#{t.id}</td>
                <td className="px-3.5 py-3.5 font-medium">{formatarData(t.aberto_em)}</td>
                <td className="px-3.5 py-3.5">
                  <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                    {t.categoria}
                  </span>
                </td>
                <td className="px-3.5 py-3.5"><PrioridadeChip valor={t.prioridade as Ticket["prioridade"]} /></td>
                <td className="px-3.5 py-3.5"><StatusChip valor={t.status as Ticket["status"]} /></td>
                <td className="px-3.5 py-3.5">{formatarData(t.fechado_em)}</td>
                <td className="whitespace-nowrap px-3.5 py-3.5 text-xs font-medium text-foreground">{formatarDataHora(sla.prazo)}</td>
                <td className="px-3.5 py-3.5"><SlaChip valor={sla.situacao} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{progress.length} chamados · página {page} de {pages}</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(x => x - 1)}>Anterior</Button><Button variant="outline" disabled={page >= pages} onClick={() => setPage(x => x + 1)}>Próxima</Button></div></div>
  </section>;
}