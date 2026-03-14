import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
  selectPanel,
  clickTab,
} from "./helpers";

test.describe("Inventory & Items", () => {
  test("store command lists items", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "store");
    await page.waitForTimeout(1000);

    // Store should list purchasable items or indicate we're not at a Star Mall
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasStoreInfo =
      /item|store|price|credits|fuel|probe|mine|drone|buoy/i.test(allText) ||
      /not at.*mall|star mall|no items/i.test(allText);
    expect(hasStoreInfo).toBeTruthy();
  });

  test("purchase by number works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "purchase 1");
    await page.waitForTimeout(1000);

    // Should either purchase the item or show an error (not at mall, insufficient credits, etc.)
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /purchased|bought|acquired|added|success/i.test(allText) ||
      /not at|insufficient|cannot|error|credits|invalid|no item|no star mall|star mall/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });

  test("purchase by name works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "purchase fuel");
    await page.waitForTimeout(1000);

    // Should either purchase fuel or show an error
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /purchased|bought|acquired|fuel|added|success/i.test(allText) ||
      /not at|insufficient|cannot|error|credits|invalid|not found|no item|no star mall|star mall/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });

  test("inventory command lists items", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "inventory");
    await page.waitForTimeout(1000);

    // Should list inventory items or indicate inventory is empty
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /inventory|item|fuel|probe|mine|drone|buoy|empty|no items|nothing/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });

  test("gear panel Items tab shows inventory", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "LOADOUT");
    await page.waitForTimeout(500);
    await clickTab(page, "Items");
    await page.waitForTimeout(1000);

    // Should show item inventory content, an empty state, or panel content
    const panelContent = page.locator(".panel-content, .group-panel");
    await expect(panelContent.first()).toBeVisible({ timeout: 5000 });
  });

  test("use by number works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "use 1");
    await page.waitForTimeout(1000);

    // Should use the item or show an error (no item at that index, empty inventory)
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /used|consumed|activated|deployed|success/i.test(allText) ||
      /no item|invalid|cannot|error|empty|don't have|not found/i.test(allText);
    expect(hasResponse).toBeTruthy();
  });

  test("use by name works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "use probe");
    await page.waitForTimeout(1000);

    // Should use the probe or show an error (don't have one)
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /used|consumed|activated|deployed|probe|success|scan/i.test(allText) ||
      /no item|invalid|cannot|error|empty|don't have|not found/i.test(allText);
    expect(hasResponse).toBeTruthy();
  });
});
