// Game chain contract addresses and minimal ABIs for client-side interactions
// These mirror server/src/chain/addresses.ts — keep in sync when redeploying

export const GAME_CHAIN_ID = 31337;

export const CONTRACT_ADDRESSES = {
  credits: "0x95401dc811bb5740090279Ba06cfA8fcF6113778",
  cyrillium: "0x998abeb3E57409262aE5b751f60747921B33613E",
  food: "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49",
  tech: "0x4826533B4897376654Bb4d4AD88B7faFD0C98528",
  driftFuel: "0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf",
  memberFactory: "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
} as const;

// Map game resource names to their token contract addresses
export const RESOURCE_TO_TOKEN: Record<string, string> = {
  credits: CONTRACT_ADDRESSES.credits,
  cyrillium: CONTRACT_ADDRESSES.cyrillium,
  food: CONTRACT_ADDRESSES.food,
  tech: CONTRACT_ADDRESSES.tech,
  drift_fuel: CONTRACT_ADDRESSES.driftFuel,
};

// Token display names matching server TOKEN_DISPLAY
export const TOKEN_DISPLAY: Record<
  string,
  { symbol: string; name: string; color: string }
> = {
  credits: { symbol: "CRED", name: "Credits", color: "var(--cyan)" },
  cyrillium: { symbol: "CYR", name: "Cyrillium", color: "var(--purple)" },
  food: { symbol: "FOOD", name: "Food", color: "var(--green)" },
  tech: { symbol: "TECH", name: "Tech", color: "var(--blue)" },
  drift_fuel: { symbol: "DFUEL", name: "Drift Fuel", color: "var(--orange)" },
};

// Minimal ABIs for client-side contract calls
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const MEMBER_CONTRACT_DEPOSIT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
