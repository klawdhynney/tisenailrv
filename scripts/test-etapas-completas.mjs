import assert from "node:assert";
import fs from "node:fs";

console.log("==================================================");
console.log("VALIDAÇÃO RIGOROSA DAS ETAPAS 1 A 5");
console.log("==================================================\n");

// ETAPA 1
console.log(">> Testando ETAPA 1: Gráficos de Satisfação na Página de Avaliações...");
const dashIndex = fs.readFileSync("./src/routes/dashboard.index.tsx", "utf-8");
assert.ok(!dashIndex.includes("<DashboardSatisfacao"), "Dashboard principal não deve renderizar DashboardSatisfacao no rodapé");
assert.ok(dashIndex.includes('to="/dashboard/avaliacoes"'), "Dashboard principal deve apontar para /dashboard/avaliacoes");

const dashAvaliacoes = fs.readFileSync("./src/routes/dashboard.avaliacoes.tsx", "utf-8");
assert.ok(dashAvaliacoes.includes("<DashboardSatisfacao"), "dashboard.avaliacoes.tsx deve renderizar DashboardSatisfacao");
assert.ok(dashAvaliacoes.includes("MESES_DISPONIVEIS"), "dashboard.avaliacoes.tsx deve conter filtro de meses");
assert.ok(dashAvaliacoes.includes('periodo === "7d"'), "dashboard.avaliacoes.tsx deve conter filtros rápidos de período");
assert.ok(!dashAvaliacoes.includes("Acesso Restrito"), "dashboard.avaliacoes.tsx não deve barrar usuários com tela de acesso restrito");
console.log("✓ ETAPA 1 validada com sucesso!\n");

// ETAPA 2
console.log(">> Testando ETAPA 2: Exportações formatadas e remoção de Imprimir...");
const exportarCode = fs.readFileSync("./src/lib/exportar.ts", "utf-8");
assert.ok(exportarCode.includes("fontSize: 12"), "PDF deve usar fonte tamanho 12");
assert.ok(exportarCode.includes('overflow: "linebreak"'), "PDF deve usar quebra automática de linha");
assert.ok(exportarCode.includes("fillColor: [26, 115, 232]"), "PDF deve usar azul Google padrão do projeto");
assert.ok(exportarCode.includes('rowPageBreak: "avoid"'), "PDF deve evitar cortar linhas entre páginas");
assert.ok(exportarCode.includes('planilha["!cols"] = larguras'), "XLSX deve calcular largura de colunas");
assert.ok(exportarCode.includes('planilha["!freeze"]'), "XLSX deve congelar primeira linha");
assert.ok(exportarCode.includes('planilha["!views"]'), "XLSX deve configurar visualização congelada");
assert.ok(exportarCode.includes("sz: 12"), "XLSX deve configurar fonte tamanho 12");
assert.ok(exportarCode.includes("wrapText: true"), "XLSX deve configurar quebra automática de linha");

// Confirmando ausência de Imprimir e window.print
const atendimentoCode = fs.readFileSync("./src/routes/_authenticated/atendimento.tsx", "utf-8");
assert.ok(!atendimentoCode.includes("Printer"), "atendimento.tsx não deve importar Printer");
assert.ok(!atendimentoCode.includes("window.print"), "atendimento.tsx não deve ter window.print");
assert.ok(!atendimentoCode.includes("Imprimir"), "atendimento.tsx não deve ter botão Imprimir");

const chamadosCode = fs.readFileSync("./src/routes/_authenticated/chamados.tsx", "utf-8");
assert.ok(!chamadosCode.includes("Printer"), "chamados.tsx não deve importar Printer");
assert.ok(!chamadosCode.includes("window.print"), "chamados.tsx não deve ter window.print");
assert.ok(!chamadosCode.includes("Imprimir"), "chamados.tsx não deve ter botão Imprimir");

assert.ok(!dashIndex.includes("Printer"), "dashboard.index.tsx não deve importar Printer");
assert.ok(!dashIndex.includes("window.print"), "dashboard.index.tsx não deve ter window.print");
assert.ok(!dashIndex.includes("Imprimir"), "dashboard.index.tsx não deve ter botão Imprimir");
console.log("✓ ETAPA 2 validada com sucesso!\n");

// ETAPA 3
console.log(">> Testando ETAPA 3: Remoção de Usuários da barra de título...");
const appShellCode = fs.readFileSync("./src/components/AppShell.tsx", "utf-8");
assert.ok(!appShellCode.includes('{ to: "/usuarios", label: "Usuários"'), "AppShell não deve ter atalho de Usuários no array itens do topo");
assert.ok(appShellCode.includes('<Link to="/usuarios" className="flex items-center gap-2">'), "AppShell deve manter o acesso no menu dropdown de usuário");
assert.ok(fs.existsSync("./src/routes/_authenticated/usuarios.tsx"), "Rota /usuarios deve continuar existindo");
console.log("✓ ETAPA 3 validada com sucesso!\n");

// ETAPA 4
console.log(">> Testando ETAPA 4: Indicadores na página inicial em largura total...");
const homeCode = fs.readFileSync("./src/routes/index.tsx", "utf-8");
assert.ok(homeCode.includes("w-full px-4 sm:px-6 md:px-8 pb-8 pt-2"), "Cards da home devem estar em container w-full");
assert.ok(homeCode.includes("grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"), "Cards da home devem ter layout grid-cols-1 sm:grid-cols-2 lg:grid-cols-5");
console.log("✓ ETAPA 4 validada com sucesso!\n");

// ETAPA 5
console.log(">> Testando ETAPA 5: Filtros do Dashboard integrados com Análise Categórica...");
assert.ok(dashIndex.includes("Dimensões & Filtros"), "Dashboard deve ter cabeçalho unificado Dimensões & Filtros");
assert.ok(dashIndex.includes("Filtrar:"), "Dashboard deve ter linha Filtrar dentro da Análise Categórica");
assert.ok(dashIndex.includes("value={mes}"), "Filtro de mês deve manter controle de estado");
console.log("✓ ETAPA 5 validada com sucesso!\n");

console.log("==================================================");
console.log("PARABÉNS! TODAS AS ETAPAS 1 A 5 VALIDADAS COM SUCESSO!");
console.log("==================================================");
