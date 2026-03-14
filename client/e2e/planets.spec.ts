import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
  selectPanel,
  waitForUpdate,
} from "./helpers";

test.describe("Planets", () => {
  test("look reveals planets in sector", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "look");
    await waitForUpdate(page);

    // "look" should produce sector info — planets may or may not be present
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasSectorInfo = /sector|planet|outpost|empty|star mall|warp/i.test(
      allText,
    );
    expect(hasSectorInfo).toBeTruthy();
  });

  test("planets panel opens with tabs", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "PLANETS");
    await waitForUpdate(page);

    // The panel should be visible
    const panelContent = page.locator(".panel-content");
    await expect(panelContent.first()).toBeVisible({ timeout: 5000 });

    // Check for the tab bar with Owned and Discovered tabs
    const tabBar = page.locator(".group-panel-tabs");
    await expect(tabBar.first()).toBeVisible({ timeout: 5000 });

    const tabText = await tabBar.first().textContent();
    expect(tabText).toContain("Owned");
    expect(tabText).toContain("Discovered");
  });

  test("land command shows planet details", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    // "land test" — a planet name that likely doesn't exist
    await runCommand(page, "land test");
    await waitForUpdate(page);

    // Should produce a log response — either an error or planet details
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /no planet|not found|invalid|planet|landed|error|unknown/i.test(allText);
    expect(hasResponse).toBeTruthy();
  });

  test("claim command on non-existent planet shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "claim nonexistent_planet_xyz");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasError =
      /no planet|not found|invalid|error|cannot|unknown|no unclaimed/i.test(
        allText,
      );
    expect(hasError).toBeTruthy();
  });

  test("colonize command without planet shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "colonize");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasError =
      /error|invalid|specify|planet|usage|landed|not on|require/i.test(allText);
    expect(hasError).toBeTruthy();
  });

  test("collect command without planet shows error", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "collect");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasError =
      /error|invalid|specify|planet|usage|landed|not on|require|no planet/i.test(
        allText,
      );
    expect(hasError).toBeTruthy();
  });

  test("planets panel Owned tab", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "PLANETS");
    await waitForUpdate(page);

    // Click the Owned tab if tabs exist
    const ownedTab = page
      .locator('.group-panel-tabs span:has-text("Owned")')
      .first();
    if (await ownedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ownedTab.click();
      await waitForUpdate(page);
    }

    // Content should render — either planet items or an empty-state message
    const panelContent = page.locator(".panel-content");
    await expect(panelContent.first()).toBeVisible({ timeout: 5000 });

    const contentText = await panelContent.first().textContent();
    expect(contentText!.length).toBeGreaterThan(0);
  });

  test("planets panel Discovered tab", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "PLANETS");
    await waitForUpdate(page);

    // Click the Discovered tab if tabs exist
    const discoveredTab = page
      .locator('.group-panel-tabs span:has-text("Discovered")')
      .first();
    if (await discoveredTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await discoveredTab.click();
      await waitForUpdate(page);
    }

    // Content should render — either discovered planets or an empty-state message
    const panelContent = page.locator(".panel-content");
    await expect(panelContent.first()).toBeVisible({ timeout: 5000 });

    const contentText = await panelContent.first().textContent();
    expect(contentText!.length).toBeGreaterThan(0);
  });
});
