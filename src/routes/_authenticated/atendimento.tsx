import { createFileRoute } from "@tanstack/react-router";
import { Headset } from "lucide-react";
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
    <div className="rounded-2xl border-l-4 border-g-blue bg-card px-5 py-5 text-center shadow-sm"><div className="flex items-center justify-center gap-3"><span className="rounded-xl bg-g-blue/15 p-3 text-g-blue"><Headset className="size-7" /></span><h1 className="text-3xl font-bold">Atendimento</h1></div><p className="mt-2 text-muted-foreground">Selecione “Atender” para iniciar o atendimento e salvar alterações.</p></div>
    <TicketSheet attendance />
  </div>;
}
