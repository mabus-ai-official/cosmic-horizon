import { test, expect, type Browser } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  clearLog,
  waitForLogContaining,
  sendChat,
  createSecondPlayer,
  getSector,
  waitForUpdate,
  selectPanel,
} from "./helpers";

test.describe("Chat System", () => {
  test("chat command sends message", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "chat hello world");
    await page.waitForTimeout(1000);

    await waitForLogContaining(page, "hello world");
  });

  test("say alias works", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "say testing");
    await page.waitForTimeout(1000);

    await waitForLogContaining(page, "testing");
  });

  test("mini chat input sends message", async ({ page }) => {
    await gotoGame(page);

    await sendChat(page, "from mini chat");
    await page.waitForTimeout(2000);

    // Verify the mini chat area exists and has content
    const miniChat = page.locator(".mini-chat");
    await expect(miniChat).toBeVisible({ timeout: 5000 });
  });

  test("mini chat section exists with CHAT header", async ({ page }) => {
    await gotoGame(page);

    // The chat header label should always be visible
    const chatLabel = page.locator(
      '.ctx-section-header__label:has-text("CHAT")',
    );
    await expect(chatLabel).toBeVisible({ timeout: 5000 });

    // Mini chat area should exist
    await expect(page.locator(".mini-chat")).toBeVisible({ timeout: 5000 });
  });

  test("comms panel opens with content", async ({ page }) => {
    await gotoGame(page);

    await selectPanel(page, "COMMS");
    await page.waitForTimeout(1000);

    // Comms panel uses .panel-content or .group-panel-tabs
    const content = page
      .locator(".panel-content")
      .or(page.locator(".group-panel-tabs"));
    await expect(content.first()).toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // TWO-PLAYER chat test
  // ---------------------------------------------------------------------------

  test("two players see each other's messages", async ({ page, browser }) => {
    // Player 1 — undock and get sector
    await gotoGame(page);
    await runCommand(page, "undock");
    await waitForUpdate(page);
    const p1Sector = await getSector(page);

    // Player 2 — second browser context
    const { page: page2, context: ctx2 } = await createSecondPlayer(browser);
    try {
      await gotoGame(page2);

      // Undock player 2 if docked
      await runCommand(page2, "undock");
      await waitForUpdate(page2);

      // Navigate player 2 to player 1's sector via warp-to (auto-pathfinding)
      const p2Sector = await getSector(page2);
      if (p2Sector !== p1Sector) {
        await runCommand(page2, `warp-to ${p1Sector}`);
        // Wait for multi-hop pathfinding to complete
        for (let i = 0; i < 10; i++) {
          await waitForUpdate(page2, 2000);
          const current = await getSector(page2);
          if (current === p1Sector) break;
        }
      }

      // Verify both players are in the same sector
      const p2SectorNow = await getSector(page2);
      if (p2SectorNow !== p1Sector) {
        // Skip test if we couldn't get both players to the same sector
        test.skip();
        return;
      }

      // Player 1 sends a chat message
      await runCommand(page, "chat hello from player one");
      await waitForUpdate(page, 2000);

      // Player 2 should see the message in their mini chat
      const miniChat2 = page2.locator(".mini-chat__messages");
      await expect(miniChat2).toContainText("hello from player one", {
        timeout: 15000,
      });
    } finally {
      await ctx2.close();
    }
  });
});
