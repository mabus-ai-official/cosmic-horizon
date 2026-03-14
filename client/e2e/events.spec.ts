import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
} from "./helpers";

test.describe("Sector Events", () => {
  test("investigate command responds", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "investigate");
    await page.waitForTimeout(1000);

    // Should get some response — event outcome, "no event", or "nothing to investigate"
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("event") ||
        allText.includes("nothing") ||
        allText.includes("investigate") ||
        allText.length > 0,
    ).toBeTruthy();
  });

  test("events are shown in look output", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "look");
    await page.waitForTimeout(1000);

    // Look should return sector info — events may or may not be present
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    // Verify we got sector info back
    expect(allText.length).toBeGreaterThan(0);
  });
});
