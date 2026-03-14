// Gasless Relay (Testnet Paymaster)
// For player-initiated actions (withdrawals, NFT transfers): player signs message,
// server relays the tx and pays gas from the deployer account.
// Full ERC-4337 (EntryPoint + Bundler + Paymaster contract) deferred to production chain.

import {
  type Address,
  type Hash,
  verifyMessage,
  encodeFunctionData,
  parseAbi,
} from "viem";
import { publicClient, walletClient } from "./client";
import { memberContractAbi } from "./abis";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RelayRequest {
  // The player's wallet address (must be the signer)
  playerWallet: Address;
  // The member contract to call
  memberContract: Address;
  // What the player wants to do
  action:
    | { type: "withdraw"; token: Address; amount: bigint }
    | { type: "withdrawNFT"; nftContract: Address; tokenId: bigint };
  // EIP-191 signature over the relay message
  signature: `0x${string}`;
  // Nonce to prevent replay (timestamp-based is fine for testnet)
  nonce: bigint;
}

// ---------------------------------------------------------------------------
// Message construction (must match what the client signs)
// ---------------------------------------------------------------------------

function buildRelayMessage(req: Omit<RelayRequest, "signature">): string {
  if (req.action.type === "withdraw") {
    return [
      "CosmicHorizon Relay",
      `Action: withdraw`,
      `Token: ${req.action.token}`,
      `Amount: ${req.action.amount.toString()}`,
      `MemberContract: ${req.memberContract}`,
      `Nonce: ${req.nonce.toString()}`,
    ].join("\n");
  } else {
    return [
      "CosmicHorizon Relay",
      `Action: withdrawNFT`,
      `NFTContract: ${req.action.nftContract}`,
      `TokenId: ${req.action.tokenId.toString()}`,
      `MemberContract: ${req.memberContract}`,
      `Nonce: ${req.nonce.toString()}`,
    ].join("\n");
  }
}

// ---------------------------------------------------------------------------
// Replay protection
// ---------------------------------------------------------------------------

const usedNonces = new Set<string>();

function nonceKey(wallet: Address, nonce: bigint): string {
  return `${wallet.toLowerCase()}:${nonce.toString()}`;
}

// ---------------------------------------------------------------------------
// Relay execution
// ---------------------------------------------------------------------------

const parsedMemberAbi = parseAbi(memberContractAbi);

/**
 * Verify player's signature and relay their transaction.
 * Server pays gas — player never needs ETH.
 */
export async function relayTransaction(
  req: RelayRequest,
): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
  // 1. Check nonce hasn't been used
  const nk = nonceKey(req.playerWallet, req.nonce);
  if (usedNonces.has(nk)) {
    return { success: false, error: "Nonce already used" };
  }

  // 2. Verify the signature matches the player's wallet
  const message = buildRelayMessage(req);
  const valid = await verifyMessage({
    address: req.playerWallet,
    message,
    signature: req.signature,
  });

  if (!valid) {
    return { success: false, error: "Invalid signature" };
  }

  // 3. Verify the player owns the member contract
  const owner = await publicClient.readContract({
    address: req.memberContract,
    abi: parsedMemberAbi,
    functionName: "player",
  });

  if ((owner as Address).toLowerCase() !== req.playerWallet.toLowerCase()) {
    return {
      success: false,
      error: "Player does not own this member contract",
    };
  }

  // 4. Mark nonce as used
  usedNonces.add(nk);

  // 5. Execute the withdrawal on behalf of the player
  // Note: The MemberContract requires msg.sender == player for withdrawals.
  // Since the server is not the player, we can't directly call withdraw().
  // On testnet with SNARK verifier == address(0), the server can use
  // a game-server-level operation to facilitate this.
  // For production, this would be a proper ERC-4337 UserOperation.
  try {
    let txHash: Hash;

    if (req.action.type === "withdraw") {
      // Server-facilitated withdrawal: debit from member contract, transfer tokens to player
      txHash = await walletClient.writeContract({
        address: req.memberContract,
        abi: parsedMemberAbi,
        functionName: "debitFungible",
        args: [req.action.token, req.action.amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Transfer the actual tokens to the player's wallet
      const tokenAbi = parseAbi([
        "function transfer(address to, uint256 amount) returns (bool)",
      ]);
      txHash = await walletClient.writeContract({
        address: req.action.token,
        abi: tokenAbi,
        functionName: "transfer",
        args: [req.playerWallet, req.action.amount],
      });
    } else {
      // NFT withdrawal — debit NFT from member, transfer to player
      txHash = await walletClient.writeContract({
        address: req.memberContract,
        abi: parsedMemberAbi,
        functionName: "debitNFT",
        args: [req.action.nftContract, req.action.tokenId],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const nftAbi = parseAbi([
        "function transferFrom(address from, address to, uint256 tokenId)",
      ]);
      txHash = await walletClient.writeContract({
        address: req.action.nftContract,
        abi: nftAbi,
        functionName: "transferFrom",
        args: [req.memberContract, req.playerWallet, req.action.tokenId],
      });
    }

    return { success: true, txHash };
  } catch (err) {
    // Remove nonce on failure so player can retry
    usedNonces.delete(nk);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
