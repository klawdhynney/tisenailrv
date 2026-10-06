import { createFileRoute } from "@tanstack/react-router";
import { LgpdPage } from "@/pages/Lgpd";

export const Route = createFileRoute("/lgpd")({
  head: () => ({
    meta: [
      { title: "Privacidade e Proteção de Dados (LGPD) | TI SENAI LRV" },
      {
        name: "description",
        content:
          "Política de privacidade e proteção de dados pessoais da Central de Chamados de TI em conformidade com a LGPD (Lei nº 13.709/2018).",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tisenailrv.app/lgpd" },
      { property: "og:title", content: "Privacidade e Proteção de Dados (LGPD) | TI SENAI LRV" },
      {
        property: "og:description",
        content:
          "Saiba quais dados coletamos, como usamos e como seus direitos são protegidos pela LGPD na Central de Chamados de TI.",
      },
      { property: "og:image", content: "https://tisenailrv.app/capa.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Privacidade e Proteção de Dados (LGPD) | TI SENAI LRV" },
      {
        name: "twitter:description",
        content:
          "Saiba quais dados coletamos, como usamos e como seus direitos são protegidos pela LGPD na Central de Chamados de TI.",
      },
      { name: "twitter:image", content: "https://tisenailrv.app/capa.webp" },
    ],
    links: [
      { rel: "canonical", href: "https://tisenailrv.app/lgpd" },
    ],
  }),
  component: LgpdPage,
});
