import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FileSpreadsheet, FileText, Plus, Printer, SlidersHorizontal, Upload } from "lucide-react";
import { toast } from "sonner";
import { lerPlanilha } from "@/lib/importarExcel";
import { importarChamados } from "@/lib/import.functions";
import { Button } from "@/components/ui/button";
import { TicketSheet } from "@/components/TicketSheet";
import { useStore } from "@/lib/store-context";
import { exportarPdf, exportarXlsx, ticketsParaLinhas } from "@/lib/exportar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CAMPOS_EXPORTACAO } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/chamados")({
  head: () => ({
    meta: [
      { title: "Planilha de chamados | TI Senai LRV" },
      { name: "robots", content: "noindex, nofollow" },
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
  const isDetail = useRouterState({ select: state => state.location.pathname !== "/chamados" && state.location.pathname.startsWith("/chamados/") });
  if (isDetail) return <Outlet />;
  return <Planilha />;
}

function Planilha() {
  const { tickets, regras } = useStore();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [camposExportacao, setCamposExportacao] = useState<string[]>(() => regras.planilha?.exportacao ?? CAMPOS_EXPORTACAO.map((c) => c.id));

  useEffect(() => {
    if (regras.planilha?.exportacao?.length) {
      setCamposExportacao(regras.planilha.exportacao);
    }
  }, [regras.planilha?.exportacao]);

  async function importar(file?: File) {
    if (!file) return;
    setImportando(true);
    try {
      const { linhas, erros } = await lerPlanilha(file);
      if (erros.length) { toast.error(`Importação cancelada: ${erros[0]}`); return; }
      if (!linhas.length) { toast.error("Nenhuma linha de chamados encontrada."); return; }
      if (!window.confirm(`Importar ${linhas.length} chamado(s)? Confira o arquivo antes de confirmar.`)) return;
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

  const dadosExportacao = () => ticketsParaLinhas(tickets, camposExportacao);
  const toggleCampo = (id: string) => {
    setCamposExportacao((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Planilha de chamados
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Tabela consolidada de controle operacional, importação de dados e exportação de relatórios técnicos.
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
        <input ref={arquivoRef} type="file" accept=".xlsx,.xls" className="hidden" aria-label="Arquivo Excel" onChange={e => importar(e.target.files?.[0])} />
        <Button variant="outline" disabled={importando} onClick={() => arquivoRef.current?.click()}><Upload className="size-4" /> {importando ? "Importando…" : "Importar Excel"}</Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 border-g-blue/30 text-xs">
              <SlidersHorizontal className="size-4 text-g-blue" />
              Dados para exportar: {camposExportacao.length}/{CAMPOS_EXPORTACAO.length}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 space-y-3" align="end">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-sm">Dados da exportação</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-g-blue hover:underline"
                  onClick={() => setCamposExportacao(CAMPOS_EXPORTACAO.map((c) => c.id))}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setCamposExportacao([])}
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {CAMPOS_EXPORTACAO.map((campo) => {
                const checked = camposExportacao.includes(campo.id);
                return (
                  <label
                    key={campo.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCampo(campo.id)}
                      className="rounded"
                    />
                    <span className={checked ? "font-medium text-foreground" : "text-muted-foreground"}>
                      {campo.label}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Os botões Excel e PDF abaixo exportarão somente os dados marcados acima.
            </p>
          </PopoverContent>
        </Popover>

        <Button variant="outline" onClick={() => exportarXlsx(dadosExportacao(), "Chamados_TI")}><FileSpreadsheet className="size-4" /> Excel</Button>
        <Button variant="outline" onClick={() => exportarPdf(dadosExportacao(), "Chamados_TI", "Planilha de chamados")}><FileText className="size-4" /> PDF</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Imprimir</Button>
        <Button asChild>
          <Link to="/abrir">
            <Plus className="size-4" /> Novo chamado
          </Link>
        </Button>
      </div>
    </header>
    <TicketSheet />
  </div>
);
}
