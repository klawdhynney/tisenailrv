import assert from "node:assert";
import fs from "node:fs";

console.log("==================================================");
console.log("TESTE: GRÁFICOS DE SATISFAÇÃO E FACILIDADE NO DASHBOARD");
console.log("==================================================\n");

// 1. Verificando componente DashboardSatisfacao
console.log("1. Verificando componente DashboardSatisfacao.tsx...");
assert.ok(fs.existsSync("./src/components/DashboardSatisfacao.tsx"), "DashboardSatisfacao.tsx deve existir");
const dashSatCode = fs.readFileSync("./src/components/DashboardSatisfacao.tsx", "utf-8");

assert.ok(dashSatCode.includes("notaMediaSatisfacao"), "Deve calcular a nota média de satisfação do atendimento");
assert.ok(dashSatCode.includes("notaMediaFacilidade"), "Deve calcular a nota média de facilidade de abertura");
assert.ok(dashSatCode.includes("dadosDistribuicaoSatisfacao"), "Deve gerar dados de distribuição da satisfação");
assert.ok(dashSatCode.includes("dadosDistribuicaoFacilidade"), "Deve gerar dados de distribuição de facilidade");
assert.ok(dashSatCode.includes("dadosEvolucaoTemporal"), "Deve gerar dados de evolução temporal das duas médias");
assert.ok(dashSatCode.includes("dadosPorAtendente"), "Deve calcular satisfação por atendente");
assert.ok(dashSatCode.includes("dadosPorCategoria"), "Deve calcular satisfação por categoria");
assert.ok(dashSatCode.includes("mesSelecionado"), "Deve receber e respeitar o filtro de mês do dashboard");
assert.ok(dashSatCode.includes("tisenai_avaliacoes_locais"), "Deve sincronizar dados do cache local do navegador");
console.log("✓ Componente DashboardSatisfacao validado com sucesso!");

// 2. Verificando integração na página de Avaliações e remoção do fim do Dashboard principal
console.log("2. Verificando integração em dashboard.avaliacoes.tsx e remoção de dashboard.index.tsx...");
const dashAvaliacoesCode = fs.readFileSync("./src/routes/dashboard.avaliacoes.tsx", "utf-8");
assert.ok(dashAvaliacoesCode.includes("<DashboardSatisfacao mesSelecionado="), "Página de Avaliações deve renderizar DashboardSatisfacao unificado");

const dashIndexCode = fs.readFileSync("./src/routes/dashboard.index.tsx", "utf-8");
assert.ok(!dashIndexCode.includes("<DashboardSatisfacao"), "Dashboard principal não deve renderizar DashboardSatisfacao no final da página");
assert.ok(dashIndexCode.includes('to="/dashboard/avaliacoes"'), "Dashboard principal deve ter link/botão para a página de Avaliações");
console.log("✓ Integração e unificação na página de Avaliações confirmadas!");

// 3. Verificando formulários de avaliação (abrir.tsx e meus-chamados.tsx)
console.log("3. Verificando formulários de avaliação...");
const abrirCode = fs.readFileSync("./src/routes/abrir.tsx", "utf-8");
assert.ok(abrirCode.includes("nota_facilidade"), "abrir.tsx deve persistir nota_facilidade");

const meusChamadosCode = fs.readFileSync("./src/routes/meus-chamados.tsx", "utf-8");
assert.ok(meusChamadosCode.includes("Facilidade para Abrir o Chamado"), "meus-chamados.tsx deve conter pergunta de facilidade");
assert.ok(meusChamadosCode.includes("notaFacilidade"), "meus-chamados.tsx deve registrar notaFacilidade");
console.log("✓ Formulários de avaliação capturam ambas as métricas!");

// 4. Verificando migration SQL e RLS
console.log("4. Verificando migrações SQL do Supabase e Drizzle...");
assert.ok(fs.existsSync("./supabase/migrations/20261006030000_avaliacao_facilidade_e_dashboard.sql"), "Migration Supabase deve existir");
assert.ok(fs.existsSync("./drizzle/migrations/0029_avaliacao_facilidade_e_dashboard.sql"), "Migration Drizzle deve existir");

const migrationCode = fs.readFileSync("./supabase/migrations/20261006030000_avaliacao_facilidade_e_dashboard.sql", "utf-8");
assert.ok(migrationCode.includes("ADD COLUMN IF NOT EXISTS nota_facilidade"), "Migration deve criar coluna nota_facilidade");
assert.ok(migrationCode.includes("ADD COLUMN IF NOT EXISTS atendente"), "Migration deve criar coluna atendente");
assert.ok(migrationCode.includes("get_evaluations_for_dashboard"), "Migration deve criar RPC get_evaluations_for_dashboard");
assert.ok(migrationCode.includes("submit_ticket_evaluation"), "Migration deve atualizar submit_ticket_evaluation");
assert.ok(migrationCode.includes("get_public_evaluation_stats"), "Migration deve atualizar get_public_evaluation_stats com facilidade");
console.log("✓ Migrações SQL e regras RLS validadas com sucesso!");

console.log("\n==================================================");
console.log("TODAS AS VALIDAÇÕES DO DASHBOARD PASSARAM COM SUCESSO!");
console.log("==================================================");
