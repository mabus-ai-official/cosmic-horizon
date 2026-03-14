// Deployed contract addresses from anvil local testnet
// Chain ID 31337, deployed via forge script Deploy.s.sol
//
// To redeploy: forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
// Then update these addresses from the deploy output.

export const chainConfig = {
  rpcUrl: process.env.CHAIN_RPC_URL || "http://192.168.6.56:8545",
  chainId: Number(process.env.CHAIN_ID || "31337"),
  // Anvil account 0 — game server deployer/operator
  gameServerPrivateKey: (process.env.GAME_SERVER_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as `0x${string}`,
};

export const contractAddresses = {
  // ERC-20 fungible tokens
  credits: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`,
  cyrillium: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as `0x${string}`,
  food: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as `0x${string}`,
  tech: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9" as `0x${string}`,
  driftFuel: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" as `0x${string}`,

  // ERC-721 NFTs
  shipNft: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707" as `0x${string}`,
  equipmentNft: "0x0165878A594ca255338adfa4d48449f69242Eb8F" as `0x${string}`,
  characterNft: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853" as `0x${string}`,

  // Factory + per-player clones
  memberFactory: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6" as `0x${string}`,

  // Syndicate DAO factory
  syndicateFactory:
    "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318" as `0x${string}`,
} as const;

// Map game resource names (as used in DB/game logic) to token contract addresses
export const resourceToToken: Record<string, `0x${string}`> = {
  credits: contractAddresses.credits,
  cyrillium: contractAddresses.cyrillium,
  food: contractAddresses.food,
  tech: contractAddresses.tech,
  drift_fuel: contractAddresses.driftFuel,
};
