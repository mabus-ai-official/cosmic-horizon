import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import crypto from "crypto";

export type EventType =
  | "asteroid_field"
  | "nebula"
  | "distress_signal"
  | "derelict_ship"
  | "resource_cache"
  | "ion_storm";

const EVENT_TYPES: EventType[] = [
  "asteroid_field",
  "nebula",
  "distress_signal",
  "derelict_ship",
  "resource_cache",
  "ion_storm",
];

interface EventOutcome {
  message: string;
  creditsGained?: number;
  creditsLost?: number;
  energyGained?: number;
  energyLost?: number;
  cargoGained?: { commodity: string; quantity: number };
}

export function selectRandomEventType(): EventType {
  return EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
}

export function generateEventData(type: EventType): Record<string, any> {
  switch (type) {
    case "asteroid_field":
      return {
        mineralYield: Math.floor(Math.random() * 10) + 1,
        hazardLevel: Math.floor(Math.random() * 3) + 1,
      };
    case "nebula":
      return {
        density: Math.random().toFixed(2),
        interference: Math.random() > 0.5,
      };
    case "distress_signal":
      return {
        shipType: ["freighter", "scout", "transport"][
          Math.floor(Math.random() * 3)
        ],
        urgency: Math.floor(Math.random() * 5) + 1,
      };
    case "derelict_ship":
      return {
        salvageValue: Math.floor(Math.random() * 2000) + 500,
        trapped: Math.random() > 0.7,
      };
    case "resource_cache":
      return {
        commodity: ["cyrillium", "food", "tech"][Math.floor(Math.random() * 3)],
        quantity: Math.floor(Math.random() * 15) + 5,
      };
    case "ion_storm":
      return {
        intensity: Math.floor(Math.random() * 5) + 1,
        damageRisk: Math.floor(Math.random() * 20) + 5,
      };
    default:
      return {};
  }
}

export function resolveEvent(
  type: EventType,
  data: Record<string, any>,
): EventOutcome {
  switch (type) {
    case "asteroid_field":
      return {
        message: `You mine ${data.mineralYield} cyrillium from the asteroid field.`,
        cargoGained: { commodity: "cyrillium", quantity: data.mineralYield },
      };
    case "nebula":
      if (data.interference) {
        return {
          message: "The nebula interferes with your systems. Energy drained.",
          energyLost: 5,
        };
      }
      return {
        message:
          "You navigate the nebula safely and find a calm energy pocket.",
        energyGained: 10,
      };
    case "distress_signal":
      return {
        message: `You respond to a distress signal from a ${data.shipType}. They reward you for the rescue.`,
        creditsGained: 500 + data.urgency * 200,
      };
    case "derelict_ship":
      if (data.trapped) {
        return {
          message: "The derelict was a trap! You lose energy escaping.",
          energyLost: 15,
        };
      }
      return {
        message: `You salvage ${data.salvageValue} credits from the derelict.`,
        creditsGained: data.salvageValue,
      };
    case "resource_cache":
      return {
        message: `You discover a resource cache containing ${data.quantity} ${data.commodity}.`,
        cargoGained: { commodity: data.commodity, quantity: data.quantity },
      };
    case "ion_storm":
      return {
        message: `An ion storm strikes! You lose ${data.damageRisk} energy weathering it.`,
        energyLost: data.damageRisk,
      };
    default:
      return { message: "Nothing happens." };
  }
}

export async function spawnSectorEvents(): Promise<number[]> {
  const activeCount = await db("sector_events")
    .where({ status: "active" })
    .count("* as count")
    .first();
  if (Number(activeCount?.count || 0) >= GAME_CONFIG.MAX_ACTIVE_EVENTS)
    return [];

  if (Math.random() > GAME_CONFIG.EVENT_SPAWN_CHANCE_PER_TICK) return [];

  const sector = await db("sectors").orderByRaw("RANDOM()").first();
  if (!sector) return [];

  const type = selectRandomEventType();
  const data = generateEventData(type);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + GAME_CONFIG.EVENT_DEFAULT_LIFETIME_MINUTES * 60000,
  );

  await db("sector_events").insert({
    id: crypto.randomUUID(),
    sector_id: sector.id,
    event_type: type,
    data: JSON.stringify(data),
    status: "active",
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  return [sector.id];
}

export async function expireSectorEvents(): Promise<number[]> {
  const expiring = await db("sector_events")
    .where({ status: "active" })
    .where("expires_at", "<", new Date().toISOString())
    .select("sector_id");

  if (expiring.length === 0) return [];

  await db("sector_events")
    .where({ status: "active" })
    .where("expires_at", "<", new Date().toISOString())
    .update({ status: "expired" });

  return [...new Set(expiring.map((e: any) => e.sector_id))];
}
