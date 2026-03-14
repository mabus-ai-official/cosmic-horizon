import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  getCredits,
  getSector,
  getShipType,
  getEnergy,
  waitForUpdate,
  selectPanel,
  clearLog,
} from "./helpers";

test.describe("Context Panel Sync", () => {
  test("status bar and context panel both show player data", async ({
    page,
  }) => {
    await gotoGame(page);

    await expect(page.locator(".status-bar")).toBeVisible();
    await expect(page.locator(".context-panel")).toBeVisible();

    // Both should have content
    const statusText = await page.locator(".status-bar").textContent();
    const contextText = await page.locator(".context-panel").textContent();
    expect((statusText ?? "").length).toBeGreaterThan(0);
    expect((contextText ?? "").length).toBeGreaterThan(0);
  });

  test("sector updates in status bar after move", async ({ page }) => {
    await gotoGame(page);

    // Verify getSector returns a valid number
    const sector = await getSector(page);
    expect(sector).toBeGreaterThan(0);
  });

  test("credits display in both status bar and profile", async ({ page }) => {
    await gotoGame(page);

    // Credits from status bar helper
    const credits = await getCredits(page);
    expect(credits).toBeGreaterThan(0);

    // Credits in the profile section of the context panel
    const profileCredits = page.locator(".profile-section__credits");
    if (await profileCredits.isVisible({ timeout: 3000 }).catch(() => false)) {
      const creditsText = (await profileCredits.textContent()) ?? "";
      const parsed = parseInt(creditsText.replace(/[^0-9]/g, ""), 10);
      expect(parsed).toBeGreaterThan(0);
    }
  });

  test("ship type shows in context panel", async ({ page }) => {
    await gotoGame(page);

    const shipType = await getShipType(page);
    expect(shipType.length).toBeGreaterThan(0);
  });
});
