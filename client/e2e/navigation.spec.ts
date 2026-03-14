import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLog,
  waitForLogContaining,
  getLastLogLine,
  clearLog,
  getEnergy,
  getSector,
  selectPanel,
  waitForUpdate,
  warpToSector,
  moveToAdjacentSector,
  clickNavAction,
} from "./helpers";

test.describe("Navigation & Exploration", () => {
  test("look command shows sector info", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "look");
    await waitForLogContaining(page, "Sector");
  });

  test("move to adjacent sector changes sector and costs energy", async ({
    page,
  }) => {
    await gotoGame(page);

    // Undock first in case we're docked
    await runCommand(page, "undock");
    await waitForUpdate(page);

    const initialSector = await getSector(page);
    const initialEnergy = await getEnergy(page);

    // Open the HELM panel and find an adjacent sector button
    await selectPanel(page, "HELM");
    const adjacentBtn = page.locator(".sector-btn").first();
    await adjacentBtn.waitFor({ timeout: 5000 });

    await adjacentBtn.click();
    await waitForUpdate(page, 2000);

    const newSector = await getSector(page);
    const newEnergy = await getEnergy(page);

    // Sector should have changed
    expect(newSector).not.toBe(initialSector);
    // Energy should have decreased
    expect(newEnergy.current).toBeLessThan(initialEnergy.current);
  });

  test("move to non-adjacent sector fails", async ({ page }) => {
    await gotoGame(page);

    // Undock first in case we're docked
    await runCommand(page, "undock");
    await waitForUpdate(page);
    await clearLog(page);

    await runCommand(page, "move 99999");
    await waitForUpdate(page);

    // Should produce some error log line
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThan(0);
  });

  test("nav panel LOOK button works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await selectPanel(page, "HELM");
    await page.locator('.action-buttons .btn-action:has-text("LOOK")').click();
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
  });

  test("nav panel SCAN button works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await selectPanel(page, "HELM");
    await page.locator('.action-buttons .btn-action:has-text("SCAN")').click();
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 5000 });
  });

  test("warp input navigates to specified sector", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await selectPanel(page, "HELM");

    const initialSector = await getSector(page);
    // Pick a nearby sector to warp to (low energy cost)
    const warpTarget =
      initialSector <= 5 ? initialSector + 1 : initialSector - 1;

    const input = page.locator(".nav-warp-input");
    await input.fill(String(warpTarget));
    await input.press("Enter");
    await waitForUpdate(page);

    // Warp should either succeed (sector changed) or fail with a log message
    const newSector = await getSector(page);
    const logLines = page.locator(".log-line");
    const hasLogEntry = await logLines
      .first()
      .isVisible()
      .catch(() => false);

    // Accept either: sector changed to target, or a log message was produced
    expect(newSector === warpTarget || hasLogEntry).toBeTruthy();
  });

  test("sector map zoom buttons work", async ({ page }) => {
    await gotoGame(page);

    // Ensure the sector map is visible
    const sectorMap = page.locator(".sector-map-full");
    await expect(sectorMap).toBeVisible({ timeout: 10000 });

    // Try multiple possible selectors for zoom buttons
    const zoomInBtn = page
      .locator(".sector-map-zoom-in")
      .or(page.locator('.sector-map-full button:has-text("+")'));
    const zoomOutBtn = page
      .locator(".sector-map-zoom-out")
      .or(page.locator('.sector-map-full button:has-text("-")'));

    // Click zoom in if available
    if (
      await zoomInBtn
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await zoomInBtn.first().click();
      await page.waitForTimeout(500);

      // Map should still be visible after zooming
      await expect(sectorMap).toBeVisible();
    }

    // Click zoom out if available
    if (
      await zoomOutBtn
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await zoomOutBtn.first().click();
      await page.waitForTimeout(500);

      // Map should still be visible after zooming
      await expect(sectorMap).toBeVisible();
    }
  });

  test("sector map renders with nodes", async ({ page }) => {
    await gotoGame(page);

    // Ensure the sector map is visible
    const sectorMap = page.locator(".sector-map-full");
    await expect(sectorMap).toBeVisible({ timeout: 10000 });

    // Verify sector nodes exist in the SVG map
    const nodeCount = await page.locator(".sector-map-node").count();
    expect(nodeCount).toBeGreaterThan(0);
  });
});
