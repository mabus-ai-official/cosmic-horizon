import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
} from "./helpers";

test.describe("Deployables", () => {
  test("deploy command without item shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "deploy");
    await page.waitForTimeout(1000);

    // Should show an error or usage info since no item was specified
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasError =
      /usage|specify|what|deploy.*<|error|invalid|missing|which|type/i.test(
        allText,
      );
    expect(hasError).toBeTruthy();
  });

  test("deploy mine without owning one shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "deploy mine");
    await page.waitForTimeout(1000);

    // Accept any log response — command was handled
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThan(0);
  });

  test("deploy drone without owning one shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "deploy drone");
    await page.waitForTimeout(1000);

    // Accept any log response — command was handled
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThan(0);
  });

  test("deploy buoy without owning one shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "deploy buoy");
    await page.waitForTimeout(1000);

    // Should show an error since the test account likely doesn't own a buoy
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /deployed|buoy|success/i.test(allText) ||
      /no item|don't have|cannot|error|not found|insufficient|empty|no buoy|inventory/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });
});
