import type { Page, Browser, BrowserContext } from "@playwright/test";
import { expect } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test user credentials
export const TEST_USER = {
  username: "e2e_tester",
  email: "e2e@test.local",
  password: "TestPass123!",
  race: "muscarian",
};

export const TEST_USER_2 = {
  username: "e2e_tester_2",
  email: "e2e2@test.local",
  password: "TestPass123!",
  race: "vedic",
};

/**
 * Navigate to the game page and dismiss any intro sequence or tutorial overlay.
 * Waits for both the activity bar AND status bar (player data loaded) before returning.
 */
export async function gotoGame(page: Page) {
  await page.goto("/game");

  // Loop to dismiss all blocking overlays (intro beats, enter galaxy, tutorial)
  for (let i = 0; i < 30; i++) {
    // Check if we've reached the full game UI with NO overlays
    const statusVisible = await page
      .locator(".status-bar")
      .isVisible({ timeout: 500 })
      .catch(() => false);

    if (statusVisible) {
      // Status bar is visible — but check for tutorial overlay on top
      const tutorialSkip = page.locator('button:has-text("Skip")');
      const tutorialOverlay = await tutorialSkip
        .isVisible({ timeout: 500 })
        .catch(() => false);
      if (tutorialOverlay) {
        await tutorialSkip.click();
        await page.waitForTimeout(500);
        continue;
      }
      // No overlays — expand the log and we're good
      await expandLog(page);
      return;
    }

    // Intro sequence: "Skip All" button
    const skipBtn = page.locator(".intro-sequence__skip");
    if (await skipBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
      continue;
    }

    // Intro sequence: "ENTER THE GALAXY" button (shown after all beats)
    const enterBtn = page.locator(".intro-sequence__continue");
    if (await enterBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      await enterBtn.click();
      await page.waitForTimeout(500);
      continue;
    }

    // Intro sequence: click anywhere to advance beat
    const introOverlay = page.locator(".intro-sequence");
    if (await introOverlay.isVisible({ timeout: 300 }).catch(() => false)) {
      await introOverlay.click();
      await page.waitForTimeout(300);
      continue;
    }

    // Nothing found — wait and retry
    await page.waitForTimeout(500);
  }

  // Final wait for game UI with player data loaded
  await page.waitForSelector(".status-bar", { timeout: 15000 });

  // Expand the notification log so all lines are visible to tests
  await expandLog(page);
}

// ---------------------------------------------------------------------------
// Command input
// ---------------------------------------------------------------------------

/** Type a command into the command input and press Enter */
export async function runCommand(page: Page, command: string) {
  const input = page.locator(".cmd-input");
  await input.click();
  await input.fill(command);
  await input.press("Enter");
}

// ---------------------------------------------------------------------------
// Notification log
// ---------------------------------------------------------------------------

/** Wait for a log line containing text (string match or regex) */
export async function waitForLog(
  page: Page,
  text: string | RegExp,
  timeout = 10000,
) {
  const selector =
    typeof text === "string"
      ? `.log-line:has-text("${text.replace(/"/g, '\\"')}")`
      : ".log-line";

  if (typeof text === "string") {
    await page.locator(selector).last().waitFor({ timeout });
  } else {
    await expect(page.locator(".log-line").last()).toContainText(text, {
      timeout,
    });
  }
}

/** Return the text content of the most recent log line */
export async function getLastLogLine(page: Page): Promise<string> {
  return (await page.locator(".log-line").last().textContent()) ?? "";
}

/** Get all log lines text content */
export async function getLogLines(page: Page): Promise<string[]> {
  return page.locator(".log-line").allTextContents();
}

/** Expand the notification log (collapsed mode only shows last line) */
export async function expandLog(page: Page) {
  const toggle = page.locator(".notification-bar__toggle");
  const text = await toggle.textContent();
  if (text?.includes("+")) {
    await toggle.click();
  }
}

/** Click the CLEAR button to empty the log */
export async function clearLog(page: Page) {
  await page.locator(".log-clear-btn").click();
}

// ---------------------------------------------------------------------------
// Status bar reads
// ---------------------------------------------------------------------------

/** Helper to read a status section's value by its label */
async function getStatusValue(page: Page, label: string): Promise<string> {
  const section = page.locator(".status-section", {
    has: page.locator(`.status-label:has-text("${label}")`),
  });
  const value = section.locator(".status-value");
  await value.waitFor({ timeout: 5000 });
  return (await value.textContent()) ?? "";
}

/** Read credits from the status bar */
export async function getCredits(page: Page): Promise<number> {
  const text = await getStatusValue(page, "CREDITS");
  return parseInt(text.replace(/,/g, ""), 10) || 0;
}

/** Read energy from the status bar */
export async function getEnergy(
  page: Page,
): Promise<{ current: number; max: number }> {
  const text = await getStatusValue(page, "ENERGY");
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  return {
    current: match ? parseInt(match[1], 10) : 0,
    max: match ? parseInt(match[2], 10) : 0,
  };
}

/** Read sector ID from the status bar */
export async function getSector(page: Page): Promise<number> {
  const text = await getStatusValue(page, "SECTOR");
  return parseInt(text, 10) || 0;
}

/** Read hull HP from the status bar */
export async function getHull(
  page: Page,
): Promise<{ current: number; max: number }> {
  const text = await getStatusValue(page, "HULL");
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  return {
    current: match ? parseInt(match[1], 10) : 0,
    max: match ? parseInt(match[2], 10) : 0,
  };
}

/** Read cargo totals from the status bar */
export async function getCargoTotal(
  page: Page,
): Promise<{ used: number; max: number }> {
  const text = await getStatusValue(page, "CARGO");
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  return {
    used: match ? parseInt(match[1], 10) : 0,
    max: match ? parseInt(match[2], 10) : 0,
  };
}

// ---------------------------------------------------------------------------
// Panel interaction
// ---------------------------------------------------------------------------

// Panel label → hotkey mapping (from types/panels.ts)
const PANEL_HOTKEYS: Record<string, string> = {
  PILOT: "P",
  HELM: "H",
  SCANNER: "S",
  MARKET: "M",
  COMBAT: "C",
  CONTACTS: "O",
  MISSIONS: "I",
  PLANETS: "L",
  LOADOUT: "G",
  CARGO: "A",
  COMMS: "K",
  SYNDICATE: "Y",
  WALLET: "W",
  DATABANK: "D",
};

/** Activate a panel by pressing its hotkey (buttons are icon-only, no text) */
export async function selectPanel(page: Page, label: string) {
  const hotkey = PANEL_HOTKEYS[label.toUpperCase()];
  if (!hotkey) throw new Error(`Unknown panel label: ${label}`);

  // Blur any focused input first so the hotkey isn't captured by an input field
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  await page.keyboard.press(hotkey);
  await expect(page.locator(".activity-bar__btn--active")).toBeVisible({
    timeout: 3000,
  });
}

/** Click a tab in .group-panel-tabs by text match */
export async function clickTab(page: Page, tabName: string) {
  await page
    .locator(`.group-panel-tabs span:has-text("${tabName}")`)
    .first()
    .click();
}

/** Click a mall tab */
export async function clickMallTab(page: Page, tabName: string) {
  await page.locator(`.mall-tabs span:has-text("${tabName}")`).first().click();
}

// ---------------------------------------------------------------------------
// Context panel reads (ship card)
// ---------------------------------------------------------------------------

/** Read the ship type from the ship card */
export async function getShipType(page: Page): Promise<string> {
  const el = page.locator(".ship-card__type");
  await el.waitFor({ timeout: 5000 });
  return ((await el.textContent()) ?? "").trim();
}

/** Read hull HP from the ship card */
export async function getShipHull(
  page: Page,
): Promise<{ current: number; max: number }> {
  // Hull is rendered via a ctx-bar with fill, plus text like "120/120"
  // Use the status bar hull instead for reliability
  return getHull(page);
}

/** Read the cargo breakdown from the context panel ship card */
export async function getCargo(
  page: Page,
): Promise<{ cyr: number; food: number; tech: number; col: number }> {
  const breakdown = page.locator(".ship-card__cargo-breakdown");
  const result = { cyr: 0, food: 0, tech: 0, col: 0 };

  const items = await breakdown.locator("span").allTextContents();
  for (const item of items) {
    const cyrMatch = item.match(/Cyr[:\s]*(\d+)/i);
    if (cyrMatch) result.cyr = parseInt(cyrMatch[1], 10);
    const foodMatch = item.match(/F(?:oo)?d[:\s]*(\d+)/i);
    if (foodMatch) result.food = parseInt(foodMatch[1], 10);
    const techMatch = item.match(/T(?:ec)?[hc][:\s]*(\d+)/i);
    if (techMatch) result.tech = parseInt(techMatch[1], 10);
    const colMatch = item.match(/Co(?:l)?[:\s]*(\d+)/i);
    if (colMatch) result.col = parseInt(colMatch[1], 10);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

/** Send a message via the mini chat input in the context panel */
export async function sendChat(page: Page, message: string) {
  const input = page.locator(".mini-chat__input input");
  await input.waitFor({ state: "visible", timeout: 5000 });
  await input.scrollIntoViewIfNeeded();
  await input.focus();
  await input.fill(message);
  await input.press("Enter");
}

// ---------------------------------------------------------------------------
// Two-player support
// ---------------------------------------------------------------------------

/** Create a second authenticated player in a new browser context */
export async function createSecondPlayer(
  browser: Browser,
): Promise<{ page: Page; context: BrowserContext }> {
  const auth2Path = path.join(__dirname, ".auth2.json");
  const context = await browser.newContext({
    storageState: auth2Path,
  });
  const page = await context.newPage();
  return { page, context };
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/** Move to a specific sector using the warp input in Nav panel */
export async function warpToSector(page: Page, sectorId: number) {
  await selectPanel(page, "HELM");
  const input = page.locator(".nav-warp-input");
  await input.fill(String(sectorId));
  await input.press("Enter");
  // Wait for sector to change
  await page.waitForTimeout(1000);
}

/** Click an adjacent sector button to move there */
export async function moveToAdjacentSector(page: Page, sectorId: number) {
  await page.locator(`.sector-btn:has-text("${sectorId}")`).click();
  await page.waitForTimeout(500);
}

/** Click a nav action button by text (LOOK, SCAN, DOCK, UNDOCK) */
export async function clickNavAction(page: Page, actionText: string) {
  await selectPanel(page, "HELM");
  await page
    .locator(`.action-buttons .btn-action:has-text("${actionText}")`)
    .click();
}

// ---------------------------------------------------------------------------
// Actions panel buttons
// ---------------------------------------------------------------------------

/** Click a button in the Actions panel by text */
export async function clickActionButton(page: Page, buttonText: string) {
  await selectPanel(page, "DATABANK");
  await page.locator(`.btn-action-lg:has-text("${buttonText}")`).click();
}

// ---------------------------------------------------------------------------
// Wait helpers
// ---------------------------------------------------------------------------

/** Wait for log to contain specific text, returning the matching line */
export async function waitForLogContaining(
  page: Page,
  text: string,
  timeout = 10000,
): Promise<string> {
  const loc = page.locator(
    `.log-line:has-text("${text.replace(/"/g, '\\"')}")`,
  );
  await loc.first().waitFor({ timeout });
  return (await loc.first().textContent()) ?? "";
}

/** Wait a short beat for the server to process and UI to update */
export async function waitForUpdate(page: Page, ms = 1000) {
  await page.waitForTimeout(ms);
}
