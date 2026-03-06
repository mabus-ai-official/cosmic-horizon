import { test, expect } from "@playwright/test";
import { gotoGame, getEnergy, waitForUpdate } from "./helpers";

test.describe("Energy System", () => {
  test("energy values display in status bar", async ({ page }) => {
    await gotoGame(page);
    await waitForUpdate(page);

    const energy = await getEnergy(page);
    expect(energy.current).toBeGreaterThan(0);
    expect(energy.max).toBeGreaterThan(0);
  });

  test("energy has valid range", async ({ page }) => {
    await gotoGame(page);
    await waitForUpdate(page);

    const energy = await getEnergy(page);
    expect(energy.current).toBeLessThanOrEqual(energy.max);
  });
});
