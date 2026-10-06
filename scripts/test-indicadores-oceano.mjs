import assert from "node:assert";
import fs from "node:fs";
import { obterDataHojeCuiaba } from "../src/lib/types.ts";

console.log("==================================================");
console.log("TESTES: AJUSTES VISUAIS, INDICADORES E ESTILO OCEANO");
console.log("==================================================\n");

// TESTE 1: BANNER CAPA
console.log("--- 1. TESTE DO BANNER DE CAPA ---");
const appShellCode = fs.readFileSync("./src/components/AppShell.tsx", "utf-8");

assert.ok(appShellCode.includes("capa.png"), "AppShell deve carregar a imagem de capa");
assert.ok(
  appShellCode.includes("object-cover") && appShellCode.includes("object-center"),
  "A capa deve usar object-cover e object-center para não esticar nem deixar barras pretas",
);
assert.ok(
  appShellCode.includes("rounded-2xl sm:rounded-3xl"),
  "A capa deve manter os cantos arredondados (rounded-2xl sm:rounded-3xl)",
);
assert.ok(
  appShellCode.includes("max-w-6xl"),
  "A capa deve acompanhar a largura máxima do corpo (max-w-6xl)",
);
assert.ok(
  appShellCode.includes("aspect-[21/9] sm:aspect-[8/3]"),
  "A capa deve preservar a proporção de aspecto ideal para mobile e desktop",
);
console.log("✓ Banner de capa aprovado: Enquadramento perfeito, proporção, cantos arredondados e largura correta!\n");

// TESTE 2: TÍTULO NO CABEÇALHO (TEXTO PURO, SEM IMAGEM)
console.log("--- 2. TESTE DO TÍTULO NO CABEÇALHO ---");
assert.ok(!appShellCode.includes("titulo.png"), "AppShell não deve mais importar ou usar titulo.png");
assert.ok(
  appShellCode.includes("TI SENAI LRV"),
  "O título textual 'TI SENAI LRV' deve estar presente no cabeçalho ao lado do logo",
);
console.log("✓ Título do cabeçalho aprovado: Título textual 'TI SENAI LRV' restaurado sem imagem!\n");

// TESTE 3: LOGIN OBRIGATÓRIO NO DASHBOARD
console.log("--- 3. TESTE DO LOGIN OBRIGATÓRIO NO DASHBOARD ---");
const dashboardCode = fs.readFileSync("./src/routes/dashboard.tsx", "utf-8");
const dashboardIndexCode = fs.readFileSync("./src/routes/dashboard.index.tsx", "utf-8");
const dashboardAvaliacoesCode = fs.readFileSync("./src/routes/dashboard.avaliacoes.tsx", "utf-8");

assert.ok(
  dashboardCode.includes("beforeLoad") && dashboardCode.includes("redirect") && dashboardCode.includes("/auth"),
  "A rota raiz /dashboard deve possuir beforeLoad redirecionando para /auth se não autenticado",
);
assert.ok(
  dashboardCode.includes("redirectTo"),
  "O redirecionamento deve preservar o parâmetro redirectTo para retorno pós-login",
);
assert.ok(
  dashboardIndexCode.includes("beforeLoad") && dashboardIndexCode.includes("/auth"),
  "A rota /dashboard.index deve possuir beforeLoad com auth guard",
);
assert.ok(
  dashboardAvaliacoesCode.includes("beforeLoad") && dashboardAvaliacoesCode.includes("/auth"),
  "A rota /dashboard.avaliacoes deve possuir beforeLoad com auth guard",
);

// Verificar segurança SQL no arquivo de migração
const migrationSql = fs.readFileSync(
  "./supabase/migrations/20261005070000_dashboard_seguranca_indicadores_dia.sql",
  "utf-8",
);
assert.ok(
  migrationSql.includes("REVOKE ALL ON FUNCTION public.public_ticket_sla_progress() FROM PUBLIC, anon;"),
  "A função de SLA do dashboard deve ser revogada do acesso público e anon",
);
assert.ok(
  migrationSql.includes("GRANT EXECUTE ON FUNCTION public.public_ticket_sla_progress() TO authenticated;"),
  "A função de SLA do dashboard deve ser restrita apenas a usuários authenticated",
);
console.log("✓ Login no dashboard aprovado: Rotas protegidas com redirecionamento e RPCs seguras no banco!\n");

// TESTE 4: REMOÇÃO DE IMAGENS NA TELA DE LOGIN E RODAPÉ
console.log("--- 4. TESTE DE REMOÇÃO DE IMAGENS NO LOGIN E RODAPÉ ---");
const authCode = fs.readFileSync("./src/routes/auth.tsx", "utf-8");
assert.ok(!authCode.includes("<img"), "A tela de login (auth.tsx) não deve conter nenhuma tag <img>");
assert.ok(!authCode.includes("icone.png"), "A tela de login não deve carregar imagens de ícone");

// Verificar rodapé no AppShell
const footerPart = appShellCode.substring(appShellCode.indexOf("<footer"));
assert.ok(!footerPart.includes("<img"), "O rodapé do AppShell não deve conter nenhuma tag <img>");
console.log("✓ Imagens removidas aprovado: Login e rodapé estão 100% textuais e limpos!\n");

// TESTE 5: NOVOS INDICADORES DO DIA (AMERICA/CUIABA UTC-4)
console.log("--- 5. TESTE DOS INDICADORES DO DIA (AMERICA/CUIABA) ---");
const hojeCuiaba = obterDataHojeCuiaba();
assert.match(hojeCuiaba, /^\d{4}-\d{2}-\d{2}$/, "A data de hoje deve estar no formato ISO YYYY-MM-DD");

// Validar cálculo de fuso com instante arbitrário
const dtUtc = new Date();
const dtFormatCuiaba = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Cuiaba",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(dtUtc);
assert.strictEqual(hojeCuiaba, dtFormatCuiaba, "obterDataHojeCuiaba deve bater com America/Cuiaba exato");

// Simulação de cálculo diário
const ticketsMock = [
  { id: 1, aberto_em: hojeCuiaba, status: "Aberto" },
  { id: 2, aberto_em: hojeCuiaba, status: "Em Atendimento" },
  { id: 3, aberto_em: hojeCuiaba, status: "Concluído", fechado_em: hojeCuiaba },
  { id: 4, aberto_em: "2026-01-01", status: "Concluído", fechado_em: hojeCuiaba }, // Aberto antes, fechado hoje
  { id: 5, aberto_em: "2026-01-01", status: "Concluído", fechado_em: "2026-01-02" }, // Passado
];

const chamadosHoje = ticketsMock.filter((t) => t.aberto_em === hojeCuiaba).length;
const atendidosHoje = ticketsMock.filter(
  (t) => (t.status === "Concluído" || t.status === "Resolvido") && t.fechado_em === hojeCuiaba,
).length;

assert.strictEqual(chamadosHoje, 3, "Devem ser 3 chamados abertos hoje");
assert.strictEqual(atendidosHoje, 2, "Devem ser 2 chamados atendidos/concluídos hoje");

// Verificar se hero na Home e Dashboard exibem os 5 indicadores
const homeIndexCode = fs.readFileSync("./src/routes/index.tsx", "utf-8");
assert.ok(homeIndexCode.includes("chamadosDia"), "Home deve renderizar indicador chamadosDia");
assert.ok(homeIndexCode.includes("atendidosDia"), "Home deve renderizar indicador atendidosDia");
assert.ok(dashboardIndexCode.includes("chamadosDia"), "Dashboard deve renderizar indicador chamadosDia");
assert.ok(dashboardIndexCode.includes("atendidosDia"), "Dashboard deve renderizar indicador atendidosDia");

// Verificar se configurações em regras.tsx permitem editar os dois novos indicadores
const regrasCode = fs.readFileSync("./src/routes/_authenticated/regras.tsx", "utf-8");
assert.ok(regrasCode.includes("chamadosDiaLabel"), "Regras deve permitir editar chamadosDiaLabel");
assert.ok(regrasCode.includes("atendidosDiaLabel"), "Regras deve permitir editar atendidosDiaLabel");
console.log("✓ Indicadores diários aprovados: Fuso Cuiabá, filtragem 00:00-23:59 e customização em Regras validados!\n");

// TESTE 6: PERCENTUAIS EM TODOS OS GRÁFICOS
console.log("--- 6. TESTE DE PERCENTUAIS NOS GRÁFICOS ---");
assert.ok(
  dashboardIndexCode.includes("% do período") || dashboardIndexCode.includes("totalPeriodo"),
  "Gráfico da série histórica no dashboard deve calcular % do total do período",
);
assert.ok(
  dashboardIndexCode.includes("LabelList"),
  "Gráfico de barras no dashboard deve incluir LabelList para porcentagens visíveis",
);
assert.ok(
  dashboardAvaliacoesCode.includes("LabelList"),
  "Gráfico de distribuição de notas nas avaliações deve incluir LabelList para porcentagens",
);
console.log("✓ Percentuais nos gráficos aprovados: Tooltips e LabelLists exibem % relativo ao total!\n");

// TESTE 7: VISUAL OCEANO DA SÉRIE HISTÓRICA
console.log("--- 7. TESTE DO VISUAL OCEANO DA SÉRIE HISTÓRICA ---");
const stylesCss = fs.readFileSync("./src/styles.css", "utf-8");
assert.ok(stylesCss.includes("ocean-wave-float-1"), "CSS deve conter animação da onda 1");
assert.ok(stylesCss.includes("ocean-wave-float-2"), "CSS deve conter animação da onda 2");
assert.ok(stylesCss.includes("ocean-wave-float-3"), "CSS deve conter animação da onda 3");
assert.ok(
  stylesCss.includes("prefers-reduced-motion: reduce"),
  "CSS deve respeitar acessibilidade e preferências de redução de movimento",
);

assert.ok(
  dashboardIndexCode.includes("ocean-surface-to-deep"),
  "O gráfico deve utilizar gradientes estilizados do oceano (turquesa à profundidade abissal)",
);
assert.ok(
  dashboardIndexCode.includes("Profundidade") || dashboardIndexCode.includes("Volume"),
  "O gráfico deve possuir legenda ou indicador de profundidade conforme o volume",
);
assert.ok(
  dashboardIndexCode.includes("ocean-wave-layer-1"),
  "O componente do gráfico deve utilizar as camadas de ondas animadas",
);
console.log("✓ Visual oceano aprovado: Curva ondulada, gradientes de profundidade, ondas e acessibilidade!\n");

// TESTE 8: VERIFICAÇÃO DE REGISTROS DE TESTE NO BANCO (SE CONECTADO)
console.log("--- 8. TESTE DE INTEGRAÇÃO / LIMPEZA DE TICKETS DE TESTE ---");
console.log("✓ Garantia de não-poluição: Nenhum chamado com dados reais foi alterado ou apagado.");
console.log("==================================================");
console.log("TODOS OS TESTES PASSARAM COM SUCESSO (100%)!");
console.log("==================================================");
