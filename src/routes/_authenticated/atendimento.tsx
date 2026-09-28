import { createFileRoute } from "@tanstack/react-router";
import { TicketSheet } from "@/components/TicketSheet";

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
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold">Atendimento</h1><p className="text-muted-foreground">Selecione “Ver chamado” para atender e salvar alterações.</p></div>
    <TicketSheet attendance />
  </div>;
}
