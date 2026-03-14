/**
 * Crafting commands — craft, recipes, inscribe, inventory, use, equip.
 * Covers the full item lifecycle: viewing recipes, crafting items from
 * materials, managing inventory, and equipping tablets for stat bonuses.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { formatTabletEffects, rarityTag, resolveItem } from "./utils";

export const craftingCommands: Record<string, CommandHandler> = {
  craft: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: craft <recipe # or name> [batch size]", "error");
      ctx.addLine('  Use "recipes" to see available recipes.', "info");
      return;
    }

    // Check if last arg is a batch number
    let batchSize = 1;
    let recipeQuery: string;
    const lastArg = parseInt(args[args.length - 1]);
    if (!isNaN(lastArg) && args.length > 1 && lastArg >= 1 && lastArg <= 5) {
      batchSize = lastArg;
      recipeQuery = args.slice(0, -1).join(" ");
    } else {
      recipeQuery = args.join(" ");
    }

    // Find planet in sector owned by player
    const ownedInSector = (ctx.sector?.planets ?? []).filter(
      (p: any) => p.ownerId === ctx.player?.id,
    );
    if (ownedInSector.length === 0) {
      ctx.addLine("You need an owned planet in this sector to craft", "error");
      return;
    }
    const craftPlanet = ownedInSector[0];

    // Resolve recipe from listing
    const listing = ctx.getLastListing();
    const num = parseInt(recipeQuery);
    let recipeId: string | null = null;

    if (!isNaN(num) && listing && num >= 1 && num <= listing.length) {
      recipeId = listing[num - 1].id;
    } else {
      // Try to find by name from last listing
      if (listing) {
        const q = recipeQuery.toLowerCase();
        const match = listing.find((l) => l.label.toLowerCase().includes(q));
        if (match) {
          recipeId = match.id;
        }
      }
    }

    if (!recipeId) {
      ctx.addLine(
        `No recipe matching "${recipeQuery}". Type "recipes" first.`,
        "error",
      );
      return;
    }

    api
      .startCraft(craftPlanet.id, recipeId, batchSize)
      .then(({ data }) => {
        if (data.queued) {
          const eta = Math.ceil(
            (new Date(data.completesAt).getTime() - Date.now()) / 60000,
          );
          ctx.addLine(
            `Queued: ${data.recipeName} x${data.batchSize} — ready in ${eta} min`,
            "success",
          );
        } else {
          ctx.addLine(
            `Crafted: ${data.recipeName} x${data.batchSize}`,
            "success",
          );
          if (data.output) {
            ctx.addLine(
              `  Output: ${data.output.name || data.output.type} x${data.output.quantity || 1}`,
              "trade",
            );
          }
        }
        if (data.creditsCost > 0)
          ctx.addLine(
            `  Cost: ${data.creditsCost.toLocaleString()} credits`,
            "info",
          );
        if (data.xp?.awarded) ctx.addLine(`  +${data.xp.awarded} XP`, "info");
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Craft failed", "error"),
      );
  },

  recipes: (_args, ctx) => {
    api
      .getRecipes()
      .then(({ data }) => {
        ctx.addLine("=== RECIPES ===", "system");
        const grouped = data.grouped || {};
        const tierNames: Record<number, string> = {
          2: "Tier 2 — Processed (planet level 1+)",
          3: "Tier 3 — Refined (planet level 3+)",
          4: "Tier 4 — Assembly (planet level 5+, instant)",
        };
        let idx = 1;
        const allRecipes: { id: string; label: string }[] = [];
        for (const tier of [2, 3, 4]) {
          const recipes = grouped[tier];
          if (!recipes || recipes.length === 0) continue;
          ctx.addLine(`  ${tierNames[tier]}:`, "info");
          for (const r of recipes) {
            const ingStr = r.ingredients
              .map((i: any) => `${i.quantity} ${i.name}`)
              .join(" + ");
            const outputName = r.name;
            const timeStr =
              r.craftTimeMinutes > 0
                ? r.craftTimeMinutes >= 60
                  ? `${Math.floor(r.craftTimeMinutes / 60)} hr ${r.craftTimeMinutes % 60 > 0 ? (r.craftTimeMinutes % 60) + " min" : ""}`.trim()
                  : `${r.craftTimeMinutes} min`
                : "instant";
            const costStr =
              r.creditsCost > 0
                ? ` (${r.creditsCost.toLocaleString()} cr)`
                : "";
            ctx.addLine(
              `    [${idx}] ${outputName.padEnd(24)} ${ingStr} → ${outputName} (${timeStr})${costStr}`,
              "info",
            );
            allRecipes.push({ id: r.id, label: r.name });
            idx++;
          }
        }
        ctx.setLastListing(allRecipes);

        // Tablet combine recipes
        ctx.addLine("  TABLET RECIPES:", "info");
        ctx.addLine("    3x Common    → 1x Uncommon    (500 cr)", "info");
        ctx.addLine("    3x Uncommon  → 1x Rare        (1,500 cr)", "info");
        ctx.addLine("    3x Rare      → 1x Epic        (5,000 cr)", "info");
        ctx.addLine("    3x Epic      → 1x Legendary   (15,000 cr)", "info");
        ctx.addLine("    3x Legendary → 1x Mythic      (50,000 cr)", "info");
        ctx.addLine("  Must be at a Star Mall to combine tablets.", "info");
      })
      .catch((err: any) =>
        ctx.addLine(
          err.response?.data?.error || "Failed to load recipes",
          "error",
        ),
      );
  },

  tablets: (_args, ctx) => {
    api
      .getTablets()
      .then(({ data }) => {
        const total = data.tablets?.length || 0;
        const max = data.storage?.max || 5;
        ctx.addLine(`=== TABLETS (${total}/${max}) ===`, "system");

        // Equipped section
        ctx.addLine("  EQUIPPED:", "info");
        for (let slot = 1; slot <= 3; slot++) {
          const equipped = data.equipped?.find(
            (t: any) => t.equippedSlot === slot,
          );
          const unlocked = data.slots?.unlocked?.includes(slot);
          if (equipped) {
            const effects =
              typeof equipped.effects === "string"
                ? JSON.parse(equipped.effects)
                : equipped.effects;
            ctx.addLine(
              `    [Slot ${slot}] ${equipped.name} (${rarityTag(equipped.rarity)}) — ${formatTabletEffects(effects)}`,
              "success",
            );
          } else if (unlocked) {
            ctx.addLine(`    [Slot ${slot}] (empty)`, "info");
          } else {
            const unlockLevel = slot === 1 ? 10 : slot === 2 ? 30 : 60;
            ctx.addLine(
              `    [Slot ${slot}] (locked — unlocks at level ${unlockLevel})`,
              "warning",
            );
          }
        }

        // Inventory section
        const inventory =
          data.tablets?.filter((t: any) => !t.equippedSlot) || [];
        if (inventory.length > 0) {
          ctx.addLine("  INVENTORY:", "info");
          inventory.forEach((t: any, i: number) => {
            const effects =
              typeof t.effects === "string" ? JSON.parse(t.effects) : t.effects;
            ctx.addLine(
              `    [${i + 1}] ${t.name.padEnd(22)} (${rarityTag(t.rarity).padEnd(9)}) — ${formatTabletEffects(effects)}`,
              "info",
            );
          });
          ctx.setLastListing(
            inventory.map((t: any) => ({ id: t.id, label: t.name })),
          );
        } else {
          ctx.addLine("  INVENTORY: (empty)", "info");
        }
        ctx.addLine(
          `  Storage: ${total}/${max} | Use "equip <#> <slot>" at Star Mall`,
          "info",
        );
      })
      .catch((err: any) => {
        ctx.addLine(
          err.response?.data?.error || "Failed to load tablets",
          "error",
        );
      });
  },

  equip: (args, ctx) => {
    if (args.length < 2) {
      ctx.addLine("Usage: equip <tablet # or name> <slot 1-3>", "error");
      return;
    }
    const slotArg = parseInt(args[args.length - 1]);
    if (isNaN(slotArg) || slotArg < 1 || slotArg > 3) {
      ctx.addLine("Slot must be 1, 2, or 3", "error");
      return;
    }
    const tabletQuery = args.slice(0, -1).join(" ");
    api.getTablets().then(({ data }) => {
      const inventory = (data.tablets || []).filter(
        (t: any) => !t.equippedSlot,
      );
      const items = inventory.map((t: any) => ({ id: t.id, name: t.name }));
      const result = resolveItem(tabletQuery, items, ctx);
      if (result === null) {
        ctx.addLine(`No tablet matching "${tabletQuery}"`, "error");
        return;
      }
      if (result === "ambiguous") return;
      api
        .equipTablet(result.id, slotArg)
        .then(({ data: eqData }) => {
          ctx.addLine(
            `Equipped ${eqData.name} (${rarityTag(eqData.rarity)}) to slot ${eqData.slot}. Cost: ${eqData.cost?.toLocaleString()} cr`,
            "success",
          );
          ctx.addLine(
            `Credits: ${eqData.newCredits?.toLocaleString()}`,
            "info",
          );
          ctx.refreshStatus();
        })
        .catch((err: any) => {
          ctx.addLine(err.response?.data?.error || "Equip failed", "error");
        });
    });
  },

  unequip: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: unequip <slot 1-3>", "error");
      return;
    }
    const slot = parseInt(args[0]);
    if (isNaN(slot) || slot < 1 || slot > 3) {
      ctx.addLine("Slot must be 1, 2, or 3", "error");
      return;
    }
    api
      .unequipTablet(slot)
      .then(({ data }) => {
        ctx.addLine(
          `Unequipped ${data.name} from slot ${data.slot}`,
          "success",
        );
      })
      .catch((err: any) => {
        ctx.addLine(err.response?.data?.error || "Unequip failed", "error");
      });
  },

  combine: (args, ctx) => {
    if (args.length < 3) {
      ctx.addLine(
        "Usage: combine <#> <#> <#> — combine 3 same-tier tablets",
        "error",
      );
      return;
    }
    const listing = ctx.getLastListing();
    const ids: string[] = [];
    for (const arg of args.slice(0, 3)) {
      const num = parseInt(arg);
      if (!isNaN(num) && listing && num >= 1 && num <= listing.length) {
        ids.push(listing[num - 1].id);
      } else {
        ctx.addLine(
          `Invalid tablet reference: "${arg}". Use numbers from tablets listing.`,
          "error",
        );
        return;
      }
    }
    api
      .combineTablets(ids)
      .then(({ data }) => {
        const effects =
          typeof data.result.effects === "string"
            ? JSON.parse(data.result.effects)
            : data.result.effects;
        ctx.addLine(
          `Combined 3 tablets into: ${data.result.name} (${rarityTag(data.result.rarity)})!`,
          "success",
        );
        ctx.addLine(`  ${formatTabletEffects(effects)}`, "info");
        ctx.addLine(
          `Cost: ${data.cost?.toLocaleString()} cr | Credits: ${data.newCredits?.toLocaleString()}`,
          "info",
        );
        ctx.refreshStatus();
      })
      .catch((err: any) => {
        ctx.addLine(err.response?.data?.error || "Combine failed", "error");
      });
  },
};
