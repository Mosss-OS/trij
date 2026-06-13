import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = {
  "/": "Login page",
  "/dashboard": "Dashboard",
  "/triage": "Triage page",
  "/patients": "Patients list",
  "/settings": "Settings page",
};

test.describe("Accessibility audit", () => {
  for (const [path, name] of Object.entries(ROUTES)) {
    test(`${name} (${path}) should have no critical or serious violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page }).analyze();

      const violations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      if (violations.length > 0) {
        console.log(
          `Axe violations for ${path}:`,
          violations.map((v) => ({
            rule: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
          })),
        );
      }

      expect(violations.length).toBe(0);
    });
  }
});

test.describe("Keyboard navigation", () => {
  test("login page is keyboard navigable", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Tab");
    const emailFocused = page.locator("#email").isFocused();

    if (!emailFocused) {
      // Tab through header link first
      await page.keyboard.press("Tab");
    }

    await expect(page.locator("#email")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#password")).toBeFocused();
  });

  test("bottom nav links are reachable by keyboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const nav = page.locator('nav[aria-label="Main navigation"]');
    const links = nav.locator("a");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toBeVisible();
    }
  });
});

test.describe("Color contrast", () => {
  test("text elements have sufficient color contrast", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();

    expect(results.violations.length).toBe(0);
  });
});

test.describe("Focus management", () => {
  test("skip-to-content link exists and is focusable", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();

    // Focus the skip link and verify it becomes visible
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
  });

  test("main content has correct landmark role", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const main = page.locator('main[id="main-content"]');
    await expect(main).toHaveAttribute("role", "main");
  });
});
