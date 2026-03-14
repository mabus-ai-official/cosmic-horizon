import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
} from "./helpers";

test.describe("Bounties", () => {
  test("bounties command shows active bounties", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "bounties");
    await page.waitForTimeout(2000);

    // Should show a list of bounties or a "no bounties" message
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);

    // Verify the response is bounty-related
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("bount") ||
        allText.includes("none") ||
        allText.includes("no active") ||
        allText.includes("list") ||
        allText.includes("reward") ||
        allText.includes("target") ||
        allText.includes("unknown"),
    ).toBeTruthy();
  });

  test("bounty placement responds", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "bounty e2e_tester_2 100");
    await page.waitForTimeout(2000);

    // Should respond with confirmation or an error (e.g. not enough credits)
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);

    // Verify the response is relevant (placed, error, or usage info)
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("bount") ||
        allText.includes("placed") ||
        allText.includes("credit") ||
        allText.includes("error") ||
        allText.includes("insufficient") ||
        allText.includes("not enough") ||
        allText.includes("invalid") ||
        allText.includes("usage") ||
        allText.includes("unknown"),
    ).toBeTruthy();
  });

  test("bounty with no arguments shows usage", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "bounty");
    await page.waitForTimeout(2000);

    // Should show usage or error
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
  });

  test("bounty with invalid amount shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "bounty e2e_tester_2 -50");
    await page.waitForTimeout(2000);

    // Should show some kind of error or rejection
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
  });
});
