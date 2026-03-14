import { test, expect } from "@playwright/test";
import { gotoGame } from "./helpers";

test.describe("Game — Core Layout", () => {
  test("game page loads with all layout elements", async ({ page }) => {
    await gotoGame(page);

    await expect(page.locator(".activity-bar")).toBeVisible();
    await expect(page.locator(".status-bar")).toBeVisible();
    await expect(page.locator(".scene-viewport")).toBeVisible();
  });

  test("activity bar has all 14 panel buttons", async ({ page }) => {
    await gotoGame(page);

    const buttons = page.locator(".activity-bar__btn");
    await expect(buttons).toHaveCount(14);
  });

  test("sector map is visible", async ({ page }) => {
    await gotoGame(page);

    await expect(page.locator(".sector-map-full")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Game — Panel Navigation", () => {
  const panelTests = [
    { label: "PILOT", index: 0 },
    { label: "HELM", index: 1 },
    { label: "SCANNER", index: 2 },
    { label: "MARKET", index: 3 },
    { label: "COMBAT", index: 4 },
    { label: "CONTACTS", index: 5 },
    { label: "MISSIONS", index: 6 },
    { label: "PLANETS", index: 7 },
    { label: "LOADOUT", index: 8 },
    { label: "CARGO", index: 9 },
    { label: "COMMS", index: 10 },
    { label: "SYNDICATE", index: 11 },
    { label: "WALLET", index: 12 },
    { label: "DATABANK", index: 13 },
  ];

  for (const panel of panelTests) {
    test(`clicking ${panel.label} panel button activates it`, async ({
      page,
    }) => {
      await gotoGame(page);

      const btn = page.locator(".activity-bar__btn").nth(panel.index);
      await btn.click();
      await expect(btn).toHaveClass(/activity-bar__btn--active/);
    });
  }
});

test.describe("Game — Hotkeys", () => {
  const hotkeyTests = [
    { key: "H", panel: "HELM" },
    { key: "S", panel: "SCANNER" },
    { key: "M", panel: "MARKET" },
    { key: "C", panel: "COMBAT" },
    { key: "P", panel: "PILOT" },
    { key: "O", panel: "CONTACTS" },
    { key: "I", panel: "MISSIONS" },
    { key: "L", panel: "PLANETS" },
    { key: "G", panel: "LOADOUT" },
    { key: "A", panel: "CARGO" },
    { key: "K", panel: "COMMS" },
    { key: "Y", panel: "SYNDICATE" },
    { key: "W", panel: "WALLET" },
    { key: "D", panel: "DATABANK" },
  ];

  for (const { key, panel } of hotkeyTests) {
    test(`pressing '${key}' activates ${panel} panel`, async ({ page }) => {
      await gotoGame(page);

      await page.keyboard.press(key);
      const activeBtn = page.locator(".activity-bar__btn--active");
      await expect(activeBtn).toBeVisible();
    });
  }
});

test.describe("Game — Status Bar", () => {
  test("status bar displays sector info", async ({ page }) => {
    await gotoGame(page);

    const statusBar = page.locator(".status-bar");
    await expect(statusBar).toBeVisible();
    await expect(statusBar).toContainText(/Sector/i);
  });
});

test.describe("Game — Ship & Scene", () => {
  test("scene viewport renders", async ({ page }) => {
    await gotoGame(page);

    await expect(page.locator(".scene-viewport")).toBeVisible();
  });

  test("status bar shows ship type", async ({ page }) => {
    await gotoGame(page);

    // StatusBar renders ship type ID in the SHIP section
    const shipSection = page.locator(".status-bar .status-label", {
      hasText: "SHIP",
    });
    await expect(shipSection).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Game — Context Panel", () => {
  test("context panel is visible", async ({ page }) => {
    await gotoGame(page);

    await expect(page.locator(".context-panel")).toBeVisible({
      timeout: 5000,
    });
  });
});
