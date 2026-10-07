import { test, expect } from "@playwright/test";

test("Reproduzir erro real com chamado 57 e meus-chamados", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, text);
    if (msg.type() === "error") {
      errors.push(text);
    }
  });

  page.on("pageerror", (err) => {
    console.log(`[PAGE ERROR STACK]`, err.stack || err.message);
    errors.push(err.stack || err.message);
  });

  const mockTicket57 = {
    id: 57,
    aberto_em: "2026-10-06",
    hora: "10:30",
    solicitante: "Maria Silva",
    solicitante_email: "maria.silva@senaimt.ind.br",
    setor: "Secretaria",
    local: "Bloco A - Sala 12",
    descricao: "Computador não está ligando após a queda de energia.",
    categoria: "Computador não liga",
    prioridade: "Alta",
    responsavel: "Claudinei Lima",
    status: "Em andamento",
    fechado_em: null,
    horario: null,
    procedimento: null,
    contato: "(65) 99999-9999",
    sla_reiniciado_em: null,
    sla_pausado: false,
    sla_pausado_em: null,
    sla_pausa_motivo: null,
    sla_pausa_autor: null,
    sla_historico_pausas: [],
    sla_segundos_pausados_acumulados: 0,
  };

  // Intercepta requisições ao Supabase para simular resposta com ticket 57
  await page.route("**/rest/v1/tickets*", async (route) => {
    console.log("[MOCK SUPABASE] Intercepted tickets query:", route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([mockTicket57]),
    });
  });

  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "sb-mock-user",
      JSON.stringify({
        id: "teste-auto-gestor-01",
        email: "teste.gestor@senailrv.local",
        role: "gestor",
        user_metadata: { full_name: "Gestor Teste", role: "gestor" },
      })
    );
  });

  console.log("\n=== NAVEGANDO PARA /chamados/57 COM DADO DO CHAMADO 57 ===");
  await page.goto("/chamados/57");
  await page.waitForTimeout(4000);

  const text57 = await page.evaluate(() => document.body.innerText);
  console.log("TEXTO /chamados/57:\n", text57.slice(0, 500));

  console.log("\n=== NAVEGANDO PARA /meus-chamados ===");
  await page.evaluate(() => {
    localStorage.setItem(
      "sb-mock-user",
      JSON.stringify({
        id: "teste-auto-usuario-01",
        email: "maria.silva@senaimt.ind.br",
        role: "usuario",
        user_metadata: { full_name: "Maria Silva", role: "usuario" },
      })
    );
  });
  await page.goto("/meus-chamados");
  await page.waitForTimeout(4000);

  const textMeus = await page.evaluate(() => document.body.innerText);
  console.log("TEXTO /meus-chamados:\n", textMeus.slice(0, 500));

  console.log("\n=== TOTAL DE ERROS DETECTADOS ===", errors.length);
  for (const e of errors) {
    console.log("ERRO:", e);
  }
});
