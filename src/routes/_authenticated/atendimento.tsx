import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, FileText, Headset } from "lucide-react";
import { TicketSheet } from "@/components/TicketSheet";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import { exportarPdf, exportarXlsx, ticketsParaLinhas } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/atendimento")({
  head: () => ({
    meta: [
      { title: "Atendimento de chamados | TI Senai LRV" },
      { name: "description", content: "Fila de chamados recebidos para a equipe de TI assumir, atualizar e resolver." },
      { property: "og:title", content: "Atendimento de Chamados" },
      { property: "og:description", content: "Fila de atendimento da equipe de TI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Atendimento,
});

function Atendimento() {
  const { tickets, regras } = useStore();
  const dadosExportacao = () => ticketsParaLinhas(tickets, regras.planilha?.exportacao);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <span className="rounded-xl bg-g-blue/15 p-2 text-g-blue">
              <Headset className="size-7" />
            </span>
            Atendimento de Chamados
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Fila operacional de chamados técnicos para triagem, atualização de status e cumprimento de SLA.
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => exportarXlsx(dadosExportacao(), "Planilha_Atendimento_TI")}
          >
            <FileSpreadsheet className="size-4" /> Baixar Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => exportarPdf(dadosExportacao(), "Planilha_Atendimento_TI", "Planilha de Atendimento de Chamados")}
          >
            <FileText className="size-4" /> Baixar PDF
          </Button>
        </div>
      </header>
      <TicketSheet attendance />
    </div>
  );
}
