import { GAME_CONFIG } from "../config/game";

export type CommodityType = "cyrillium" | "food" | "tech" | "vedic";
export type TradeMode = "buy" | "sell" | "none";

export interface OutpostState {
  cyrilliumStock: number;
  cyrilliumCapacity: number;
  cyrilliumMode: TradeMode;
  foodStock: number;
  foodCapacity: number;
  foodMode: TradeMode;
  techStock: number;
  techCapacity: number;
  techMode: TradeMode;
  vedicStock: number;
  vedicCapacity: number;
  vedicMode: TradeMode;
  treasury: number;
}

export interface TradeResult {
  success: boolean;
  error?: string;
  commodity: CommodityType;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  newStock: number;
  newTreasury: number;
}

const BASE_PRICES: Record<CommodityType, number> = {
  cyrillium: GAME_CONFIG.BASE_CYRILLIUM_PRICE,
  food: GAME_CONFIG.BASE_FOOD_PRICE,
  tech: GAME_CONFIG.BASE_TECH_PRICE,
  vedic: GAME_CONFIG.BASE_VEDIC_PRICE,
};

/**
 * Calculate the current price for a commodity at an outpost.
 * Uses a supply/demand curve: price is inversely proportional to stock level.
 * When stock is low (high demand), prices rise up to 2x base. When stock is
 * full (oversupply), prices drop to 0.5x base. This creates natural trade
 * routes — buy where it's cheap (oversupplied), sell where it's expensive
 * (undersupplied). Floor of 1 credit prevents free goods.
 */
export function calculatePrice(
  commodity: CommodityType,
  currentStock: number,
  capacity: number,
): number {
  const basePrice = BASE_PRICES[commodity];
  const ratio = currentStock / capacity; // 0 = empty, 1 = full
  // Price inversely proportional to stock ratio
  // Low stock = high price, high stock = low price
  const multiplier = 2.0 - ratio * 1.5; // ranges from 0.5 (full) to 2.0 (empty)
  return Math.max(1, Math.round(basePrice * multiplier));
}

function getStockInfo(outpost: OutpostState, commodity: CommodityType) {
  switch (commodity) {
    case "cyrillium":
      return {
        stock: outpost.cyrilliumStock,
        capacity: outpost.cyrilliumCapacity,
        mode: outpost.cyrilliumMode,
      };
    case "food":
      return {
        stock: outpost.foodStock,
        capacity: outpost.foodCapacity,
        mode: outpost.foodMode,
      };
    case "tech":
      return {
        stock: outpost.techStock,
        capacity: outpost.techCapacity,
        mode: outpost.techMode,
      };
    case "vedic":
      return {
        stock: outpost.vedicStock,
        capacity: outpost.vedicCapacity,
        mode: outpost.vedicMode,
      };
  }
}

function failResult(
  error: string,
  commodity: CommodityType,
  stock: number,
  treasury: number,
): TradeResult {
  return {
    success: false,
    error,
    commodity,
    quantity: 0,
    pricePerUnit: 0,
    totalCost: 0,
    newStock: stock,
    newTreasury: treasury,
  };
}

/**
 * Execute a trade transaction between a player and an outpost.
 * Pure function — computes new stock/treasury values without touching the DB.
 * The caller (API handler) is responsible for DB writes, cargo checks, and
 * racial bonuses. Trade mode validation ensures outposts only participate in
 * their configured direction (buy/sell/none per commodity). Selling is
 * constrained by both outpost treasury (can it afford to buy?) and remaining
 * capacity (does it have room?).
 */
export function executeTrade(
  outpost: OutpostState,
  commodity: CommodityType,
  quantity: number,
  direction: "buy" | "sell",
): TradeResult {
  const { stock, capacity, mode } = getStockInfo(outpost, commodity);

  if (direction === "buy" && mode !== "sell") {
    return failResult(
      "Outpost does not sell this commodity",
      commodity,
      stock,
      outpost.treasury,
    );
  }
  if (direction === "sell" && mode !== "buy") {
    return failResult(
      "Outpost does not buy this commodity",
      commodity,
      stock,
      outpost.treasury,
    );
  }

  const pricePerUnit = calculatePrice(commodity, stock, capacity);

  if (direction === "buy") {
    const availableQuantity = Math.min(quantity, stock);
    if (availableQuantity === 0) {
      return failResult(
        "Outpost has no stock",
        commodity,
        stock,
        outpost.treasury,
      );
    }
    const totalCost = pricePerUnit * availableQuantity;
    return {
      success: true,
      commodity,
      quantity: availableQuantity,
      pricePerUnit,
      totalCost,
      newStock: stock - availableQuantity,
      newTreasury: outpost.treasury + totalCost,
    };
  } else {
    const maxAffordable = Math.floor(outpost.treasury / pricePerUnit);
    const maxCapacity = capacity - stock;
    const actualQuantity = Math.min(quantity, maxAffordable, maxCapacity);
    if (actualQuantity === 0) {
      return failResult(
        "Outpost cannot afford or has no capacity",
        commodity,
        stock,
        outpost.treasury,
      );
    }
    const totalCost = pricePerUnit * actualQuantity;
    return {
      success: true,
      commodity,
      quantity: actualQuantity,
      pricePerUnit,
      totalCost,
      newStock: stock + actualQuantity,
      newTreasury: outpost.treasury - totalCost,
    };
  }
}
