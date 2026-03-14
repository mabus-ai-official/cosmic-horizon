// Chain configuration — controls the gradual migration from DB to chain authority
// Flip flags one at a time as reconciler proves consistency

export const CHAIN_AUTHORITY = {
  // When true, read from chain instead of DB for these data types
  // Start all false — DB is authoritative. Flip after reconciler proves consistency.
  tokenBalances: false,
  shipOwnership: false,
  characterData: false,
  syndicateState: false,
} as const;

// Chain feature flags — enable/disable chain integration per subsystem
export const CHAIN_FEATURES = {
  // Master kill switch — if false, no chain operations are enqueued
  enabled: process.env.CHAIN_ENABLED !== "false",

  // Per-subsystem flags (all default true when chain is enabled)
  indexer: process.env.CHAIN_INDEXER !== "false",
  txQueue: process.env.CHAIN_TX_QUEUE !== "false",

  // Settlement flags — which game actions write to chain
  tradeSettlement: process.env.CHAIN_TRADE !== "false",
  combatSettlement: process.env.CHAIN_COMBAT !== "false",
  storeSettlement: process.env.CHAIN_STORE !== "false",
  progressionSettlement: process.env.CHAIN_PROGRESSION !== "false",
  syndicateSettlement: process.env.CHAIN_SYNDICATE !== "false",
} as const;

/** Check if chain operations should be executed */
export function isChainEnabled(): boolean {
  return CHAIN_FEATURES.enabled;
}

/** Check if a specific settlement type is enabled */
export function isSettlementEnabled(
  type: "trade" | "combat" | "store" | "progression" | "syndicate",
): boolean {
  if (!CHAIN_FEATURES.enabled) return false;
  switch (type) {
    case "trade":
      return CHAIN_FEATURES.tradeSettlement;
    case "combat":
      return CHAIN_FEATURES.combatSettlement;
    case "store":
      return CHAIN_FEATURES.storeSettlement;
    case "progression":
      return CHAIN_FEATURES.progressionSettlement;
    case "syndicate":
      return CHAIN_FEATURES.syndicateSettlement;
    default:
      return false;
  }
}
