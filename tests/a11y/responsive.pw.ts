import { test, expect } from "@playwright/test";

/**
 * Regression guard: ConsentCapture method buttons must wrap on narrow
 * viewports so the triage page never overflows horizontally.
 */
test.describe("Responsive layout regression", () => {
  test("ConsentCapture method buttons wrap at narrow widths without overflow", async ({ page }) => {
    // Narrow mobile viewport where wrapping is required
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/triage");
    await page.waitForLoadState("networkidle");

    // Ensure the consent card is present
    const consentCard = page.locator(".rounded-2xl.border.bg-card.p-5").first();
    await expect(consentCard).toBeVisible();

    // The method buttons container
    const methodRow = consentCard.locator("div.flex.flex-wrap.gap-2").first();
    await expect(methodRow).toBeVisible();

    // Measure widths
    const methodRowBox = await methodRow.boundingBox();
    const pageWidth = await page.evaluate(() => window.innerWidth);

    expect(methodRowBox).not.toBeNull();
    // The flex-wrap container should never exceed viewport width
    expect(methodRowBox!.width).toBeLessThanOrEqual(pageWidth);

    // No horizontal scrollbar should exist on the page body
    const hasHorizontalScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScrollbar).toBe(false);
  });

  test("triage page does not overflow horizontally at 390px width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/triage");
    await page.waitForLoadState("networkidle");

    const hasHorizontalScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScrollbar).toBe(false);
  });
});
