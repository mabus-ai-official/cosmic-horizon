// Wallet Provider abstraction — currently uses Privy, swappable to Dynamic/Turnkey
// For testnet: generates a deterministic wallet from player ID (no external provider needed)
// For production: delegates to Privy server SDK for embedded wallet creation

import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toBytes, type Address } from "viem";

export interface WalletResult {
  wallet: Address | null;
  providerUserId: string | null;
}

// ---------------------------------------------------------------------------
// Testnet mode — deterministic wallets from player ID (no Privy needed)
// ---------------------------------------------------------------------------

function deriveTestnetWallet(playerId: string): Address {
  // Generate a deterministic private key from the player ID
  // This is NOT secure for production — only for anvil testnet
  const privateKey = keccak256(toBytes(`cosmic-horizon-testnet:${playerId}`));
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return account.address;
}

// ---------------------------------------------------------------------------
// Privy mode — production embedded wallets
// Uncomment and configure when @privy-io/server-auth is installed
// ---------------------------------------------------------------------------

/*
import { PrivyClient } from "@privy-io/server-auth";

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

async function createPrivyWallet(
  playerId: string,
  email: string,
): Promise<WalletResult> {
  const user = await privy.createUser({
    createEthereumWallet: true,
    linkedAccounts: [{ type: "email", address: email }],
  });

  const embeddedWallet = user.linkedAccounts.find(
    (a: any) => a.type === "wallet" && a.walletClientType === "privy",
  );

  return {
    wallet: embeddedWallet
      ? (embeddedWallet.address as Address)
      : null,
    providerUserId: user.id,
  };
}

async function verifyPrivyToken(token: string): Promise<{
  userId: string;
  wallet: Address | null;
} | null> {
  try {
    const claims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(claims.userId);
    const embeddedWallet = user.linkedAccounts.find(
      (a: any) => a.type === "wallet" && a.walletClientType === "privy",
    );
    return {
      userId: user.id,
      wallet: embeddedWallet
        ? (embeddedWallet.address as Address)
        : null,
    };
  } catch {
    return null;
  }
}
*/

// ---------------------------------------------------------------------------
// Public API — switch implementation based on environment
// ---------------------------------------------------------------------------

const USE_PRIVY = process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET;

/**
 * Create an embedded wallet for a new player.
 * Testnet: deterministic derivation from player ID.
 * Production: Privy embedded wallet.
 */
export async function createPlayerWallet(
  playerId: string,
  _email: string,
): Promise<WalletResult> {
  if (USE_PRIVY) {
    // return createPrivyWallet(playerId, email);
    // For now, fall through to testnet mode until Privy is configured
  }

  // Testnet mode — deterministic wallet
  return {
    wallet: deriveTestnetWallet(playerId),
    providerUserId: null,
  };
}

/**
 * Verify a Privy auth token and return the associated wallet.
 * Returns null if invalid or Privy not configured.
 */
export async function verifyWalletToken(
  _token: string,
): Promise<{ userId: string; wallet: Address | null } | null> {
  if (USE_PRIVY) {
    // return verifyPrivyToken(token);
  }
  return null;
}
