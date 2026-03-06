import { test, expect } from "@playwright/test";
import {
  gotoGame,
  selectPanel,
  clearLog,
  waitForLogContaining,
  runCommand,
} from "./helpers";

test.describe("Actions Panel", () => {
  test("Actions panel opens via activity bar", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "DATABANK");

    await expect(page.locator(".actions-panel")).toBeVisible({ timeout: 5000 });
  });

  test("STATUS button triggers status command", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "DATABANK");
    await clearLog(page);

    await page.locator('.btn-action-lg:has-text("STATUS")').click();
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await logLines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("status") ||
        allText.includes("sector") ||
        allText.includes("credits") ||
        allText.includes("energy") ||
        allText.includes("hull"),
    ).toBeTruthy();
  });

  test("ACHIEVEMENTS button works", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "DATABANK");
    await clearLog(page);

    await page.locator('.btn-action-lg:has-text("ACHIEVEMENTS")').click();
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await logLines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("achievement") ||
        allText.includes("unlocked") ||
        allText.includes("progress") ||
        allText.includes("earned") ||
        allText.includes("no achievements"),
    ).toBeTruthy();
  });

  test("RANKS button works", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "DATABANK");
    await clearLog(page);

    await page.locator('.btn-action-lg:has-text("RANKS")').click();
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await logLines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("rank") ||
        allText.includes("level") ||
        allText.includes("tier") ||
        allText.includes("rating"),
    ).toBeTruthy();
  });

  test("LEADERBOARD button works", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "DATABANK");
    await clearLog(page);

    await page.locator('.btn-action-lg:has-text("LEADERBOARD")').click();
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await logLines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("leaderboard") ||
        allText.includes("rank") ||
        allText.includes("score") ||
        allText.includes("top") ||
        allText.includes("player"),
    ).toBeTruthy();
  });

  test("COMBAT LOG button works", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "DATABANK");
    await clearLog(page);

    await page.locator('.btn-action-lg:has-text("COMBAT LOG")').click();
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("HELP button works", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "DATABANK");
    await clearLog(page);

    await page.locator('.btn-action-lg:has-text("HELP")').click();
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const allText = (await logLines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("navigation") ||
        allText.includes("trading") ||
        allText.includes("combat") ||
        allText.includes("help") ||
        allText.includes("command"),
    ).toBeTruthy();
  });

  test("TIPS button works", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "DATABANK");
    await clearLog(page);

    await page.locator('.btn-action-lg:has-text("TIPS")').click();
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("NOTES button works", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "DATABANK");
    await clearLog(page);

    await page.locator('.btn-action-lg:has-text("NOTES")').click();
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("CLEAR LOG button works", async ({ page }) => {
    await gotoGame(page);

    // Generate some log entries first
    await runCommand(page, "look");
    await page.waitForTimeout(1000);

    const logLinesBefore = page.locator(".log-line");
    await expect(logLinesBefore.first()).toBeVisible({ timeout: 5000 });

    // Open DATABANK and click CLEAR LOG
    await selectPanel(page, "DATABANK");
    await page.locator('.btn-action-lg:has-text("CLEAR LOG")').click();
    await page.waitForTimeout(500);

    // Verify log is mostly empty (server may push messages after clearing)
    const logLinesAfter = page.locator(".log-line");
    const count = await logLinesAfter.count();
    expect(count).toBeLessThanOrEqual(3);
  });

  test("INTEL input accepts player name", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "DATABANK");
    await clearLog(page);

    // Fill in the player name input
    const input = page.locator(".actions-input");
    await input.fill("e2e_tester");

    // Click the INTEL button
    await page.locator('.btn-action-lg:has-text("INTEL")').click();
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("EVENTS button works", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "DATABANK");
    await clearLog(page);

    await page.locator('.btn-action-lg:has-text("EVENTS")').click();
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
