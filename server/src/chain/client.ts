// Viem chain client for Cosmic Horizon on-chain operations
// Connects to the local anvil testnet and provides typed contract helpers
// for the game server to mint tokens, register members, execute actions, etc.

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  keccak256,
  toBytes,
  type Address,
  type Hash,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainConfig, contractAddresses, resourceToToken } from "./addresses";
import {
  gameTokenAbi,
  shipNftAbi,
  equipmentNftAbi,
  characterNftAbi,
  syndicateFactoryAbi,
  syndicateGovernorAbi,
  memberFactoryAbi,
  memberContractAbi,
} from "./abis";

// ---------------------------------------------------------------------------
// Chain definition
// ---------------------------------------------------------------------------

const gameChain = defineChain({
  id: chainConfig.chainId,
  name: "Cosmic Horizon Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [chainConfig.rpcUrl] },
  },
});

// ---------------------------------------------------------------------------
// Parsed ABIs (viem needs parseAbi for human-readable format)
// ---------------------------------------------------------------------------

const parsedGameTokenAbi = parseAbi(gameTokenAbi);
const parsedShipNftAbi = parseAbi(shipNftAbi);
const parsedEquipmentNftAbi = parseAbi(equipmentNftAbi);
const parsedCharacterNftAbi = parseAbi(characterNftAbi);
const parsedSyndicateFactoryAbi = parseAbi(syndicateFactoryAbi);
const parsedSyndicateGovernorAbi = parseAbi(syndicateGovernorAbi);
const parsedMemberFactoryAbi = parseAbi(memberFactoryAbi);
const parsedMemberContractAbi = parseAbi(memberContractAbi);

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const gameServerAccount = privateKeyToAccount(chainConfig.gameServerPrivateKey);

export const publicClient = createPublicClient({
  chain: gameChain,
  transport: http(chainConfig.rpcUrl),
});

export const walletClient = createWalletClient({
  account: gameServerAccount,
  chain: gameChain,
  transport: http(chainConfig.rpcUrl),
});

// ---------------------------------------------------------------------------
// Low-level read/write helpers (avoid getContract type issues with defineChain)
// ---------------------------------------------------------------------------

async function read<T = unknown>(
  address: Address,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[] = [],
): Promise<T> {
  return publicClient.readContract({
    address,
    abi: abi as any,
    functionName,
    args,
  }) as Promise<T>;
}

async function write(
  address: Address,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[] = [],
): Promise<Hash> {
  return walletClient.writeContract({
    address,
    abi: abi as any,
    functionName,
    args,
  });
}

// ---------------------------------------------------------------------------
// Helper functions — Member registration
// ---------------------------------------------------------------------------

/** Register a player on-chain, returns their clone contract address */
export async function registerMember(playerWallet: Address): Promise<Address> {
  const hash = await write(
    contractAddresses.memberFactory,
    parsedMemberFactoryAbi,
    "registerMember",
    [playerWallet],
  );
  await publicClient.waitForTransactionReceipt({ hash });

  // Read the deployed clone address
  return read<Address>(
    contractAddresses.memberFactory,
    parsedMemberFactoryAbi,
    "getMemberContract",
    [playerWallet],
  );
}

/** Get a player's member contract address (returns 0x0 if not registered) */
export async function getMemberAddress(
  playerWallet: Address,
): Promise<Address> {
  return read<Address>(
    contractAddresses.memberFactory,
    parsedMemberFactoryAbi,
    "getMemberContract",
    [playerWallet],
  );
}

/** Predict a player's member contract address before registration */
export async function predictMemberAddress(
  playerWallet: Address,
): Promise<Address> {
  return read<Address>(
    contractAddresses.memberFactory,
    parsedMemberFactoryAbi,
    "predictMemberAddress",
    [playerWallet],
  );
}

// ---------------------------------------------------------------------------
// Helper functions — Token operations
// ---------------------------------------------------------------------------

function getTokenAddress(resource: string): Address {
  const addr = resourceToToken[resource];
  if (!addr) throw new Error(`Unknown resource: ${resource}`);
  return addr;
}

/** Mint fungible tokens to a player's wallet */
export async function mintToken(
  resource: string,
  to: Address,
  amount: bigint,
): Promise<Hash> {
  return write(getTokenAddress(resource), parsedGameTokenAbi, "mint", [
    to,
    amount,
  ]);
}

/** Burn fungible tokens from a player's wallet */
export async function burnToken(
  resource: string,
  from: Address,
  amount: bigint,
): Promise<Hash> {
  return write(getTokenAddress(resource), parsedGameTokenAbi, "burn", [
    from,
    amount,
  ]);
}

/** Read a token balance */
export async function tokenBalance(
  resource: string,
  account: Address,
): Promise<bigint> {
  return read<bigint>(
    getTokenAddress(resource),
    parsedGameTokenAbi,
    "balanceOf",
    [account],
  );
}

// ---------------------------------------------------------------------------
// Helper functions — Ship NFT
// ---------------------------------------------------------------------------

export interface ShipData {
  shipType: string;
  hullHp: number;
  maxHullHp: number;
  weaponEnergy: number;
  engineEnergy: number;
  cargoBays: number;
  hasCloakDevice: boolean;
  hasRacheDevice: boolean;
  hasJumpDrive: boolean;
}

/** Mint a ship NFT, returns the token ID */
export async function mintShip(to: Address, data: ShipData): Promise<bigint> {
  const hash = await write(
    contractAddresses.shipNft,
    parsedShipNftAbi,
    "mintShip",
    [to, data],
  );
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse ShipMinted event to get tokenId
  const mintEvent = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() === contractAddresses.shipNft.toLowerCase(),
  );
  if (!mintEvent || !mintEvent.topics[1]) {
    throw new Error("ShipMinted event not found in receipt");
  }
  return BigInt(mintEvent.topics[1]);
}

/** Update ship data on-chain */
export async function updateShip(
  tokenId: bigint,
  data: ShipData,
): Promise<Hash> {
  return write(contractAddresses.shipNft, parsedShipNftAbi, "updateShip", [
    tokenId,
    data,
  ]);
}

/** Destroy a ship NFT */
export async function destroyShip(tokenId: bigint): Promise<Hash> {
  return write(contractAddresses.shipNft, parsedShipNftAbi, "destroyShip", [
    tokenId,
  ]);
}

/** Read ship data */
export async function getShipData(tokenId: bigint): Promise<ShipData> {
  return read<ShipData>(
    contractAddresses.shipNft,
    parsedShipNftAbi,
    "getShip",
    [tokenId],
  );
}

// ---------------------------------------------------------------------------
// Helper functions — Character NFT
// ---------------------------------------------------------------------------

export interface CharacterData {
  race: string;
  level: number;
  xp: bigint;
  totalCombatXp: bigint;
  totalMissionXp: bigint;
  totalTradeXp: bigint;
  totalExploreXp: bigint;
}

/** Mint a character NFT, returns the token ID */
export async function mintCharacter(
  to: Address,
  data: CharacterData,
): Promise<bigint> {
  const hash = await write(
    contractAddresses.characterNft,
    parsedCharacterNftAbi,
    "mintCharacter",
    [to, data],
  );
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const mintEvent = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() ===
      contractAddresses.characterNft.toLowerCase(),
  );
  if (!mintEvent || !mintEvent.topics[1]) {
    throw new Error("CharacterMinted event not found in receipt");
  }
  return BigInt(mintEvent.topics[1]);
}

/** Update character progression data on-chain */
export async function updateCharacter(
  tokenId: bigint,
  data: CharacterData,
): Promise<Hash> {
  return write(
    contractAddresses.characterNft,
    parsedCharacterNftAbi,
    "updateCharacter",
    [tokenId, data],
  );
}

/** Update faction reputation for a character */
export async function updateFactionRep(
  tokenId: bigint,
  factionId: string,
  rep: bigint,
): Promise<Hash> {
  const factionHash = keccak256(toBytes(factionId));
  return write(
    contractAddresses.characterNft,
    parsedCharacterNftAbi,
    "updateFactionRep",
    [tokenId, factionHash, rep],
  );
}

/** Read character data */
export async function getCharacterData(
  tokenId: bigint,
): Promise<CharacterData> {
  return read<CharacterData>(
    contractAddresses.characterNft,
    parsedCharacterNftAbi,
    "getCharacter",
    [tokenId],
  );
}

/** Read faction reputation for a character */
export async function getFactionRep(
  tokenId: bigint,
  factionId: string,
): Promise<bigint> {
  const factionHash = keccak256(toBytes(factionId));
  return read<bigint>(
    contractAddresses.characterNft,
    parsedCharacterNftAbi,
    "getFactionRep",
    [tokenId, factionHash],
  );
}

// ---------------------------------------------------------------------------
// Helper functions — Equipment NFT
// ---------------------------------------------------------------------------

export interface EquipmentData {
  equipType: string;
  name: string;
  tier: number;
  installedOnShip: bigint;
}

/** Mint equipment NFT, returns the token ID */
export async function mintEquipment(
  to: Address,
  data: EquipmentData,
): Promise<bigint> {
  const hash = await write(
    contractAddresses.equipmentNft,
    parsedEquipmentNftAbi,
    "mintEquipment",
    [to, data],
  );
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const mintEvent = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() ===
      contractAddresses.equipmentNft.toLowerCase(),
  );
  if (!mintEvent || !mintEvent.topics[1]) {
    throw new Error("EquipmentMinted event not found in receipt");
  }
  return BigInt(mintEvent.topics[1]);
}

/** Install equipment on a ship */
export async function installEquipment(
  tokenId: bigint,
  shipId: bigint,
): Promise<Hash> {
  return write(
    contractAddresses.equipmentNft,
    parsedEquipmentNftAbi,
    "installOnShip",
    [tokenId, shipId],
  );
}

/** Uninstall equipment from its ship */
export async function uninstallEquipment(tokenId: bigint): Promise<Hash> {
  return write(
    contractAddresses.equipmentNft,
    parsedEquipmentNftAbi,
    "uninstallFromShip",
    [tokenId],
  );
}

// ---------------------------------------------------------------------------
// Helper functions — Game actions (via MemberContract)
// ---------------------------------------------------------------------------

/** Execute a game action on a player's member contract */
export async function executeAction(
  memberAddress: Address,
  actionType: string,
  data: `0x${string}`,
): Promise<Hash> {
  const actionHash = keccak256(toBytes(actionType));
  return write(memberAddress, parsedMemberContractAbi, "executeAction", [
    actionHash,
    data,
  ]);
}

/** Transfer fungible tokens between member contracts (combat/trade resolution) */
export async function transferBetweenMembers(
  fromMember: Address,
  toMember: Address,
  resource: string,
  amount: bigint,
): Promise<void> {
  const tokenAddress = getTokenAddress(resource);

  // Two-step atomic: move tokens, then update winner's ledger
  const hash1 = await write(
    fromMember,
    parsedMemberContractAbi,
    "transferFungibleTo",
    [tokenAddress, toMember, amount],
  );
  await publicClient.waitForTransactionReceipt({ hash: hash1 });

  await write(toMember, parsedMemberContractAbi, "creditFungible", [
    tokenAddress,
    amount,
  ]);
}

/** Credit tokens to a member's on-chain ledger (rewards, quest completion) */
export async function creditMember(
  memberAddress: Address,
  resource: string,
  amount: bigint,
): Promise<Hash> {
  const tokenAddress = getTokenAddress(resource);
  return write(memberAddress, parsedMemberContractAbi, "creditFungible", [
    tokenAddress,
    amount,
  ]);
}

/** Debit tokens from a member's on-chain ledger (purchases, fees) */
export async function debitMember(
  memberAddress: Address,
  resource: string,
  amount: bigint,
): Promise<Hash> {
  const tokenAddress = getTokenAddress(resource);
  return write(memberAddress, parsedMemberContractAbi, "debitFungible", [
    tokenAddress,
    amount,
  ]);
}

// ---------------------------------------------------------------------------
// Helper functions — Syndicate DAO
// ---------------------------------------------------------------------------

export interface SyndicateInfo {
  name: string;
  token: Address;
  treasury: Address;
  governor: Address;
  founder: Address;
  createdAt: bigint;
}

/** Deploy a full syndicate DAO stack on-chain */
export async function createSyndicate(
  name: string,
  founder: Address,
  votingPeriod: bigint,
  quorumPercent: bigint,
): Promise<bigint> {
  const hash = await write(
    contractAddresses.syndicateFactory,
    parsedSyndicateFactoryAbi,
    "createSyndicate",
    [name, founder, votingPeriod, quorumPercent],
  );
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse SyndicateCreated event to get index
  const createEvent = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() ===
      contractAddresses.syndicateFactory.toLowerCase(),
  );
  if (!createEvent || !createEvent.topics[1]) {
    throw new Error("SyndicateCreated event not found in receipt");
  }
  return BigInt(createEvent.topics[1]);
}

/** Add a member to a syndicate (mints governance token) */
export async function addSyndicateMember(
  syndicateIndex: bigint,
  member: Address,
): Promise<Hash> {
  return write(
    contractAddresses.syndicateFactory,
    parsedSyndicateFactoryAbi,
    "addMember",
    [syndicateIndex, member],
  );
}

/** Remove a member from a syndicate (burns governance token) */
export async function removeSyndicateMember(
  syndicateIndex: bigint,
  member: Address,
): Promise<Hash> {
  return write(
    contractAddresses.syndicateFactory,
    parsedSyndicateFactoryAbi,
    "removeMember",
    [syndicateIndex, member],
  );
}

/** Read syndicate info from chain */
export async function getSyndicateInfo(index: bigint): Promise<SyndicateInfo> {
  return read<SyndicateInfo>(
    contractAddresses.syndicateFactory,
    parsedSyndicateFactoryAbi,
    "getSyndicate",
    [index],
  );
}

/** Create a proposal on a syndicate's governor */
export async function createProposal(
  governorAddress: Address,
  description: string,
  target: Address,
  callData: `0x${string}`,
): Promise<bigint> {
  const hash = await write(
    governorAddress,
    parsedSyndicateGovernorAbi,
    "propose",
    [description, target, callData],
  );
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const propEvent = receipt.logs.find(
    (log) => log.address.toLowerCase() === governorAddress.toLowerCase(),
  );
  if (!propEvent || !propEvent.topics[1]) {
    throw new Error("ProposalCreated event not found in receipt");
  }
  return BigInt(propEvent.topics[1]);
}

/** Cast a vote on a proposal */
export async function castVote(
  governorAddress: Address,
  proposalId: bigint,
  support: boolean,
): Promise<Hash> {
  return write(governorAddress, parsedSyndicateGovernorAbi, "castVote", [
    proposalId,
    support,
  ]);
}

/** Execute a passed proposal */
export async function executeProposal(
  governorAddress: Address,
  proposalId: bigint,
): Promise<Hash> {
  return write(governorAddress, parsedSyndicateGovernorAbi, "execute", [
    proposalId,
  ]);
}

// ---------------------------------------------------------------------------
// Health check — verify chain connectivity
// ---------------------------------------------------------------------------

export async function checkChainHealth(): Promise<{
  connected: boolean;
  chainId: number;
  blockNumber: number;
  memberCount: number;
}> {
  try {
    const [chainId, blockNumber, memberCount] = await Promise.all([
      publicClient.getChainId(),
      publicClient.getBlockNumber(),
      read<bigint>(
        contractAddresses.memberFactory,
        parsedMemberFactoryAbi,
        "memberCount",
      ),
    ]);
    return {
      connected: true,
      chainId,
      blockNumber: Number(blockNumber),
      memberCount: Number(memberCount),
    };
  } catch {
    return {
      connected: false,
      chainId: 0,
      blockNumber: 0,
      memberCount: 0,
    };
  }
}
