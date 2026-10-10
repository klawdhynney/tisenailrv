import { test, expect } from "@playwright/test";

test.describe("Hero Layout & Indicators Verification", () => {
  const viewports = [
    { name: "Desktop 1366", width: 1366, height: 768, isDesktopHero: true },
    { name: "Desktop 1920", width: 1920, height: 1080, isDesktopHero: true },
    { name: "Ultrawide 2560", width: 2560, height: 1440, isDesktopHero: true },
    { name: "Tablet 768", width: 768, height: 1024, isDesktopHero: false },
    { name: "Mobile 390", width: 390, height: 844, isDesktopHero: false },
  ];

  for (const vp of viewports) {
    test(`renders correctly on ${vp.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });

      // 1. Badge "ATENDIMENTO DE TI · SENAI LRV" must NOT exist
      const badge = page.locator("text='ATENDIMENTO DE TI · SENAI LRV'");
      await expect(badge).toHaveCount(0);

      // 2. Desktop vs Mobile Hero & Titles
      if (vp.isDesktopHero) {
        const desktopHero = page.locator(".hero-desktop");
        await expect(desktopHero).toBeVisible();
        const mobileHero = page.locator(".hero-mobile");
        await expect(mobileHero).toBeHidden();

        const title = desktopHero.locator("h1:has-text('Bem-vindo à Central de Chamados de TI.')");
        await expect(title).toBeVisible();

        // 5 indicators inside desktop hero
        const cards = desktopHero.locator(".hero-ind-card");
        await expect(cards).toHaveCount(5);
        for (let i = 0; i < 5; i++) {
          await expect(cards.nth(i)).toBeVisible();
        }
      } else {
        const mobileHero = page.locator(".hero-mobile");
        await expect(mobileHero).toBeVisible();
        const desktopHero = page.locator(".hero-desktop");
        await expect(desktopHero).toBeHidden();

        const title = mobileHero.locator("h1:has-text('Bem-vindo à Central de Chamados de TI.')");
        await expect(title).toBeVisible();

        // 5 indicators inside mobile/tablet hero
        const cards = mobileHero.locator(".rounded-xl.border-l-4");
        await expect(cards).toHaveCount(5);
        for (let i = 0; i < 5; i++) {
          await expect(cards.nth(i)).toBeVisible();
        }
      }

      // 4. Verify no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Filter out harmless network or favicon errors if any
      const relevantErrors = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("Failed to load resource")
      );
      expect(relevantErrors).toHaveLength(0);
    });
  }
});
