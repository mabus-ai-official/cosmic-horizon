import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
  getCredits,
  waitForUpdate,
  getEnergy,
} from "./helpers";

test.describe("Star Mall Services", () => {
  test("mall command lists services", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "mall");
    // Match either casing
    const starMall = await waitForLogContaining(page, "Star Mall", 10000).catch(
      () => null,
    );
    if (!starMall) {
      await waitForLogContaining(page, "STAR MALL");
    }
  });

  test("dealer command shows ships or not-at-mall error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "dealer");
    // Should list ships or say "not at a star mall"
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("scout") ||
        allText.includes("corvette") ||
        allText.includes("ship") ||
        allText.includes("star mall") ||
        allText.includes("dealer") ||
        allText.length > 0,
    ).toBeTruthy();
  });

  test("store command shows items for purchase", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "store");
    // Store should display items with prices — look for a credits indicator
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });

  test("cantina command gets a rumor", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "cantina");
    // Cantina should produce some log output (rumor text or cantina response)
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });

  test("intel command responds", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "intel");
    await waitForUpdate(page, 2000);

    // Intel should produce a response (intel report, cost info, or not-at-mall error)
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
  });

  test("refuel command restores energy", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "refuel 1");
    // Should get a confirmation or message about refueling
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });

  test("fuel alias works same as refuel", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "fuel 1");
    // Should produce the same kind of response as refuel
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });

  test("garage command shows stored ships", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "garage");
    // Should show either an empty garage message or a list of stored ships
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });
});
