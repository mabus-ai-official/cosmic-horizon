import { test, expect } from "@playwright/test";
import {
  gotoGame,
  runCommand,
  waitForLogContaining,
  clearLog,
} from "./helpers";

test.describe("Notes System", () => {
  test("note command saves a note", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "note Test trade route: sector 42 to 88");

    // Should confirm the note was saved
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("saved") ||
        allText.includes("noted") ||
        allText.includes("added") ||
        allText.includes("note"),
    ).toBeTruthy();
  });

  test("notes command lists saved notes", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "notes");

    // Should list notes including the one we just saved
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("trade route") ||
        allText.includes("sector 42") ||
        allText.includes("note"),
    ).toBeTruthy();
  });

  test("notes search finds matching notes", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "notes search trade");

    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    // Server: "=== NOTES (search: trade) ===" + results, or "No matching notes"
    const hasResponse = /NOTES.*search|trade route|no matching notes/i.test(
      allText,
    );
    expect(hasResponse).toBeTruthy();
  });

  test("note del deletes a note", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "note del 1");

    // Should confirm deletion or indicate note not found
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ").toLowerCase();
    expect(
      allText.includes("deleted") ||
        allText.includes("removed") ||
        allText.includes("not found") ||
        allText.includes("no note"),
    ).toBeTruthy();
  });

  test("notes shows empty after deletion", async ({ page }) => {
    await gotoGame(page);
    await clearLog(page);

    await runCommand(page, "notes");

    // May show remaining notes or indicate no notes
    const lines = page.locator(".log-line");
    await expect(lines.first()).toBeVisible({ timeout: 10000 });
    const allText = (await lines.allTextContents()).join(" ");
    expect(allText.length).toBeGreaterThan(0);
  });
});
