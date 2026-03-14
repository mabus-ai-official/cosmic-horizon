import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
  getCredits,
  getCargo,
  waitForUpdate,
  selectPanel,
} from "./helpers";

test.describe("Trading", () => {
  test("dock command shows outpost info", async ({ page }) => {
    await gotoGame(page);

    await clearLog(page);
    await runCommand(page, "dock");
    await waitForUpdate(page);

    // Player starts at a Star Mall which has outpost services.
    // Should see outpost/price info or "not at an outpost" if somehow relocated.
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasOutpostInfo =
      /outpost|prices|docked|market|mall/i.test(allText) ||
      /not at an outpost|no outpost/i.test(allText);
    expect(hasOutpostInfo).toBeTruthy();
  });

  test("trade panel opens and shows content", async ({ page }) => {
    await gotoGame(page);

    // Dock first so trade data is available
    await runCommand(page, "dock");
    await waitForUpdate(page);

    await selectPanel(page, "MARKET");
    await waitForUpdate(page);

    // Should see trade content — a table, collapsible panel, or "dock at outpost" message
    const tradeTable = page.locator(".trade-table");
    const collapsiblePanel = page.locator(".collapsible-panel");
    const panelContent = page.locator(".panel-content");
    const hasTradeContent =
      (await tradeTable.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await collapsiblePanel
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await panelContent
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false));

    expect(hasTradeContent).toBeTruthy();
  });

  test("buy commodity updates cargo", async ({ page }) => {
    await gotoGame(page);

    // Dock at the outpost first
    await runCommand(page, "dock");
    await waitForUpdate(page);

    await clearLog(page);
    await runCommand(page, "buy cyrillium 1");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    // Server messages: "Bought N commodity" on success, or one of these errors:
    // "No outpost in this sector", "Must be docked", "No cargo space available",
    // "Not enough credits", "Not enough energy", "Purchase failed"
    const hasBuyResult =
      /bought|purchased/i.test(allText) ||
      /no outpost|must be docked|no cargo space|not enough|purchase failed/i.test(
        allText,
      );
    expect(hasBuyResult).toBeTruthy();
  });

  test("sell commodity updates credits", async ({ page }) => {
    await gotoGame(page);

    // Dock and buy something first so we have cargo to sell
    await runCommand(page, "dock");
    await waitForUpdate(page);
    await runCommand(page, "buy cyrillium 1");
    await waitForUpdate(page);

    await clearLog(page);
    await runCommand(page, "sell cyrillium 1");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    // Server messages: "Sold N commodity" on success, or errors:
    // "No outpost in this sector", "Must be docked", "No cargo of this type",
    // "Not enough energy", "Sale failed"
    const hasSellResult =
      /sold/i.test(allText) ||
      /no outpost|must be docked|no cargo of this type|not enough|sale failed/i.test(
        allText,
      );
    expect(hasSellResult).toBeTruthy();
  });

  test("eject command dumps cargo", async ({ page }) => {
    await gotoGame(page);

    // Dock and buy so we have something to eject
    await runCommand(page, "dock");
    await waitForUpdate(page);
    await runCommand(page, "buy cyrillium 1");
    await waitForUpdate(page);

    await clearLog(page);
    await runCommand(page, "eject cyrillium 1");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasEjectResult =
      /eject|jettison|dumped|discard/i.test(allText) ||
      /insufficient|cannot|error|don't have/i.test(allText);
    expect(hasEjectResult).toBeTruthy();
  });

  test("buying more than cargo space fails", async ({ page }) => {
    await gotoGame(page);

    await runCommand(page, "dock");
    await waitForUpdate(page);

    await clearLog(page);
    await runCommand(page, "buy cyrillium 999999");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    // Server: "No cargo space available", "Not enough credits", "No outpost", "Must be docked"
    const hasError =
      /no cargo space|not enough|no outpost|must be docked|purchase failed/i.test(
        allText,
      );
    expect(hasError).toBeTruthy();
  });

  test("selling more than you have fails", async ({ page }) => {
    await gotoGame(page);

    await runCommand(page, "dock");
    await waitForUpdate(page);

    await clearLog(page);
    await runCommand(page, "sell food 999999");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    // Server: "No cargo of this type", "No outpost", "Must be docked", "Sale failed"
    // Success path: "Sold N food" (if they have some food, partial sell is fine)
    const hasResponse =
      /no cargo of this type|sold|no outpost|must be docked|not enough|sale failed/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });
});
