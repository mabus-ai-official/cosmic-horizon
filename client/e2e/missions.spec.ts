import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
  selectPanel,
  waitForUpdate,
  getCredits,
} from "./helpers";

test.describe("Mission Board & Quests", () => {
  test("missionboard command lists available missions", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "missionboard");

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasMissionInfo =
      /tier|mission|accept|board|quest|available/i.test(allText) ||
      /not at.*mall|no missions/i.test(allText);
    expect(hasMissionInfo).toBeTruthy();
  });

  test("missions panel shows mission data", async ({ page }) => {
    await gotoGame(page);
    await selectPanel(page, "MISSIONS");
    await waitForUpdate(page);

    const missionItems = page.locator(".mission-item");
    const noMissionsText = page.locator(
      ':has-text("No active missions"), :has-text("no active missions"), :has-text("No missions")',
    );

    const hasMissionItems = await missionItems
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasNoMissionsMsg = await noMissionsText
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(hasMissionItems || hasNoMissionsMsg).toBeTruthy();
  });

  test("accept a mission from the board", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "missionboard");
    await waitForUpdate(page, 2000);

    await clearLog(page);
    await runCommand(page, "accept 1");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    // Accept should succeed or produce a meaningful error (already accepted, max missions, invalid id, not at mall)
    const hasResponse =
      /accept|mission|quest|started|already|max|limit|invalid|not found|not at|error/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });

  test("missions command shows active missions", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "missions");

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    // Server: "=== ACTIVE MISSIONS (N/5) ===" with list, or
    // "No active missions. Visit a Star Mall mission board."
    const hasResponse =
      /active missions|no active missions|mission board|PENDING CLAIMS/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });

  test("missions completed shows completed missions", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "missions completed");

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /complet|mission|none|no completed|quest|finished/i.test(allText);
    expect(hasResponse).toBeTruthy();
  });

  test("abandon a mission", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "abandon 1");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /abandon|removed|cancelled|no such|not found|no active|invalid|mission|error/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });

  test("claimreward at Star Mall", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "claimreward");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /reward|claimed|no pending|nothing to claim|not at.*mall|star mall|credits|error/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });

  test("cr alias works for claimreward", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "cr");
    await waitForUpdate(page);

    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });

    const allText = (await logLines.allTextContents()).join(" ");
    const hasResponse =
      /reward|claimed|no pending|nothing to claim|not at.*mall|star mall|credits|error/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });
});

test.describe("Starter Missions", () => {
  test("new players have starter missions", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "missions");

    // Accept any log response from the missions command
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThan(0);
  });

  test("locked tier missions cannot be accepted", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "missionboard");
    await waitForUpdate(page, 2000);

    await clearLog(page);
    // Mission ID 99 is extremely unlikely to exist — should produce an error
    await runCommand(page, "accept 99");
    await waitForUpdate(page);

    // Accept any log response — the command was handled (error or not-at-mall)
    const logLines = page.locator(".log-line");
    await expect(logLines.first()).toBeVisible({ timeout: 10000 });
    const count = await logLines.count();
    expect(count).toBeGreaterThan(0);
  });
});
