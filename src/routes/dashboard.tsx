import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Download, Printer, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { MESES_DISPONIVEIS, PRIORIDADES, STATUS_LIST, CORES_PRIORIDADE, CORES_STATUS, type Prioridade, type Status } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard público | TI Senai LRV" },
    { name: "description", content: "Gráficos interativos e indicadores públicos dos chamados de TI Senai LRV." },
    { property: "og:title", content: "Dashboard de chamados | TI Senai LRV" },
    { property: "og:description", content: "Acompanhe os indicadores públicos dos chamados de TI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Dashboard,
});

const CORES = ["var(--g-blue)", "var(--g-red)", "var(--g-yellow)", "var(--g-green)", "var(--chart-4)", "var(--chart-5)"];
const VISOES = [
  { id: "problemas", label: "Problemas recorrentes", color: "blue" },
  { id: "setores", label: "Setores", color: "red" },
  { id: "prioridades", label: "Prioridades", color: "yellow" },
  { id: "status", label: "Status", color: "green" },
] as const;
type Visao = (typeof VISOES)[number]["id"];
type Item = { name: string; value: number };

function GraficoPizza({ dados, cores, aoClicar }: { dados: Item[]; cores?: (name: string, i: number) => string; aoClicar?: (name: string) => void }) {
  if (!dados.length) return <p className="py-24 text-center text-muted-foreground">Nenhum chamado encontrado neste recorte.</p>;
  return <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,1fr)]">
    <div className="h-[340px] min-w-0 sm:h-[430px]">
      <ResponsiveContainer width="100%" height="100%"><PieChart>
        <Pie data={dados} dataKey="value" nameKey="name" innerRadius="32%" outerRadius="75%" paddingAngle={2} onClick={(d: { name?: string }) => d.name && aoClicar?.(d.name)}>
          {dados.map((d, i) => <Cell key={d.name} fill={cores?.(d.name, i) ?? CORES[i % CORES.length]} cursor={aoClicar ? "pointer" : "default"} />)}
        </Pie><Tooltip formatter={(value) => [`${value} chamados`, "Total"]} />
      </PieChart></ResponsiveContainer>
    </div>
    <div className="max-h-[390px] space-y-1 overflow-y-auto" aria-label="Detalhamento do gráfico">
      {dados.map((d, i) => <div key={d.name} className="flex items-center gap-3 border-b border-border py-2 text-sm">
        <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: cores?.(d.name, i) ?? CORES[i % CORES.length] }} />
        {aoClicar ? <Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start whitespace-normal text-left font-medium" onClick={() => aoClicar(d.name)}>{d.name}</Button> : <span className="min-w-0 flex-1 font-medium">{d.name}</span>}
        <strong>{d.value}</strong><span className="w-12 text-right text-muted-foreground">{Math.round(d.value / dados.reduce((n, x) => n + x.value, 0) * 100)}%</span>
      </div>)}
    </div>
  </div>;
}

function Dashboard() {
  const { publicStats, isGestor } = useStore();
  const [mes, setMes] = useState("2026-09");
  const [prioridade, setPrioridade] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const [visao, setVisao] = useState<Visao>("problemas");
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
  const dados = visao === "problemas" ? categorias : visao === "setores" ? setores : contar(visao === "prioridades" ? "prioridade" : "status");
  const baixar = () => {
    const rows = [["Categoria", "Chamados"], ...categorias.map((r) => [r.name, String(r.value)]), ["Setor", "Chamados"], ...setores.map((r) => [r.name, String(r.value)])];
    const blob = new Blob(["\uFEFF" + rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `dashboard-${mes}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-7">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold uppercase text-primary">Indicadores públicos</p><h1 className="mt-2 text-3xl font-bold">Dashboard de chamados</h1><p className="mt-1 text-muted-foreground">Acompanhamento atualizado dos chamados registrados.</p></div>
      <div className="flex flex-wrap gap-2">{isGestor && <Button asChild variant="outline"><Link to="/chamados"><Table2 /> Planilha completa</Link></Button>}<Button variant="outline" onClick={() => window.print()} title="Imprimir" aria-label="Imprimir"><Printer /></Button><Button variant="outline" onClick={baixar} title="Exportar indicadores" aria-label="Exportar indicadores"><Download /></Button></div></header>
    <div className="flex flex-wrap gap-3 border-y border-border py-4">
      <select aria-label="Mês" className="h-10 rounded border border-input bg-background px-3" value={mes} onChange={(e) => setMes(e.target.value)}>{MESES_DISPONIVEIS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}<option value="todos">Todos os meses</option></select>
      <select aria-label="Prioridade" className="h-10 rounded border border-input bg-background px-3" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}><option>Todas</option>{PRIORIDADES.map((p) => <option key={p}>{p}</option>)}</select>
      <select aria-label="Status" className="h-10 rounded border border-input bg-background px-3" value={status} onChange={(e) => setStatus(e.target.value)}><option>Todos</option>{STATUS_LIST.map((s) => <option key={s}>{s}</option>)}</select>
      {foco && <Button variant="outline" onClick={() => setFoco(null)}>{foco.nome} ×</Button>}
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[["Total de chamados", total, "border-g-blue"], ["Em atendimento", abertos, "border-g-yellow"], ["Resolvidos", resolvidos, "border-g-green"]].map(([label, count, border]) => <div key={String(label)} className={`border-l-4 ${border} bg-card p-5 shadow-sm`}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold">{count}</p></div>)}</div>
    <nav aria-label="Gráficos do dashboard" className="grid grid-cols-2 gap-2 md:grid-cols-4">{VISOES.map((v) => <Button key={v.id} variant={visao === v.id ? `google-${v.color}` as "google-blue" : "outline"} className="h-auto min-h-12 whitespace-normal py-2 text-center" onClick={() => setVisao(v.id)}>{v.label}</Button>)}</nav>
    <section className="min-w-0 border-t-2 border-border pt-6" aria-live="polite">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-2xl font-bold">{VISOES.find((v) => v.id === visao)?.label}</h2><p className="text-sm text-muted-foreground">{total} chamado(s) no período selecionado</p></div>
      {visao === "prioridades" && dados.length ? <div className="h-[370px] min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={dados} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fill: "var(--foreground)" }} /><YAxis allowDecimals={false} tick={{ fill: "var(--foreground)" }} /><Tooltip /><Bar dataKey="value" name="Chamados" radius={[4, 4, 0, 0]}>{dados.map((d) => <Cell key={d.name} fill={CORES_PRIORIDADE[d.name as Prioridade]?.bg ?? CORES[0]} />)}</Bar></BarChart></ResponsiveContainer></div> : <GraficoPizza dados={dados} cores={visao === "status" ? (name) => CORES_STATUS[name as Status]?.bg ?? CORES[0] : undefined} aoClicar={visao === "problemas" ? (nome) => setFoco({ tipo: "categoria", nome }) : visao === "setores" ? (nome) => setFoco({ tipo: "setor", nome }) : undefined} />}
    </section>
  </div>;
}
