import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { MESES_DISPONIVEIS, PRIORIDADES, STATUS_LIST, CORES_PRIORIDADE, CORES_STATUS, type Prioridade, type Status } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard público | CENTRAL DE CHAMADOS DE TI SENAI LRV" },
    { name: "description", content: "Indicadores públicos e atualizados dos chamados de TI SENAI LRV." },
    { property: "og:title", content: "Dashboard de Chamados de TI SENAI LRV" },
    { property: "og:description", content: "Acompanhe os indicadores públicos dos chamados de TI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Dashboard,
});

const CORES = ["var(--g-blue)", "var(--g-red)", "var(--g-yellow)", "var(--g-green)", "var(--chart-4)", "var(--chart-5)"];

function Grafico({ titulo, dados, aoClicar }: { titulo: string; dados: { name: string; value: number }[]; aoClicar?: (name: string) => void }) {
  return <section className="min-w-0 border-t-2 border-border pt-5">
    <h2 className="mb-5 text-lg font-semibold">{titulo}</h2>
    <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart>
      <Pie data={dados} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} onClick={(d: { name?: string }) => d.name && aoClicar?.(d.name)}>
        {dados.map((d, i) => <Cell key={d.name} fill={CORES[i % CORES.length]} cursor={aoClicar ? "pointer" : "default"} />)}
      </Pie><Tooltip /><Legend verticalAlign="bottom" height={48} />
    </PieChart></ResponsiveContainer></div>
  </section>;
}

function Dashboard() {
  const { publicStats } = useStore();
  const [mes, setMes] = useState("2026-09");
  const [prioridade, setPrioridade] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const [foco, setFoco] = useState<{ tipo: "setor" | "categoria"; nome: string } | null>(null);
  const linhas = useMemo(() => publicStats.filter((r) => (mes === "todos" || r.mes === mes) && (prioridade === "Todas" || r.prioridade === prioridade) && (status === "Todos" || r.status === status) && (!foco || r[foco.tipo] === foco.nome)), [publicStats, mes, prioridade, status, foco]);
  const total = linhas.reduce((n, r) => n + r.total, 0);
  const resolvidos = linhas.filter((r) => r.status === "Resolvido").reduce((n, r) => n + r.total, 0);
  const abertos = linhas.filter((r) => !["Resolvido", "Cancelado"].includes(r.status)).reduce((n, r) => n + r.total, 0);
  const contar = (campo: "categoria" | "setor" | "prioridade" | "status") => {
    const map = new Map<string, number>();
    for (const r of linhas) map.set(r[campo], (map.get(r[campo]) ?? 0) + r.total);
    return [...map].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  const categorias = contar("categoria"), setores = contar("setor");
  const baixar = () => {
    const rows = [["Categoria", "Chamados"], ...categorias.map((r) => [r.name, String(r.value)]), ["Setor", "Chamados"], ...setores.map((r) => [r.name, String(r.value)])];
    const blob = new Blob(["\uFEFF" + rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `dashboard-${mes}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Dashboard de chamados</h1><p className="mt-1 text-muted-foreground">Indicadores atualizados dos chamados registrados.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => window.print()} title="Imprimir"><Printer className="size-4" /><span className="sr-only">Imprimir</span></Button><Button variant="outline" onClick={baixar} title="Exportar"><Download className="size-4" /><span className="sr-only">Exportar</span></Button></div></header>
    <div className="flex flex-wrap gap-3 border-y border-border py-4">
      <select aria-label="Mês" className="h-10 rounded border border-input bg-background px-3" value={mes} onChange={(e) => setMes(e.target.value)}>{MESES_DISPONIVEIS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}<option value="todos">Todos os meses</option></select>
      <select aria-label="Prioridade" className="h-10 rounded border border-input bg-background px-3" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}><option>Todas</option>{PRIORIDADES.map((p) => <option key={p}>{p}</option>)}</select>
      <select aria-label="Status" className="h-10 rounded border border-input bg-background px-3" value={status} onChange={(e) => setStatus(e.target.value)}><option>Todos</option>{STATUS_LIST.map((s) => <option key={s}>{s}</option>)}</select>
      {foco && <Button variant="outline" onClick={() => setFoco(null)}>{foco.nome} ×</Button>}
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[["Total de chamados", total, "border-g-blue"], ["Em atendimento", abertos, "border-g-yellow"], ["Resolvidos", resolvidos, "border-g-green"]].map(([label, count, border]) => <div key={String(label)} className={`border-l-4 ${border} bg-card p-5`}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold">{count}</p></div>)}</div>
    <div className="grid gap-8 lg:grid-cols-2"><Grafico titulo="Problemas mais recorrentes" dados={categorias} aoClicar={(nome) => setFoco({ tipo: "categoria", nome })} /><Grafico titulo="Setores que mais abrem chamados" dados={setores} aoClicar={(nome) => setFoco({ tipo: "setor", nome })} />
      <section className="min-w-0 border-t-2 border-border pt-5"><h2 className="mb-5 text-lg font-semibold">Por prioridade</h2><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={contar("prioridade")}><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value">{contar("prioridade").map((r) => <Cell key={r.name} fill={CORES_PRIORIDADE[r.name as Prioridade]?.bg ?? CORES[0]} />)}</Bar></BarChart></ResponsiveContainer></div></section>
      <Grafico titulo="Por status" dados={contar("status").map((r) => ({ ...r, color: CORES_STATUS[r.name as Status]?.bg }))} />
    </div>
  </div>;
}