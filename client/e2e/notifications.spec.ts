import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  clearLog,
  getLogLines,
  getLastLogLine,
  waitForLogContaining,
} from "./helpers";

test.describe("Notification Log", () => {
  test("log entries appear after commands", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "look");
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("log entries have typed prefixes", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "look");
    await page.waitForTimeout(1000);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });

    // Check that log lines contain prefix characters like [i], [✓], [$], etc.
    const allText = (await logLines.allTextContents()).join(" ");
    const hasPrefixChars = /\[.?\]/.test(allText);

    // Also check for dedicated .log-prefix elements
    const prefixElements = page.locator(".log-prefix");
    const prefixCount = await prefixElements.count();

    expect(hasPrefixChars || prefixCount > 0).toBeTruthy();
  });

  test("info log lines have correct class", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "look");
    await page.waitForTimeout(1000);

    // After running look, there should be info-typed log lines
    const infoLines = page.locator(".log-line--info");
    const allLines = page.locator(".log-line");
    await expect(allLines.first()).toBeVisible({ timeout: 5000 });

    const infoCount = await infoLines.count();
    expect(infoCount).toBeGreaterThanOrEqual(1);
  });

  test("clear button empties the log", async ({ page }) => {
    await gotoGame(page);

    // Generate some log entries
    await runCommand(page, "look");
    await page.waitForTimeout(1000);

    const logLinesBefore = page.locator(".log-line");
    await expect(logLinesBefore.first()).toBeVisible({ timeout: 5000 });

    // Click the clear button
    await page.locator(".log-clear-btn").click();
    await page.waitForTimeout(500);

    // Verify log is mostly empty (server may push messages after clearing)
    const logLinesAfter = page.locator(".log-line");
    const count = await logLinesAfter.count();
    expect(count).toBeLessThanOrEqual(3);
  });

  test("commands work after clearing log", async ({ page }) => {
    await gotoGame(page);

    // Generate entries and clear them
    await runCommand(page, "look");
    await page.waitForTimeout(1000);
    await clearLog(page);
    await page.waitForTimeout(500);

    // Run a new command
    await runCommand(page, "look");
    await page.waitForTimeout(1000);

    // Verify new log entries appear
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("log auto-scrolls to newest entries", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    // Run several commands to generate many log entries
    for (let i = 0; i < 5; i++) {
      await runCommand(page, "look");
      await page.waitForTimeout(800);
    }

    // Verify the log container is scrolled to the bottom
    const logContainer = page.locator(".notification-bar__lines");
    await expect(logContainer).toBeVisible({ timeout: 5000 });

    const isScrolledToBottom = await logContainer.evaluate((el) => {
      // Allow 2px tolerance for rounding
      return el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    });

    expect(isScrolledToBottom).toBeTruthy();
  });
});
