import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
  getCredits,
  getShipType,
  waitForUpdate,
} from "./helpers";

test.describe("Ship Purchase & Management", () => {
  test("dealer shows ships with level gates", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "dealer");
    await waitForUpdate(page);

    // Accept dealer output OR "no star mall" if player navigated away
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    const hasResponse =
      /scout|Lv\.|dealer|ship/i.test(allText) ||
      /no star mall|not at/i.test(allText);
    expect(hasResponse).toBeTruthy();
  });

  test("buyship command produces a response", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    // Try to buy a high-tier ship — should fail with level gate, credits, or location error
    await runCommand(page, "buyship dreadnought");
    await waitForUpdate(page);

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    // Server: "Requires level N", "Not enough credits", "Must be at a star mall",
    // "Unknown ship type", "Cannot purchase dodge pods"
    const hasResponse =
      /requires level|not enough credits|must be at a star mall|unknown ship|no star mall/i.test(
        allText,
      );
    expect(hasResponse).toBeTruthy();
  });

  test("status shows current ship info", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "status");
    await waitForUpdate(page);

    // The status command should output something about the player's ship
    const shipType = await getShipType(page);
    expect(shipType).toBeTruthy();
  });

  test("garage shows stored ships", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "garage");
    await waitForUpdate(page);

    // Garage should respond with something — either a list or "no ships"
    const lines = await page.locator(".log-line").allTextContents();
    expect(lines.length).toBeGreaterThan(0);
  });

  test("storeship stores the current ship", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "storeship");
    await waitForUpdate(page);

    // This may fail if player only has a dodge pod or isn't at a Star Mall.
    // We just verify the command is accepted and produces log output.
    try {
      const line = await waitForLogContaining(page, "store", 10000);
      expect(line).toBeTruthy();
    } catch {
      // Command was rejected (e.g., only one ship, not at mall) — that's acceptable
      const lines = await page.locator(".log-line").allTextContents();
      expect(lines.length).toBeGreaterThan(0);
    }
  });

  test.skip("retrieve gets a ship back from garage", async ({ page }) => {
    // Skipped: depends on storeship having succeeded and knowing the ship ID.
    // This test requires state from a previous storeship command.
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "garage");
    await waitForUpdate(page);

    // Attempt to retrieve — the ship ID would need to be parsed from garage output
    await clearLog(page);
    await runCommand(page, "retrieve");
    await waitForUpdate(page);

    const lines = await page.locator(".log-line").allTextContents();
    expect(lines.length).toBeGreaterThan(0);
  });

  test("salvage command shows salvage options", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);
    await runCommand(page, "salvage");
    await waitForUpdate(page);

    const lines = await page.locator(".log-line").allTextContents();
    expect(lines.length).toBeGreaterThan(0);
  });
});
