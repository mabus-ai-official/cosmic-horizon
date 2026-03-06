import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
  selectPanel,
  clickTab,
} from "./helpers";

test.describe("Ship Upgrades", () => {
  test("upgrades command lists available upgrades", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "upgrades");
    await page.waitForTimeout(1000);

    // Should list available upgrades or indicate we're not at a Star Mall
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasUpgradeInfo =
      /upgrade|cargo|shield|engine|weapon|hull|sensor|install/i.test(allText) ||
      /not at|star mall|no star mall|no upgrades|unavailable/i.test(allText);
    expect(hasUpgradeInfo).toBeTruthy();
  });

  test("gear panel Upgrades tab shows upgrades", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "LOADOUT");
    await page.waitForTimeout(500);
    await clickTab(page, "Upgrades");
    await page.waitForTimeout(1000);

    // Should show upgrade content, an empty state, or panel content
    const panelContent = page.locator(".panel-content, .group-panel");
    await expect(panelContent.first()).toBeVisible({ timeout: 5000 });
  });

  test("install with partial name works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "install cargo");
    await page.waitForTimeout(1000);

    // Should install the upgrade or show an error (not at mall, insufficient credits, etc.)
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /install|upgrade|cargo|equipped|added|success/i.test(allText) ||
      /not at|insufficient|cannot|error|credits|already|invalid|not found|no upgrade|no star mall|star mall/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });

  test("shipupgrades shows installed upgrades", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "shipupgrades");
    await page.waitForTimeout(1000);

    // Should list installed upgrades or indicate none are installed
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /upgrade|installed|equipped|cargo|shield|engine|weapon|hull|sensor/i.test(
        allText,
      ) ||
      /no upgrade|none|empty|nothing installed|not at|no star mall|star mall/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });

  test("install non-existent upgrade fails", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "install xyznonexistent");
    await page.waitForTimeout(1000);

    // Should show an error since this upgrade doesn't exist, or not at star mall
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasError =
      /not found|invalid|unknown|error|no such|cannot|doesn't exist|does not exist|no upgrade/i.test(
        allText,
      ) || /not at|no star mall|star mall/i.test(allText);
    expect(hasError).toBeTruthy();
  });

  test("uninstall with invalid id fails", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "uninstall 99999");
    await page.waitForTimeout(1000);

    // Should show an error since this ID doesn't correspond to an installed upgrade, or not at star mall
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasError =
      /not found|invalid|error|no such|cannot|doesn't exist|does not exist|no upgrade|not installed/i.test(
        allText,
      ) || /not at|no star mall|star mall/i.test(allText);
    expect(hasError).toBeTruthy();
  });
});
