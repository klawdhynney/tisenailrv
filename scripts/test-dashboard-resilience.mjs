import fs from "fs";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterContextProvider } from "@tanstack/react-router";
import { getRouter } from "../src/router";
import { StoreContext } from "../src/lib/store-context";
import { LoadingProvider } from "../src/lib/loading-context";

console.log("==================================================");
console.log("TESTE DE RESILIÊNCIA E CORREÇÃO DO DASHBOARD");
console.log("==================================================");

// 1. Verificar imports e sintaxe
const dashIndexCode = fs.readFileSync("src/routes/dashboard.index.tsx", "utf-8");
if (!dashIndexCode.includes('import { Badge } from "@/components/ui/badge";')) {
  throw new Error("Badge import is missing from src/routes/dashboard.index.tsx");
}
console.log("✓ Badge import presente em dashboard.index.tsx");

if (!dashIndexCode.includes('import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";')) {
  throw new Error("SectionErrorBoundary import is missing from src/routes/dashboard.index.tsx");
}
console.log("✓ SectionErrorBoundary import presente e ativo");

const rootCode = fs.readFileSync("src/routes/__root.tsx", "utf-8");
if (!rootCode.includes("isRedirect(error)")) {
  throw new Error("isRedirect error handling is missing in src/routes/__root.tsx");
}
console.log("✓ isRedirect rethrow presente em __root.tsx");

// 2. Mock de ambiente DOM
globalThis.window = {
  location: { pathname: "/dashboard", search: "" },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// 3. Teste de renderização do Dashboard
const router = getRouter();
const history = createMemoryHistory({ initialEntries: ["/dashboard"] });
router.update({ history });
await router.load();

const dashMod = await import("../src/routes/dashboard.index");
dashMod.Route.useSearch = () => ({ tipo: undefined });
const DashboardComp = dashMod.Route.options.component;

const qc = new QueryClient();
const mockStore = {
  authPronto: true,
  publicStats: [
    { mes: "2026-10", categoria: "Software", setor: "Financeiro", prioridade: "Alta", status: "Em atendimento", total: 5 },
    { mes: "2026-10", categoria: "Hardware", setor: "RH", prioridade: "Média", status: "Resolvido", total: 8 },
  ],
  dailyStats: { chamadosDoDia: 3, atendidosNoDia: 2 },
  tickets: [],
  regras: { dashboard: { visaoPadrao: "problemas" } },
  session: { user: { id: "123", email: "gestor@senaimt.ind.br" } },
  isGestor: true,
};

const htmlDashboard = renderToString(
  React.createElement(
    RouterContextProvider,
    { router },
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        StoreContext.Provider,
        { value: mockStore },
        React.createElement(
          LoadingProvider,
          null,
          React.createElement(DashboardComp)
        )
      )
    )
  )
);

if (!htmlDashboard.includes("Análise Categórica")) {
  throw new Error("Dashboard render did not contain Análise Categórica");
}
if (!htmlDashboard.includes("Dimensões &amp; Filtros") && !htmlDashboard.includes("Dimensões & Filtros")) {
  throw new Error("Dashboard render did not contain Dimensões & Filtros");
}
if (htmlDashboard.includes("This page didn't load")) {
  throw new Error("Dashboard rendered fallback error screen!");
}
console.log("✓ Renderização completa do Dashboard concluída com sucesso! (Tamanho:", htmlDashboard.length, "bytes)");

// 4. Teste de renderização da Página de Avaliações
const avalMod = await import("../src/routes/dashboard.avaliacoes");
const AvaliacoesComp = avalMod.Route.options.component;

const htmlAvaliacoes = renderToString(
  React.createElement(
    RouterContextProvider,
    { router },
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        StoreContext.Provider,
        { value: mockStore },
        React.createElement(
          LoadingProvider,
          null,
          React.createElement(AvaliacoesComp)
        )
      )
    )
  )
);

if (!htmlAvaliacoes.includes("Métricas de Avaliação") && !htmlAvaliacoes.includes("Satisfação")) {
  throw new Error("Avaliacoes render failed");
}
console.log("✓ Renderização da Página de Avaliações concluída com sucesso! (Tamanho:", htmlAvaliacoes.length, "bytes)");

console.log("==================================================");
console.log("TODOS OS TESTES DE RESILIÊNCIA PASSARAM COM SUCESSO!");
console.log("==================================================");
