import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
  clickActionButton,
} from "./helpers";

test.describe("Help System", () => {
  test("help command shows categories", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "help");

    // Help should list command categories like navigation, trading, combat
    const logLine = await waitForLogContaining(page, "navigation", 5000).catch(
      () => null,
    );
    if (!logLine) {
      const tradingLine = await waitForLogContaining(
        page,
        "trading",
        5000,
      ).catch(() => null);
      if (!tradingLine) {
        await waitForLogContaining(page, "combat", 5000);
      }
    }
  });

  test("help trading shows trading commands", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "help trading");

    await waitForLogContaining(page, "buy", 5000);
    await waitForLogContaining(page, "sell", 5000);
  });

  test("help combat shows combat commands", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "help combat");

    await waitForLogContaining(page, "fire", 5000);
  });

  test("help buy shows detailed command help", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "help buy");

    // Should show usage details for the buy command
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(allText).toContain("buy");
  });

  test("help for unknown command shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "help fakecmd");

    // Should indicate no help is available for the unknown command
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("no detailed help") ||
        allText.includes("unknown") ||
        allText.includes("not found") ||
        allText.includes("no help"),
    ).toBeTruthy();
  });

  test("? alias works for help", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "?");

    // Should produce the same category output as the help command
    const logLine = await waitForLogContaining(page, "navigation", 5000).catch(
      () => null,
    );
    if (!logLine) {
      const tradingLine = await waitForLogContaining(
        page,
        "trading",
        5000,
      ).catch(() => null);
      if (!tradingLine) {
        await waitForLogContaining(page, "combat", 5000);
      }
    }
  });

  test("tips command gives contextual guidance", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "tips");

    // Tips should produce at least one log line with guidance
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });

  test("Actions panel HELP button works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await clickActionButton(page, "HELP");

    // Should produce help output in the log
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });

  test("Actions panel TIPS button works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await clickActionButton(page, "TIPS");

    // Should produce tips output in the log
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });
});
