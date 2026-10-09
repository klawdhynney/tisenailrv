import { createFileRoute } from "@tanstack/react-router";
import { Headset } from "lucide-react";
import { TicketSheet } from "@/components/TicketSheet";
import { useStore } from "@/lib/store-context";
import { ATENDIMENTO_PADRAO } from "@/lib/types";

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
  const { regras } = useStore();
  const configAtendimento = { ...ATENDIMENTO_PADRAO, ...(regras.atendimento ?? {}) };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <span className="rounded-xl bg-g-blue/15 p-2 text-g-blue">
              <Headset className="size-7" />
            </span>
            {configAtendimento.titulo || "Central de Atendimento ao Usuário"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {configAtendimento.subtitulo ||
              "Gerencie chamados, atualize status, registre procedimentos e acompanhe os prazos de SLA."}
          </p>
        </div>
      </header>
      <TicketSheet attendance />
    </div>
  );
}
