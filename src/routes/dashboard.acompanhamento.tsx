import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlaChip } from "@/components/Chips";
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
    <header className="text-center"><h1 className="text-3xl font-bold">Acompanhamento dos chamados</h1><p className="mt-2 text-muted-foreground">Consulte o número, o andamento e o prazo. Dados pessoais aparecem somente na sua conta.</p></header>
    <div className="flex flex-wrap items-end justify-between gap-3"><Button asChild variant="outline"><Link to="/dashboard">Voltar ao dashboard</Link></Button><label className="grid gap-1 text-sm font-medium">Por página<select aria-label="Chamados públicos por página" className="h-10 rounded-xl border border-input bg-background px-3" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1); }}>{[10, 30, 50, 100].map(n => <option key={n}>{n}</option>)}</select></label></div>
    <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm"><thead><tr className="bg-muted">{["Ver chamado", "Nº", "Abertura", "Categoria", "Prioridade", "Status", "Fechamento", "Prazo", "SLA"].map(x => <th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody>{progress.slice((page - 1) * size, page * size).map(t => { const sla = calcularSla({ abertoEm: t.aberto_em, hora: t.hora, prioridade: t.prioridade as Ticket["prioridade"], status: t.status as Ticket["status"], fechadoEm: t.fechado_em, horario: t.horario, slaReiniciadoEm: t.sla_reiniciado_em } as Ticket, regras, now); return <tr key={t.id} className="border-b border-border even:bg-muted/40"><td className="px-3 py-3"><Button asChild size="sm" variant="outline"><Link to="/meus-chamados"><Eye /> Ver chamado</Link></Button></td><td className="px-3 py-3 font-bold">#{t.id}</td><td className="px-3 py-3">{formatarData(t.aberto_em)}</td><td className="px-3 py-3">{t.categoria}</td><td className="px-3 py-3">{t.prioridade}</td><td className="px-3 py-3">{t.status}</td><td className="px-3 py-3">{formatarData(t.fechado_em)}</td><td className="whitespace-nowrap px-3 py-3">{formatarDataHora(sla.prazo)}</td><td className="px-3 py-3"><SlaChip valor={sla.situacao} /></td></tr>; })}</tbody></table></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{progress.length} chamado(s) · página {page} de {pages}</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(x => x - 1)}>Anterior</Button><Button variant="outline" disabled={page >= pages} onClick={() => setPage(x => x + 1)}>Próxima</Button></div></div>
  </section>;
}