import { test, expect } from "@playwright/test";

test.describe("Validação Completa de Chamados, Finalização e Cancelamento", () => {
  const mockTickets = [
    {
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
    },
    {
      id: 58,
      aberto_em: "2026-10-06",
      hora: "14:15",
      solicitante: "João Santos",
      solicitante_email: "joao.santos@senaimt.ind.br",
      setor: "Laboratório 3",
      local: "Bloco B",
      descricao: "Impressora travando papel constantemente no setor.",
      categoria: "Impressora com problemas",
      prioridade: "Média",
      responsavel: "Claudinei Lima",
      status: "Aberto",
      fechado_em: null,
      horario: null,
      procedimento: null,
      contato: "(65) 98888-8888",
      sla_reiniciado_em: null,
      sla_pausado: false,
      sla_pausado_em: null,
      sla_pausa_motivo: null,
      sla_pausa_autor: null,
      sla_historico_pausas: [],
      sla_segundos_pausados_acumulados: 0,
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Intercepta rotas do Supabase para simular dados locais
    await page.route("**/rest/v1/tickets*", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockTickets),
        });
      } else if (method === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockTickets[0]),
        });
      } else {
        await route.continue();
      }
    });

    // Mock do chat para evitar erro 404 de tabela ausente
    await page.route("**/rest/v1/ticket_mensagens*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Mock das avaliações
    await page.route("**/rest/v1/avaliacoes_chamados*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
  });

  test("Desktop: Acessa /meus-chamados, abre /chamados/57, finaliza e cancela chamado", async ({ page }) => {
    const errorBoundaryTexts: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("[TanStack Root Error]")) {
        errorBoundaryTexts.push(msg.text());
      }
    });

    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "sb-mock-user",
        JSON.stringify({
          id: "gestor-01",
          email: "claudinei.lima@senaimt.ind.br",
          role: "gestor",
          user_metadata: { full_name: "Claudinei Lima", role: "gestor" },
        })
      );
    });

    // 1. Acesso a /meus-chamados
    await page.goto("/meus-chamados");
    await page.waitForTimeout(3000);
    const bodyMeus = await page.innerText("body");
    expect(bodyMeus).not.toContain("Não foi possível carregar a página");
    expect(bodyMeus.toLowerCase()).toContain("meus chamados");

    // 2. Acesso direto a /chamados/57
    await page.goto("/chamados/57");
    await page.waitForSelector("text=Chamado #57", { timeout: 10000 });
    const body57 = await page.innerText("body");
    expect(body57).not.toContain("Não foi possível carregar a página");
    expect(body57).toContain("Chamado #57");
    expect(body57).toContain("Finalizar chamado");
    expect(body57).toContain("Cancelar chamado");

    // 3. Teste de Finalizar Chamado via modal
    await page.click("button:has-text('Finalizar chamado')");
    await page.waitForSelector("text=Finalizar Chamado #57");
    await page.fill("textarea[placeholder*='solução técnica']", "Troca da fonte ATX realizada com sucesso.");
    await page.click("button:has-text('Confirmar e Finalizar Chamado')");
    await page.waitForTimeout(1000);

    // 4. Teste de Recarregar Direto pela URL
    await page.reload();
    await page.waitForTimeout(2000);
    const bodyReload = await page.innerText("body");
    expect(bodyReload).not.toContain("Não foi possível carregar a página");
    expect(bodyReload).toContain("Chamado #57");

    // 5. Teste de Cancelar Chamado via modal
    await page.click("button:has-text('Cancelar chamado')");
    await page.waitForSelector("text=Cancelar Chamado #57");
    await page.fill("input[placeholder*='Solicitação duplicada']", "Cancelado para testes de validação.");
    await page.click("button:has-text('Confirmar Cancelamento')");
    await page.waitForTimeout(1000);

    // 6. Navegação pelo menu
    const isMobileViewport = (page.viewportSize()?.width ?? 1280) < 768;
    if (isMobileViewport) {
      await page.goto("/atendimento");
    } else {
      await page.click("a:has-text('Atendimento')");
    }
    await page.waitForTimeout(1500);
    const bodyAtend = await page.innerText("body");
    expect(bodyAtend).not.toContain("Não foi possível carregar a página");

    expect(errorBoundaryTexts.length).toBe(0);
  });

  test("Mobile: Visualização responsiva de /meus-chamados e /chamados/57", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "sb-mock-user",
        JSON.stringify({
          id: "gestor-01",
          email: "claudinei.lima@senaimt.ind.br",
          role: "gestor",
          user_metadata: { full_name: "Claudinei Lima", role: "gestor" },
        })
      );
    });

    await page.goto("/chamados/57");
    await page.waitForSelector("text=Chamado #57", { timeout: 15000 });
    const bodyMobile = await page.innerText("body");
    expect(bodyMobile).not.toContain("Não foi possível carregar a página");
    expect(bodyMobile).toContain("Chamado #57");
    expect(bodyMobile).toContain("Finalizar chamado");
  });

  test("Tablet: Visualização de /chamados/58", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "sb-mock-user",
        JSON.stringify({
          id: "gestor-01",
          email: "claudinei.lima@senaimt.ind.br",
          role: "gestor",
          user_metadata: { full_name: "Claudinei Lima", role: "gestor" },
        })
      );
    });

    await page.goto("/chamados/58");
    await page.waitForSelector("text=Chamado #58", { timeout: 15000 });
    const bodyTablet = await page.innerText("body");
    expect(bodyTablet).not.toContain("Não foi possível carregar a página");
    expect(bodyTablet).toContain("Chamado #58");
  });
});
