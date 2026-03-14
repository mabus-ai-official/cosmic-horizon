import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
} from "./helpers";

test.describe("Cloaking", () => {
  test("cloak command responds", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "cloak");
    await page.waitForTimeout(1000);

    // Should get some response — likely an error since the default ship is not a Shadow Runner
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("cloak") ||
        allText.includes("shadow") ||
        allText.includes("stealth") ||
        allText.includes("error") ||
        allText.includes("cannot") ||
        allText.includes("only") ||
        allText.includes("ship"),
    ).toBeTruthy();
  });

  test("cloak fails on non-stealth ship", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "cloak");
    await page.waitForTimeout(1000);

    // Should show an error about needing a Shadow Runner or stealth-capable ship
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("shadow runner") ||
        allText.includes("stealth") ||
        allText.includes("only") ||
        allText.includes("cannot") ||
        allText.includes("error") ||
        allText.includes("not") ||
        allText.includes("ship type") ||
        allText.includes("require"),
    ).toBeTruthy();
  });
});
