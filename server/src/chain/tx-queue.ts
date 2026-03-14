// Transaction Queue — async chain operations that don't block API responses
// API routes push operations; background worker processes them with retry logic.
// On failure after max retries: log for manual investigation (DB already has correct state).

import { type Address, type Hash } from "viem";
import {
  registerMember,
  mintToken,
  burnToken,
  mintShip,
  updateShip,
  destroyShip,
  mintCharacter,
  updateCharacter,
  updateFactionRep,
  mintEquipment,
  creditMember,
  debitMember,
  transferBetweenMembers,
  executeAction,
  createSyndicate,
  addSyndicateMember,
  removeSyndicateMember,
  getMemberAddress,
  type ShipData,
  type CharacterData,
  type EquipmentData,
} from "./client";
import { isChainEnabled, isSettlementEnabled } from "./config";
import db from "../db/connection";

// ---------------------------------------------------------------------------
// Queue types
// ---------------------------------------------------------------------------

export type ChainOp =
  | { type: "registerMember"; playerWallet: Address }
  | { type: "mintToken"; resource: string; to: Address; amount: bigint }
  | { type: "burnToken"; resource: string; from: Address; amount: bigint }
  | { type: "mintShip"; to: Address; data: ShipData }
  | { type: "updateShip"; tokenId: bigint; data: ShipData }
  | { type: "destroyShip"; tokenId: bigint }
  | { type: "mintCharacter"; to: Address; data: CharacterData }
  | { type: "updateCharacter"; tokenId: bigint; data: CharacterData }
  | {
      type: "updateFactionRep";
      tokenId: bigint;
      factionId: string;
      rep: bigint;
    }
  | { type: "mintEquipment"; to: Address; data: EquipmentData }
  | {
      type: "creditMember";
      memberAddress: Address;
      resource: string;
      amount: bigint;
    }
  | {
      type: "debitMember";
      memberAddress: Address;
      resource: string;
      amount: bigint;
    }
  | {
      type: "transferBetweenMembers";
      fromMember: Address;
      toMember: Address;
      resource: string;
      amount: bigint;
    }
  | {
      type: "executeAction";
      memberAddress: Address;
      actionType: string;
      data: `0x${string}`;
    }
  | {
      type: "createSyndicate";
      name: string;
      founder: Address;
      votingPeriod: bigint;
      quorumPercent: bigint;
    }
  | {
      type: "addSyndicateMember";
      syndicateIndex: bigint;
      member: Address;
    }
  | {
      type: "removeSyndicateMember";
      syndicateIndex: bigint;
      member: Address;
    }
  | {
      type: "creditMemberByWallet";
      playerWallet: Address;
      resource: string;
      amount: bigint;
    }
  | {
      type: "initMemberAssets";
      playerWallet: Address;
      resource: string;
      amount: bigint;
      characterData: CharacterData;
      shipData: ShipData;
    };

interface QueueEntry {
  id: number;
  op: ChainOp;
  retries: number;
  maxRetries: number;
  createdAt: number;
  lastError?: string;
  status: "pending" | "processing" | "completed" | "failed";
  // Optional callback for when the caller needs the result (e.g., token ID from mint)
  resolve?: (result: unknown) => void;
  reject?: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Queue state
// ---------------------------------------------------------------------------

let nextId = 1;
const queue: QueueEntry[] = [];
let processing = false;
let workerInterval: ReturnType<typeof setInterval> | null = null;

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Enqueue a chain operation for async processing */
export function enqueue(op: ChainOp): void {
  if (!isChainEnabled()) return;

  queue.push({
    id: nextId++,
    op,
    retries: 0,
    maxRetries: MAX_RETRIES,
    createdAt: Date.now(),
    status: "pending",
  });
}

/**
 * Enqueue a chain operation and wait for its result.
 * Use sparingly — most ops should be fire-and-forget via enqueue().
 */
export function enqueueAndWait<T = unknown>(op: ChainOp): Promise<T> {
  if (!isChainEnabled()) {
    return Promise.resolve(undefined as T);
  }

  return new Promise<T>((resolve, reject) => {
    queue.push({
      id: nextId++,
      op,
      retries: 0,
      maxRetries: MAX_RETRIES,
      createdAt: Date.now(),
      status: "pending",
      resolve: resolve as (result: unknown) => void,
      reject,
    });
  });
}

/**
 * Convenience: credit a player's MemberContract with game credits.
 * Looks up member_contract_address from DB, enqueues if found.
 * Call from any game system that awards credits.
 */
export async function settleCreditPlayer(
  playerId: string,
  amount: number,
  settlementType:
    | "trade"
    | "combat"
    | "store"
    | "progression"
    | "syndicate" = "progression",
): Promise<void> {
  if (!isChainEnabled() || !isSettlementEnabled(settlementType) || amount <= 0)
    return;
  const player = await db("players")
    .where({ id: playerId })
    .select("member_contract_address")
    .first();
  if (!player?.member_contract_address) return;
  enqueue({
    type: "creditMember",
    memberAddress: player.member_contract_address as Address,
    resource: "credits",
    amount: BigInt(amount) * 10n ** 18n,
  });
}

/**
 * Convenience: debit a player's MemberContract credits.
 */
export async function settleDebitPlayer(
  playerId: string,
  amount: number,
  settlementType:
    | "trade"
    | "combat"
    | "store"
    | "progression"
    | "syndicate" = "progression",
): Promise<void> {
  if (!isChainEnabled() || !isSettlementEnabled(settlementType) || amount <= 0)
    return;
  const player = await db("players")
    .where({ id: playerId })
    .select("member_contract_address")
    .first();
  if (!player?.member_contract_address) return;
  enqueue({
    type: "debitMember",
    memberAddress: player.member_contract_address as Address,
    resource: "credits",
    amount: BigInt(amount) * 10n ** 18n,
  });
}

/** Get queue stats for monitoring */
export function getQueueStats(): {
  pending: number;
  processing: number;
  failed: number;
  total: number;
} {
  return {
    pending: queue.filter((e) => e.status === "pending").length,
    processing: queue.filter((e) => e.status === "processing").length,
    failed: queue.filter((e) => e.status === "failed").length,
    total: queue.length,
  };
}

/** Get recent failed entries for debugging */
export function getFailedEntries(): Array<{
  id: number;
  type: string;
  retries: number;
  lastError?: string;
  createdAt: number;
}> {
  return queue
    .filter((e) => e.status === "failed")
    .slice(-20)
    .map((e) => ({
      id: e.id,
      type: e.op.type,
      retries: e.retries,
      lastError: e.lastError,
      createdAt: e.createdAt,
    }));
}

// ---------------------------------------------------------------------------
// Worker — processes queue entries sequentially
// ---------------------------------------------------------------------------

async function executeOp(op: ChainOp): Promise<unknown> {
  switch (op.type) {
    case "registerMember":
      return registerMember(op.playerWallet);
    case "mintToken":
      return mintToken(op.resource, op.to, op.amount);
    case "burnToken":
      return burnToken(op.resource, op.from, op.amount);
    case "mintShip":
      return mintShip(op.to, op.data);
    case "updateShip":
      return updateShip(op.tokenId, op.data);
    case "destroyShip":
      return destroyShip(op.tokenId);
    case "mintCharacter":
      return mintCharacter(op.to, op.data);
    case "updateCharacter":
      return updateCharacter(op.tokenId, op.data);
    case "updateFactionRep":
      return updateFactionRep(op.tokenId, op.factionId, op.rep);
    case "mintEquipment":
      return mintEquipment(op.to, op.data);
    case "creditMember":
      return creditMember(op.memberAddress, op.resource, op.amount);
    case "debitMember":
      return debitMember(op.memberAddress, op.resource, op.amount);
    case "transferBetweenMembers":
      return transferBetweenMembers(
        op.fromMember,
        op.toMember,
        op.resource,
        op.amount,
      );
    case "executeAction":
      return executeAction(op.memberAddress, op.actionType, op.data);
    case "createSyndicate":
      return createSyndicate(
        op.name,
        op.founder,
        op.votingPeriod,
        op.quorumPercent,
      );
    case "addSyndicateMember":
      return addSyndicateMember(op.syndicateIndex, op.member);
    case "removeSyndicateMember":
      return removeSyndicateMember(op.syndicateIndex, op.member);
    case "creditMemberByWallet": {
      const memberAddr = await getMemberAddress(op.playerWallet);
      return creditMember(memberAddr, op.resource, op.amount);
    }
    case "initMemberAssets": {
      const member = await getMemberAddress(op.playerWallet);
      // Mint CRED to MemberContract and credit its ledger
      await mintToken(op.resource, member, op.amount);
      await creditMember(member, op.resource, op.amount);
      // Mint CharacterNFT to MemberContract
      await mintCharacter(member, op.characterData);
      // Mint ShipNFT to MemberContract
      await mintShip(member, op.shipData);
      console.log(
        `[tx-queue] initMemberAssets complete for ${op.playerWallet} → ${member}`,
      );
      return;
    }
    default:
      throw new Error(`Unknown chain operation type: ${(op as ChainOp).type}`);
  }
}

function getRetryDelay(retries: number): number {
  // Exponential backoff with jitter: base * 2^retries + random jitter
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retries), MAX_DELAY_MS);
  const jitter = Math.random() * delay * 0.1;
  return delay + jitter;
}

async function processNext(): Promise<void> {
  if (processing) return;

  const entry = queue.find((e) => e.status === "pending");
  if (!entry) return;

  processing = true;
  entry.status = "processing";

  try {
    const result = await executeOp(entry.op);
    entry.status = "completed";
    entry.resolve?.(result);

    // Remove completed entries (keep last 100 for monitoring)
    const completedCount = queue.filter((e) => e.status === "completed").length;
    if (completedCount > 100) {
      const idx = queue.findIndex((e) => e.status === "completed");
      if (idx >= 0) queue.splice(idx, 1);
    }
  } catch (err) {
    entry.retries++;
    entry.lastError = err instanceof Error ? err.message : String(err);

    if (entry.retries >= entry.maxRetries) {
      entry.status = "failed";
      entry.reject?.(
        new Error(
          `Chain op ${entry.op.type} failed after ${entry.retries} retries: ${entry.lastError}`,
        ),
      );
      console.error(
        `[tx-queue] FAILED permanently: ${entry.op.type} (id=${entry.id}) after ${entry.retries} retries: ${entry.lastError}`,
      );
    } else {
      // Schedule retry with backoff
      entry.status = "pending";
      const delay = getRetryDelay(entry.retries);
      console.warn(
        `[tx-queue] Retry ${entry.retries}/${entry.maxRetries} for ${entry.op.type} (id=${entry.id}) in ${Math.round(delay)}ms: ${entry.lastError}`,
      );
      // Move to end of queue so other ops can proceed
      const idx = queue.indexOf(entry);
      if (idx >= 0) {
        queue.splice(idx, 1);
        setTimeout(() => queue.push(entry), delay);
      }
    }
  } finally {
    processing = false;
  }
}

/** Start the tx-queue background worker */
export function startTxQueue(): void {
  if (!isChainEnabled()) {
    console.log("[tx-queue] Chain disabled, tx-queue not started");
    return;
  }

  if (workerInterval) return;

  console.log("[tx-queue] Starting transaction queue worker");
  workerInterval = setInterval(() => {
    processNext().catch((err) =>
      console.error("[tx-queue] Worker error:", err),
    );
  }, 200); // Process up to 5 ops/second
}

/** Stop the tx-queue worker */
export function stopTxQueue(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[tx-queue] Transaction queue worker stopped");
  }
}
