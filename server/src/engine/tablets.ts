import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import crypto from "crypto";
import { settleDebitPlayer } from "../chain/tx-queue";

export interface TabletBonuses {
  weaponBonus: number;
  engineBonus: number;
  cargoBonus: number;
  shieldBonus: number;
  fleeBonus: number;
  xpMultiplier: number;
}

const RARITY_ORDER = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
];

export function getTabletStorage(level: number): number {
  return (
    GAME_CONFIG.TABLET_BASE_STORAGE +
    Math.floor(level / 5) * GAME_CONFIG.TABLET_STORAGE_PER_5_LEVELS
  );
}

export async function getPlayerTablets(playerId: string) {
  const rows = await db("player_tablets")
    .join(
      "tablet_definitions",
      "player_tablets.tablet_definition_id",
      "tablet_definitions.id",
    )
    .where({ "player_tablets.player_id": playerId })
    .select(
      "player_tablets.id as id",
      "tablet_definitions.id as definitionId",
      "tablet_definitions.name as name",
      "tablet_definitions.description as description",
      "tablet_definitions.rarity as rarity",
      "tablet_definitions.effects as effects",
      "tablet_definitions.sprite_config as sprite_config",
      "player_tablets.equipped_slot as equipped_slot",
      "player_tablets.acquired_at as acquired_at",
    );

  return rows.map((row: any) => ({
    id: row.id,
    definitionId: row.definitionId,
    name: row.name,
    description: row.description,
    rarity: row.rarity,
    effects:
      typeof row.effects === "string" ? JSON.parse(row.effects) : row.effects,
    spriteConfig:
      typeof row.sprite_config === "string"
        ? JSON.parse(row.sprite_config)
        : row.sprite_config,
    equippedSlot: row.equipped_slot,
    acquiredAt: row.acquired_at,
  }));
}

export async function getEquippedTablets(playerId: string) {
  const rows = await db("player_tablets")
    .join(
      "tablet_definitions",
      "player_tablets.tablet_definition_id",
      "tablet_definitions.id",
    )
    .where({ "player_tablets.player_id": playerId })
    .whereNotNull("player_tablets.equipped_slot")
    .select(
      "player_tablets.id as id",
      "tablet_definitions.id as definitionId",
      "tablet_definitions.name as name",
      "tablet_definitions.description as description",
      "tablet_definitions.rarity as rarity",
      "tablet_definitions.effects as effects",
      "tablet_definitions.sprite_config as sprite_config",
      "player_tablets.equipped_slot as equipped_slot",
      "player_tablets.acquired_at as acquired_at",
    );

  return rows.map((row: any) => ({
    id: row.id,
    definitionId: row.definitionId,
    name: row.name,
    description: row.description,
    rarity: row.rarity,
    effects:
      typeof row.effects === "string" ? JSON.parse(row.effects) : row.effects,
    spriteConfig:
      typeof row.sprite_config === "string"
        ? JSON.parse(row.sprite_config)
        : row.sprite_config,
    equippedSlot: row.equipped_slot,
    acquiredAt: row.acquired_at,
  }));
}

export async function applyTabletBonuses(
  playerId: string,
): Promise<TabletBonuses> {
  const equipped = await getEquippedTablets(playerId);

  const bonuses: TabletBonuses = {
    weaponBonus: 0,
    engineBonus: 0,
    cargoBonus: 0,
    shieldBonus: 0,
    fleeBonus: 0,
    xpMultiplier: 0,
  };

  for (const tablet of equipped) {
    const effects = tablet.effects;
    if (!effects) continue;
    if (effects.weaponBonus) bonuses.weaponBonus += effects.weaponBonus;
    if (effects.engineBonus) bonuses.engineBonus += effects.engineBonus;
    if (effects.cargoBonus) bonuses.cargoBonus += effects.cargoBonus;
    if (effects.shieldBonus) bonuses.shieldBonus += effects.shieldBonus;
    if (effects.fleeBonus) bonuses.fleeBonus += effects.fleeBonus;
    if (effects.xpMultiplier) bonuses.xpMultiplier += effects.xpMultiplier;
  }

  return bonuses;
}

export async function equipTablet(
  playerId: string,
  playerTabletId: string,
  slot: number,
) {
  const tablet = await db("player_tablets")
    .join(
      "tablet_definitions",
      "player_tablets.tablet_definition_id",
      "tablet_definitions.id",
    )
    .where({ "player_tablets.id": playerTabletId })
    .select(
      "player_tablets.id as id",
      "player_tablets.player_id as player_id",
      "tablet_definitions.name as name",
      "tablet_definitions.rarity as rarity",
    )
    .first();

  if (!tablet) throw new Error("Tablet not found");
  if (tablet.player_id !== playerId)
    throw new Error("Tablet does not belong to this player");

  const prog = await db("player_progression")
    .where({ player_id: playerId })
    .first();
  const playerLevel = prog?.level || 1;

  if (slot !== 1 && slot !== 2 && slot !== 3) {
    throw new Error("Invalid slot. Must be 1, 2, or 3");
  }

  const requiredLevel = (
    GAME_CONFIG.TABLET_SLOT_UNLOCK_LEVELS as Record<number, number>
  )[slot];
  if (requiredLevel > playerLevel) {
    throw new Error(
      `Slot ${slot} requires level ${requiredLevel}. Current level: ${playerLevel}`,
    );
  }

  const occupied = await db("player_tablets")
    .where({ player_id: playerId, equipped_slot: slot })
    .first();
  if (occupied) {
    throw new Error(`Slot ${slot} is already occupied`);
  }

  const cost = (GAME_CONFIG.TABLET_EQUIP_COSTS as Record<string, number>)[
    tablet.rarity
  ];
  const player = await db("players").where({ id: playerId }).first();
  if (Number(player.credits) < cost) {
    throw new Error(`Not enough credits. Need ${cost}, have ${player.credits}`);
  }

  await db("players")
    .where({ id: playerId })
    .update({ credits: Number(player.credits) - cost });
  await settleDebitPlayer(playerId, cost, "store");
  await db("player_tablets")
    .where({ id: playerTabletId })
    .update({ equipped_slot: slot });

  return {
    equipped: true,
    name: tablet.name,
    rarity: tablet.rarity,
    slot,
    cost,
    newCredits: Number(player.credits) - cost,
  };
}

export async function unequipTablet(playerId: string, slot: number) {
  const tablet = await db("player_tablets")
    .join(
      "tablet_definitions",
      "player_tablets.tablet_definition_id",
      "tablet_definitions.id",
    )
    .where({
      "player_tablets.player_id": playerId,
      "player_tablets.equipped_slot": slot,
    })
    .select("player_tablets.id as id", "tablet_definitions.name as name")
    .first();

  if (!tablet) {
    throw new Error(`No tablet equipped in slot ${slot}`);
  }

  await db("player_tablets")
    .where({ id: tablet.id })
    .update({ equipped_slot: null });

  return { unequipped: true, name: tablet.name, slot };
}

export async function combineTablets(playerId: string, tabletIds: string[]) {
  if (tabletIds.length !== GAME_CONFIG.TABLET_COMBINE_COUNT) {
    throw new Error(
      `Exactly ${GAME_CONFIG.TABLET_COMBINE_COUNT} tablets are required to combine`,
    );
  }

  const tablets = await db("player_tablets")
    .join(
      "tablet_definitions",
      "player_tablets.tablet_definition_id",
      "tablet_definitions.id",
    )
    .whereIn("player_tablets.id", tabletIds)
    .where({ "player_tablets.player_id": playerId })
    .select(
      "player_tablets.id as id",
      "player_tablets.equipped_slot as equipped_slot",
      "tablet_definitions.rarity as rarity",
    );

  if (tablets.length !== GAME_CONFIG.TABLET_COMBINE_COUNT) {
    throw new Error(
      "One or more tablets not found or do not belong to this player",
    );
  }

  const rarity = tablets[0].rarity;
  for (const t of tablets) {
    if (t.rarity !== rarity) {
      throw new Error("All tablets must be the same rarity to combine");
    }
    if (t.equipped_slot !== null && t.equipped_slot !== undefined) {
      throw new Error("Cannot combine equipped tablets. Unequip them first");
    }
  }

  if (rarity === "mythic") {
    throw new Error("Mythic tablets cannot be combined");
  }

  const rarityIndex = RARITY_ORDER.indexOf(rarity);
  if (rarityIndex === -1) {
    throw new Error(`Unknown rarity: ${rarity}`);
  }

  const cost = (GAME_CONFIG.TABLET_COMBINE_COSTS as Record<string, number>)[
    rarity
  ];
  const player = await db("players").where({ id: playerId }).first();
  if (Number(player.credits) < cost) {
    throw new Error(`Not enough credits. Need ${cost}, have ${player.credits}`);
  }

  const nextRarity = RARITY_ORDER[rarityIndex + 1];

  const newDef = await db("tablet_definitions")
    .where({ rarity: nextRarity })
    .orderByRaw("RANDOM()")
    .first();

  if (!newDef) {
    throw new Error(`No tablet definitions found for rarity: ${nextRarity}`);
  }

  const newCredits = Number(player.credits) - cost;
  await db("players").where({ id: playerId }).update({ credits: newCredits });
  await settleDebitPlayer(playerId, cost, "store");

  await db("player_tablets").whereIn("id", tabletIds).del();

  const newId = crypto.randomUUID();
  await db("player_tablets").insert({
    id: newId,
    player_id: playerId,
    tablet_definition_id: newDef.id,
    equipped_slot: null,
  });

  const effects =
    typeof newDef.effects === "string"
      ? JSON.parse(newDef.effects)
      : newDef.effects;

  return {
    combined: true,
    consumed: tabletIds,
    result: {
      id: newId,
      name: newDef.name,
      rarity: nextRarity,
      effects,
      description: newDef.description,
    },
    cost,
    newCredits,
  };
}

export async function grantTablet(playerId: string, tabletDefId: string) {
  const prog = await db("player_progression")
    .where({ player_id: playerId })
    .first();
  const level = prog?.level || 1;

  const countResult = await db("player_tablets")
    .where({ player_id: playerId })
    .count("* as count")
    .first();
  const count = Number(countResult?.count || 0);

  const capacity = getTabletStorage(level);

  if (count >= capacity) {
    return { overflow: true, tabletDefId };
  }

  const newId = crypto.randomUUID();
  await db("player_tablets").insert({
    id: newId,
    player_id: playerId,
    tablet_definition_id: tabletDefId,
    equipped_slot: null,
  });

  const def = await db("tablet_definitions").where({ id: tabletDefId }).first();

  return {
    overflow: false,
    id: newId,
    name: def?.name,
    rarity: def?.rarity,
    definitionId: tabletDefId,
  };
}

export async function grantRandomTablet(playerId: string) {
  const weights = GAME_CONFIG.TABLET_RARITY_WEIGHTS as Record<string, number>;
  const entries = Object.entries(weights);

  let total = 0;
  for (const [, weight] of entries) {
    total += weight;
  }

  let roll = Math.random() * total;
  let rarity = entries[0][0];
  for (const [r, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      rarity = r;
      break;
    }
  }

  const def = await db("tablet_definitions")
    .where({ rarity })
    .orderByRaw("RANDOM()")
    .first();

  if (!def) {
    throw new Error(`No tablet definitions found for rarity: ${rarity}`);
  }

  return grantTablet(playerId, def.id);
}

export async function tradeTablet(
  fromPlayerId: string,
  toPlayerId: string,
  playerTabletId: string,
) {
  const tablet = await db("player_tablets")
    .join(
      "tablet_definitions",
      "player_tablets.tablet_definition_id",
      "tablet_definitions.id",
    )
    .where({ "player_tablets.id": playerTabletId })
    .select(
      "player_tablets.id as id",
      "player_tablets.player_id as player_id",
      "player_tablets.equipped_slot as equipped_slot",
      "tablet_definitions.name as name",
    )
    .first();

  if (!tablet) {
    throw new Error("Tablet not found");
  }
  if (tablet.player_id !== fromPlayerId) {
    throw new Error("Tablet does not belong to the sender");
  }
  if (tablet.equipped_slot !== null && tablet.equipped_slot !== undefined) {
    throw new Error("Cannot trade an equipped tablet. Unequip it first");
  }

  const fromPlayer = await db("players").where({ id: fromPlayerId }).first();
  const toPlayer = await db("players").where({ id: toPlayerId }).first();

  if (!fromPlayer || !toPlayer) {
    throw new Error("One or both players not found");
  }
  if (fromPlayer.current_sector_id !== toPlayer.current_sector_id) {
    throw new Error("Both players must be in the same sector to trade tablets");
  }

  const toProg = await db("player_progression")
    .where({ player_id: toPlayerId })
    .first();
  const toLevel = toProg?.level || 1;

  const toCountResult = await db("player_tablets")
    .where({ player_id: toPlayerId })
    .count("* as count")
    .first();
  const toCount = Number(toCountResult?.count || 0);

  const toCapacity = getTabletStorage(toLevel);
  if (toCount >= toCapacity) {
    throw new Error("Recipient does not have enough tablet storage");
  }

  await db("player_tablets")
    .where({ id: playerTabletId })
    .update({ player_id: toPlayerId });

  return {
    traded: true,
    tabletName: tablet.name,
    fromPlayer: fromPlayerId,
    toPlayer: toPlayerId,
  };
}
