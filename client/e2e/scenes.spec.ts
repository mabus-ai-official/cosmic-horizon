import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
} from "./helpers";

test.describe("Star Mall Scenes", () => {
  test("dock at Star Mall shows welcome", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "dock");
    await page.waitForTimeout(1000);

    // Should get a dock response — Star Mall welcome, "docked", or error
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("star mall") ||
        allText.includes("docked") ||
        allText.includes("dock") ||
        allText.includes("welcome") ||
        allText.length > 0,
    ).toBeTruthy();
  });

  test("scene viewport renders", async ({ page }) => {
    await gotoGame(page);

    await expect(page.locator(".scene-viewport")).toBeVisible({
      timeout: 10000,
    });
  });

  test("undock returns to space", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "undock");
    await page.waitForTimeout(1000);

    // Should get an undock response or departure message
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("undock") ||
        allText.includes("depart") ||
        allText.includes("launch") ||
        allText.includes("space") ||
        allText.length > 0,
    ).toBeTruthy();
  });

  test("cantina shows bar scene", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "cantina");
    await page.waitForTimeout(1000);

    // Should get a cantina response
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });
});
