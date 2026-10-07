import { test, expect, type Page } from "@playwright/test";

// Helpers para alternância segura de perfis de teste locais
async function definirPerfil(page: Page, perfil: "visitante" | "usuario" | "gestor" | "admin") {
  await page.goto("/");
  await page.evaluate((p) => {
    sessionStorage.clear();
    if (p === "visitante") {
      localStorage.removeItem("sb-mock-user");
    } else if (p === "usuario") {
      localStorage.setItem(
        "sb-mock-user",
        JSON.stringify({
          id: "teste-auto-usuario-01",
          email: "teste.usuario@senailrv.local",
          role: "usuario",
          user_metadata: { full_name: "Usuário Teste Automático", role: "usuario" },
        })
      );
    } else if (p === "gestor") {
      localStorage.setItem(
        "sb-mock-user",
        JSON.stringify({
          id: "teste-auto-gestor-01",
          email: "teste.gestor@senailrv.local",
          role: "gestor",
          user_metadata: { full_name: "Gestor Teste Automático", role: "gestor" },
        })
      );
    } else if (p === "admin") {
      localStorage.setItem(
        "sb-mock-user",
        JSON.stringify({
          id: "teste-auto-admin-01",
          email: "claudinei.lima@senaimt.ind.br",
          role: "admin",
          user_metadata: { full_name: "Administrador Teste Automático", role: "admin" },
        })
      );
    }
  }, perfil);
}

// Intercepta erros graves de console durante a navegação
function registrarErrosConsole(page: Page) {
  const erros: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const txt = msg.text();
      if (
        !txt.includes("Failed to load resource") &&
        !txt.includes("vite-tsconfig-paths") &&
        !txt.includes("hydrated but some attributes") &&
        !txt.includes("hydration-mismatch")
      ) {
        erros.push(txt);
      }
    }
  });
  return erros;
}

test.describe("1. PERFIL VISITANTE (Público)", () => {
  test("deve acessar a Página Inicial e navegar pelos links públicos", async ({ page }) => {
    await definirPerfil(page, "visitante");
    const erros = registrarErrosConsole(page);

    await page.goto("/");
    await expect(page).toHaveTitle(/TI SENAI LRV/i);
    await expect(page.locator("body")).toBeVisible();

    // Cards de ação rápida visíveis
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    expect(erros.length).toBe(0);
  });

  test("deve acessar a página Sobre e LGPD sem redirecionamentos", async ({ page }) => {
    await definirPerfil(page, "visitante");

    await page.goto("/sobre");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Informações Institucionais/i)).toBeVisible();

    await page.goto("/lgpd");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Controlador/i).first()).toBeVisible();
  });

  test("deve acessar o Dashboard público sem ser bloqueado", async ({ page }) => {
    await definirPerfil(page, "visitante");

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Alternar visões do dashboard (problemas, setores, prioridades, status, sla)
    const botaoSetores = page.getByRole("button", { name: /setores/i });
    if (await botaoSetores.isVisible()) {
      await botaoSetores.click();
      await expect(botaoSetores).toBeVisible();
    }

    // Acompanhamento público
    await page.goto("/dashboard/acompanhamento");
    await expect(page.locator("body")).toBeVisible();

    // Avaliações públicas
    await page.goto("/dashboard/avaliacoes");
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve redirecionar para login ao tentar acessar páginas restritas", async ({ page }) => {
    await definirPerfil(page, "visitante");

    await page.goto("/atendimento");
    await expect(page).toHaveURL(/\/auth/);

    await page.goto("/regras");
    await expect(page).toHaveURL(/\/auth/);

    await page.goto("/usuarios");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("2. PERFIL USUÁRIO COMUM", () => {
  test("deve acessar formulário de Abrir Chamado e Meus Chamados", async ({ page }) => {
    await definirPerfil(page, "usuario");

    await page.goto("/abrir");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Verificar campos do formulário
    await expect(page.locator("input#solicitante, input[placeholder*='nome' i], input[name='solicitante']").first()).toBeVisible();

    // Acessar meus chamados
    await page.goto("/meus-chamados");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("deve ver tela de restrição ao tentar acessar área técnica", async ({ page }) => {
    await definirPerfil(page, "usuario");

    await page.goto("/atendimento");
    await expect(page.getByText(/Acesso restrito à equipe de TI/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Acompanhar Meus Chamados/i })).toBeVisible();

    await page.goto("/usuarios");
    await expect(
      page.getByText(/Acesso restrito à equipe de TI/i).or(page.getByText(/Acesso Restrito a Administradores/i))
    ).toBeVisible();
  });
});

test.describe("3. PERFIL GESTOR", () => {
  test("deve acessar Atendimento, Planilha e Painel de Ajustes", async ({ page }) => {
    await definirPerfil(page, "gestor");

    await page.goto("/atendimento");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Baixar Excel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Baixar PDF/i })).toBeVisible();

    await page.goto("/chamados");
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/regras");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("não deve ter permissão na Gestão de Usuários", async ({ page }) => {
    await definirPerfil(page, "gestor");

    await page.goto("/usuarios");
    await expect(page.getByText(/Acesso Restrito a Administradores/i)).toBeVisible();
  });
});

test.describe("4. PERFIL ADMINISTRADOR", () => {
  test("deve ter acesso irrestrito incluindo Gestão de Usuários e abas do Painel", async ({ page }) => {
    await definirPerfil(page, "admin");

    // Gestão de Usuários
    await page.goto("/usuarios");
    await expect(page.getByText(/Gestão de Usuários/i).first()).toBeVisible();

    // Painel de Ajustes total
    await page.goto("/regras");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Campo de busca no painel
    const inputBusca = page.getByPlaceholder(/Buscar ajuste/i);
    if (await inputBusca.isVisible()) {
      await inputBusca.fill("chat");
      await page.waitForTimeout(150);
      await inputBusca.fill("");
    }
  });
});

test.describe("5. RESPONSIVIDADE E TEMAS", () => {
  test("deve renderizar sem quebras em modo escuro e claro", async ({ page }) => {
    await definirPerfil(page, "admin");

    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      localStorage.setItem("tema-ti-modo", "escuro");
    });
    await expect(page.locator("body")).toBeVisible();

    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("tema-ti-modo", "claro");
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve exibir página 404 amigável em rota inexistente", async ({ page }) => {
    await definirPerfil(page, "visitante");

    await page.goto("/rota-inexistente-xyz");
    await expect(page.getByText(/Página não encontrada/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Voltar ao Início/i })).toBeVisible();
  });
});
