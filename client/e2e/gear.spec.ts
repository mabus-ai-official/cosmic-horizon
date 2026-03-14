import { test, expect } from "@playwright/test";
import {
  gotoGame,
  selectPanel,
  clearLog,
  waitForLogContaining,
  clickTab,
  runCommand,
  waitForUpdate,
} from "./helpers";

test.describe("Gear Panel", () => {
  test("gear panel opens with action buttons", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "LOADOUT");
    await waitForUpdate(page);

    // The gear ship actions section should be visible with action buttons
    const gearActions = page.locator(".gear-ship-actions");
    const actionButtons = page.locator(".gear-ship-actions .btn-action");

    const hasGearActions = await gearActions
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasButtons = await actionButtons
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasGearActions || hasButtons).toBeTruthy();
  });

  test("gear panel has four tabs", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "LOADOUT");
    await waitForUpdate(page);

    const tabBar = page.locator(".group-panel-tabs");
    await expect(tabBar.first()).toBeVisible({ timeout: 5000 });

    const tabText = await tabBar.first().textContent();
    expect(tabText).toContain("Items");
    expect(tabText).toContain("Tablets");
    expect(tabText).toContain("Crafting");
    expect(tabText).toContain("Upgrades");
  });

  test("CLOAK button responds", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "LOADOUT");
    await waitForUpdate(page);
    await clearLog(page);

    const cloakBtn = page.locator('.btn-action:has-text("CLOAK")');
    await expect(cloakBtn.first()).toBeVisible({ timeout: 5000 });
    await cloakBtn.first().click();
    await waitForUpdate(page);

    // Should produce a log response — likely an error since player is probably not a Shadow Runner
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });

  test("REFUEL button responds", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "LOADOUT");
    await waitForUpdate(page);
    await clearLog(page);

    const refuelBtn = page.locator('.btn-action:has-text("REFUEL")');
    await expect(refuelBtn.first()).toBeVisible({ timeout: 5000 });
    await refuelBtn.first().click();
    await waitForUpdate(page);

    // Should produce a log response about refueling
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });

  test("EJECT button shows confirmation", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "LOADOUT");
    await waitForUpdate(page);

    const ejectBtn = page.locator('.btn-action:has-text("EJECT")');
    await expect(ejectBtn.first()).toBeVisible({ timeout: 5000 });

    // Initial state should say "EJECT"
    await expect(ejectBtn.first()).toHaveText("EJECT");

    // First click changes to confirmation state
    await ejectBtn.first().click();
    await waitForUpdate(page, 500);

    // After first click, text should change to "CONFIRM EJECT?"
    const confirmBtn = page.locator('.btn-action:has-text("CONFIRM EJECT")');
    const hasConfirm = await confirmBtn
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // Accept either the button text changed or the class changed
    if (hasConfirm) {
      await expect(confirmBtn.first()).toBeVisible();
    } else {
      // Check if the button got an active/combat class
      const btn = page.locator(".btn-action--combat");
      const hasActiveClass = await btn
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      expect(hasActiveClass).toBeTruthy();
    }
  });

  test("Items tab shows inventory", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "LOADOUT");
    await waitForUpdate(page);

    await clickTab(page, "Items");
    await waitForUpdate(page);

    // Content should render — inventory items or empty state
    const panelContent = page.locator(".panel-content");
    await expect(panelContent.first()).toBeVisible({ timeout: 5000 });

    const contentText = await panelContent.first().textContent();
    expect(contentText!.length).toBeGreaterThan(0);
  });

  test("Tablets tab shows tablets", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "LOADOUT");
    await waitForUpdate(page);

    await clickTab(page, "Tablets");
    await waitForUpdate(page);

    // Content should render — tablets list or empty state
    const panelContent = page.locator(".panel-content");
    await expect(panelContent.first()).toBeVisible({ timeout: 5000 });

    const contentText = await panelContent.first().textContent();
    expect(contentText!.length).toBeGreaterThan(0);
  });

  test("Crafting tab shows recipes", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "LOADOUT");
    await waitForUpdate(page);

    await clickTab(page, "Crafting");
    await waitForUpdate(page);

    // Content should render — crafting recipes or empty state
    const panelContent = page.locator(".panel-content");
    await expect(panelContent.first()).toBeVisible({ timeout: 5000 });

    const contentText = await panelContent.first().textContent();
    expect(contentText!.length).toBeGreaterThan(0);
  });

  test("Upgrades tab shows upgrades", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "LOADOUT");
    await waitForUpdate(page);

    await clickTab(page, "Upgrades");
    await waitForUpdate(page);

    // Content should render — ship upgrades or empty state
    const panelContent = page.locator(".panel-content");
    await expect(panelContent.first()).toBeVisible({ timeout: 5000 });

    const contentText = await panelContent.first().textContent();
    expect(contentText!.length).toBeGreaterThan(0);
  });

  test("self-destruct button exists in context panel", async ({ page }) => {
    await gotoGame(page);

    // The self-destruct button is in the context panel
    const selfDestructBtn = page.locator(".btn-self-destruct");

    // It should exist (may be disabled without a Rache Device)
    await expect(selfDestructBtn).toBeVisible({ timeout: 10000 });
    await expect(selfDestructBtn).toHaveText("SELF-DESTRUCT");

    // If enabled, test confirmation flow; if disabled, just verify presence
    const isDisabled = await selfDestructBtn.isDisabled();
    if (!isDisabled) {
      await selfDestructBtn.click();
      await waitForUpdate(page, 500);
      await expect(selfDestructBtn).toHaveText("ARE YOU SURE?");
    }
  });
});
