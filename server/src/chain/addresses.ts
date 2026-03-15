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
  credits: "0x95401dc811bb5740090279Ba06cfA8fcF6113778" as `0x${string}`,
  cyrillium: "0x998abeb3E57409262aE5b751f60747921B33613E" as `0x${string}`,
  food: "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49" as `0x${string}`,
  tech: "0x4826533B4897376654Bb4d4AD88B7faFD0C98528" as `0x${string}`,
  driftFuel: "0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf" as `0x${string}`,

  // ERC-721 NFTs
  shipNft: "0x0E801D84Fa97b50751Dbf25036d067dCf18858bF" as `0x${string}`,
  equipmentNft: "0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf" as `0x${string}`,
  characterNft: "0x9d4454B023096f34B160D6B654540c56A1F81688" as `0x${string}`,
  planetNft: "0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00" as `0x${string}`,

  // Factory + per-player clones
  memberFactory: "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570" as `0x${string}`,

  // Syndicate DAO factory
  syndicateFactory:
    "0x809d550fca64d94Bd9F66E60752A544199cfAC3D" as `0x${string}`,
} as const;

// Map game resource names (as used in DB/game logic) to token contract addresses
export const resourceToToken: Record<string, `0x${string}`> = {
  credits: contractAddresses.credits,
  cyrillium: contractAddresses.cyrillium,
  food: contractAddresses.food,
  tech: contractAddresses.tech,
  drift_fuel: contractAddresses.driftFuel,
};
