import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Plus, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PrioridadeChip, SlaChip, StatusChip } from "@/components/Chips";
import { mesDoTicket, useStore } from "@/lib/store";
import { calcularSla, formatarData, formatarDataHora, formatarDuracao } from "@/lib/sla";
import {
  CORES_PRIORIDADE,
  CORES_STATUS,
  MESES_DISPONIVEIS,
  PRIORIDADES,
  STATUS_LIST,
  type Prioridade,
  type Status,
} from "@/lib/types";

export const Route = createFileRoute("/_authenticated/chamados")({
  head: () => ({
    meta: [
      { title: "Planilha de Chamados | Central de TI" },
      { name: "description", content: "Planilhas mensais de chamados de TI de setembro a dezembro de 2026, com cores automáticas por prioridade e status." },
      { property: "og:title", content: "Planilha de Chamados de TI" },
      { property: "og:description", content: "Controle mensal dos chamados com SLA calculado automaticamente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chamados,
});

function Chamados() {
  const { tickets, regras, updateTicket, removeTicket } = useStore();
  const [mes, setMes] = useState("2026-09");
  const [busca, setBusca] = useState("");
  const [fPrioridade, setFPrioridade] = useState("Todas");
  const [fStatus, setFStatus] = useState("Todos");

  const linhas = useMemo(() => {
    return tickets
      .filter((t) => mesDoTicket(t) === mes)
      .filter((t) => (fPrioridade === "Todas" ? true : t.prioridade === fPrioridade))
      .filter((t) => (fStatus === "Todos" ? true : t.status === fStatus))
      .filter((t) =>
        busca.trim()
          ? [t.descricao, t.solicitante, t.setor, t.local, t.responsavel, String(t.id)]
              .join(" ")
              .toLowerCase()
              .includes(busca.toLowerCase())
          : true,
      )
      .sort((a, b) => a.id - b.id)
      .map((t) => ({ t, sla: calcularSla(t, regras) }));
  }, [tickets, regras, mes, busca, fPrioridade, fStatus]);

  function exportarCsv() {
    const head = [
      "Nº","Aberto em","Hora","Solicitante","Setor","Local","Descrição","Prioridade","Responsável","Status","Fechado em","Horário","Procedimento","Prazo do SLA","SLA",
    ];
    const linhasCsv = linhas.map(({ t, sla }) =>
      [t.id, t.abertoEm, t.hora, t.solicitante, t.setor, t.local, t.descricao, t.prioridade, t.responsavel ?? "", t.status, t.fechadoEm ?? "", t.horario ?? "", t.procedimento ?? "", formatarDataHora(sla.prazo), sla.situacao]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    );
    const blob = new Blob(["\uFEFF" + [head.join(";"), ...linhasCsv].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Chamados_${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planilha de chamados</h1>
          <p className="mt-1 text-muted-foreground">
            Uma aba por mês, com as mesmas configurações e cores automáticas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarCsv}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Button asChild>
            <Link to="/abrir">
              <Plus className="mr-2 h-4 w-4" /> Novo chamado
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {MESES_DISPONIVEIS.map((m, i) => {
          const cores = ["var(--g-blue)", "var(--g-red)", "var(--g-yellow)", "var(--g-green)"];
          const total = tickets.filter((t) => mesDoTicket(t) === m.key).length;
          const ativo = mes === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMes(m.key)}
              className="-mb-px rounded-t-lg border-b-4 px-4 py-2 text-sm font-semibold transition"
              style={{
                borderColor: ativo ? cores[i % 4] : "transparent",
                color: ativo ? cores[i % 4] : undefined,
                backgroundColor: ativo ? "var(--color-card)" : "transparent",
              }}
            >
              {m.label} <span className="ml-1 text-xs text-muted-foreground">({total})</span>
            </button>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por descrição, solicitante, setor, local..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={fPrioridade} onChange={(e) => setFPrioridade(e.target.value)}>
              <option>Todas</option>
              {PRIORIDADES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option>Todos</option>
              {STATUS_LIST.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">{linhas.length} chamado(s)</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--g-blue)] text-left text-white">
                  {["Nº","Aberto em","Solicitante","Setor","Local","Descrição do problema","Prioridade","Responsável","Status","Fechado em","Prazo do SLA","SLA",""].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map(({ t, sla }, i) => (
                  <tr key={t.id} className={i % 2 ? "bg-muted/40" : ""}>
                    <td className="px-3 py-2 font-medium">{t.id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatarData(t.abertoEm, t.hora)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t.solicitante}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t.setor}</td>
                    <td className="px-3 py-2">{t.local || "—"}</td>
                    <td className="max-w-[320px] px-3 py-2">{t.descricao}</td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-full px-2 py-1 text-xs font-semibold"
                        style={{ backgroundColor: CORES_PRIORIDADE[t.prioridade]?.bg, color: CORES_PRIORIDADE[t.prioridade]?.text }}
                        value={t.prioridade}
                        onChange={(e) => updateTicket(t.id, { prioridade: e.target.value as Prioridade })}
                      >
                        {PRIORIDADES.map((p) => (
                          <option key={p} value={p} style={{ color: "#000", background: "#fff" }}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        className="w-32 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-input"
                        value={t.responsavel ?? ""}
                        placeholder="—"
                        onChange={(e) => updateTicket(t.id, { responsavel: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-full px-2 py-1 text-xs font-semibold"
                        style={{ backgroundColor: CORES_STATUS[t.status]?.bg, color: CORES_STATUS[t.status]?.text }}
                        value={t.status}
                        onChange={(e) => {
                          const status = e.target.value as Status;
                          const hoje = new Date();
                          const fechar = status === "Resolvido" && !t.fechadoEm;
                          updateTicket(
                            t.id,
                            fechar
                              ? {
                                  status,
                                  fechadoEm: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`,
                                  horario: hoje.toTimeString().slice(0, 5),
                                }
                              : { status },
                          );
                        }}
                      >
                        {STATUS_LIST.map((s) => (
                          <option key={s} value={s} style={{ color: "#000", background: "#fff" }}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatarData(t.fechadoEm, t.horario)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatarDataHora(sla.prazo)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <SlaChip valor={sla.situacao} />
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {sla.pausadoPor ?? formatarDuracao(sla.restanteMin)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className="text-muted-foreground hover:text-[var(--g-red)]"
                        title="Excluir chamado"
                        onClick={() => removeTicket(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-3 py-10 text-center text-muted-foreground">
                      Nenhum chamado neste mês com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium">Legenda:</span>
            {PRIORIDADES.map((p) => (
              <PrioridadeChip key={p} valor={p} />
            ))}
            {STATUS_LIST.map((s) => (
              <StatusChip key={s} valor={s} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
