import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { Download, FileCode2, FileSpreadsheet, FileText, Plus, Printer, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { lerPlanilha } from "@/lib/importarExcel";
import { importarChamados } from "@/lib/import.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PrioridadeChip, SlaChip, StatusChip } from "@/components/Chips";
import { mesDoTicket, useStore } from "@/lib/store";
import { calcularSla, formatarData, formatarDataHora, formatarDuracao } from "@/lib/sla";
import { exportarCsv, exportarPdf, exportarXlsx, exportarXml, ticketsParaLinhas } from "@/lib/exportar";
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
      { title: "Planilha de chamados | TI Senai LRV" },
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
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  async function importar(file?: File) {
    if (!file) return;
    setImportando(true);
    try {
      const { linhas, erros } = await lerPlanilha(file);
      if (erros.length) { toast.error(`Importação cancelada: ${erros[0]}`); return; }
      if (!linhas.length) { toast.error("Nenhuma linha de chamados encontrada."); return; }
      let inseridos = 0, ignorados = 0;
      for (let i = 0; i < linhas.length; i += 500) {
        const resultado = await importarChamados({ data: linhas.slice(i, i + 500) });
        inseridos += resultado.inseridos;
        ignorados += resultado.ignorados;
      }
      toast.success(`${inseridos} importados; ${ignorados} já existentes ignorados.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao importar arquivo."); }
    finally { setImportando(false); if (arquivoRef.current) arquivoRef.current.value = ""; }
  }

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

  const dadosExportacao = () => ticketsParaLinhas(linhas.map(({ t }) => t));
  const nomeExportacao = `Chamados_${mes}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planilha de chamados</h1>
          <p className="mt-1 text-muted-foreground">
            Uma aba por mês, com as mesmas configurações e cores automáticas.
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <input ref={arquivoRef} type="file" accept=".xlsx,.xls" className="hidden" aria-label="Arquivo Excel" onChange={(e) => importar(e.target.files?.[0])} />
          <Button variant="outline" disabled={importando} onClick={() => arquivoRef.current?.click()}><Upload className="mr-2 h-4 w-4" />{importando ? "Importando…" : "Importar Excel"}</Button>
          <Button variant="outline" onClick={() => exportarCsv(dadosExportacao(), nomeExportacao)}><Download /> CSV</Button>
          <Button variant="outline" onClick={() => exportarXlsx(dadosExportacao(), nomeExportacao)}><FileSpreadsheet /> XLSX</Button>
          <Button variant="outline" onClick={() => exportarXml(dadosExportacao(), nomeExportacao)}><FileCode2 /> XML</Button>
          <Button variant="outline" onClick={() => exportarPdf(dadosExportacao(), nomeExportacao, `Planilha de chamados — ${mes}`)}><FileText /> PDF</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer /> Imprimir</Button>
          <Button asChild>
            <Link to="/abrir">
              <Plus className="mr-2 h-4 w-4" /> Novo chamado
            </Link>
          </Button>
        </div>
      </div>

      <div className="no-print mt-6 flex flex-wrap gap-1 border-b border-border">
        {MESES_DISPONIVEIS.map((m, i) => {
          const cores = ["var(--g-blue)", "var(--g-red)", "var(--g-yellow)", "var(--g-green)"];
          const total = tickets.filter((t) => mesDoTicket(t) === m.key).length;
          const ativo = mes === m.key;
          return (
            <Button
              variant="ghost"
              key={m.key}
              onClick={() => setMes(m.key)}
              className="-mb-px h-auto rounded-t-lg border-b-4 px-4 py-2 text-sm font-semibold transition"
              style={{
                borderColor: ativo ? cores[i % 4] : "transparent",
                color: ativo ? cores[i % 4] : undefined,
                backgroundColor: ativo ? "var(--color-card)" : "transparent",
              }}
            >
              {m.label} <span className="ml-1 text-xs text-muted-foreground">({total})</span>
            </Button>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="no-print flex flex-wrap items-center gap-3">
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
                    <td className="px-3 py-2 whitespace-nowrap"><CelulaEditavel valor={t.solicitante} aoSalvar={(valor) => updateTicket(t.id, { solicitante: valor })} largura="w-36" /></td>
                    <td className="px-3 py-2 whitespace-nowrap"><CelulaEditavel valor={t.setor} aoSalvar={(valor) => updateTicket(t.id, { setor: valor })} largura="w-32" /></td>
                    <td className="px-3 py-2"><CelulaEditavel valor={t.local} aoSalvar={(valor) => updateTicket(t.id, { local: valor })} largura="w-44" /></td>
                    <td className="max-w-[320px] px-3 py-2"><CelulaEditavel valor={t.descricao} aoSalvar={(valor) => updateTicket(t.id, { descricao: valor })} largura="w-64" /></td>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-[var(--g-red)]"
                        title="Excluir chamado"
                        onClick={() => removeTicket(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

function CelulaEditavel({ valor, aoSalvar, largura }: { valor: string; aoSalvar: (valor: string) => void; largura: string }) {
  const [rascunho, setRascunho] = useState(valor);
  return <input className={`${largura} rounded border border-transparent bg-transparent px-1 py-1 hover:border-input focus:border-input focus:outline-none`} value={rascunho} onChange={(e) => setRascunho(e.target.value)} onBlur={() => rascunho !== valor && aoSalvar(rascunho.trim())} />;
}
