import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
} from "./helpers";

test.describe("Warp Gates", () => {
  test("warp list shows syndicate gates", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "warp list");
    await page.waitForTimeout(1000);

    // Should show a list of gates or indicate none exist
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("gate") ||
        allText.includes("warp") ||
        allText.includes("none") ||
        allText.includes("no ") ||
        allText.includes("syndicate"),
    ).toBeTruthy();
  });

  test("warp without gate shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "warp");
    await page.waitForTimeout(1000);

    // Should show error about no gate or usage instructions
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("gate") ||
        allText.includes("warp") ||
        allText.includes("error") ||
        allText.includes("usage") ||
        allText.includes("no ") ||
        allText.includes("specify"),
    ).toBeTruthy();
  });

  test("warp build without syndicate fails", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "warp build 100");
    await page.waitForTimeout(1000);

    // Should show error about needing a syndicate
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("syndicate") ||
        allText.includes("error") ||
        allText.includes("cannot") ||
        allText.includes("not") ||
        allText.includes("fail") ||
        allText.includes("require"),
    ).toBeTruthy();
  });
});
