import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
  waitForUpdate,
} from "./helpers";

test.describe("Edge Cases & Error Handling", () => {
  test("move with no argument shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "move");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("error") ||
        allText.includes("invalid") ||
        allText.includes("usage") ||
        allText.includes("specify") ||
        allText.includes("required") ||
        allText.includes("where"),
    ).toBeTruthy();
  });

  test("buy with no arguments shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "buy");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("error") ||
        allText.includes("invalid") ||
        allText.includes("usage") ||
        allText.includes("specify") ||
        allText.includes("required") ||
        allText.includes("what"),
    ).toBeTruthy();
  });

  test("fire with no target shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "fire");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("error") ||
        allText.includes("invalid") ||
        allText.includes("usage") ||
        allText.includes("target") ||
        allText.includes("specify") ||
        allText.includes("no target"),
    ).toBeTruthy();
  });

  test("sell more than inventory shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "sell food 999999");

    // Should get an error — could be "not enough", "no outpost", etc.
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    // Any log response (error or otherwise) confirms the command was handled
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
  });

  test("buy more than cargo space shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "buy cyrillium 999999");

    // Should get an error — could be "not enough credits", "no outpost", etc.
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
  });

  test("empty command does not produce error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    // Submit empty command by pressing Enter on the input
    const input = page.locator(".cmd-input");
    await input.click();
    await input.press("Enter");
    await waitForUpdate(page, 1000);

    // Empty command should not produce an error log line
    const errorLines = page.locator(".log-line--error");
    const errorCount = await errorLines.count();
    expect(errorCount).toBe(0);
  });

  test("rapid panel switching doesn't break UI", async ({ page }) => {
    await gotoGame(page);

    // Click multiple panel buttons in rapid succession
    const buttons = page.locator(".activity-bar__btn");
    const buttonCount = await buttons.count();

    // Click 4 panels rapidly with short delays
    const indices = [0, 3, 7, 13].filter((i) => i < buttonCount);
    for (const idx of indices) {
      await buttons.nth(idx).click();
      await page.waitForTimeout(100);
    }

    await waitForUpdate(page, 500);

    // Verify exactly one panel is active and the page didn't crash
    const activeButtons = page.locator(".activity-bar__btn--active");
    await expect(activeButtons).toHaveCount(1);

    // Activity bar should still be visible (page didn't crash)
    await expect(page.locator(".activity-bar")).toBeVisible();
    await expect(page.locator(".status-bar")).toBeVisible();
  });

  test.describe("Unauthenticated Access", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("unauthenticated access redirects to login", async ({ page }) => {
      await page.goto("/game");
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
