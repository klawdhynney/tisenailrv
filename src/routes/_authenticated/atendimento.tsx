import { createFileRoute } from "@tanstack/react-router";
import { TicketSheet } from "@/components/TicketSheet";

export const Route = createFileRoute("/_authenticated/atendimento")({
  head: () => ({
    meta: [
      { title: "Atendimento de Chamados | TI Senai LRV" },
      {
        name: "description",
        content:
          "Central de Atendimento ao Usuário: gerencie chamados, atualize status, registre procedimentos e acompanhe os prazos de SLA.",
      },
      { property: "og:title", content: "Central de Atendimento ao Usuário" },
      { property: "og:description", content: "Fila de atendimento da equipe de TI do SENAI LRV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Atendimento,
});

function Atendimento() {
  return <TicketSheet attendance />;
}
