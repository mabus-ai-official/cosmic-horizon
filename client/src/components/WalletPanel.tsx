import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import {
  getWalletNonce,
  verifyWallet,
  disconnectWallet,
  getWalletStatus,
  getWalletTokens,
  getWalletNfts,
  getWalletHoldings,
  withdrawTokens,
  withdrawNft,
} from "../services/api";

// ---- shared types ----

interface TokenBalance {
  resource: string;
  symbol: string;
  name: string;
  balance: string;
}

interface ShipNft {
  id: string;
  tokenId: number;
  name: string | null;
  typeName: string;
  typeId: string;
}

interface CharacterNft {
  tokenId: number;
  race: string;
  level: number;
}

interface PlanetNft {
  id: string;
  tokenId: number;
  name: string;
  planetClass: string;
  sectorId: number;
}

interface EquipmentItem {
  id: string;
  name: string;
  slot: string;
  shipName: string | null;
}

const TOKEN_COLORS: Record<string, string> = {
  CRED: "var(--cyan)",
  CYR: "var(--purple)",
  FOOD: "var(--green)",
  TECH: "var(--blue)",
  DFUEL: "var(--orange)",
};

// ---- main component ----

interface WalletPanelProps {
  inline?: boolean;
  bare?: boolean;
  onConnected?: (address: string) => void;
  onSkipped?: () => void;
}

export default function WalletPanel({
  inline,
  bare,
  onConnected,
  onSkipped,
}: WalletPanelProps) {
  const [activeTab, setActiveTab] = useState<"ingame" | "wallet">("ingame");

  // If inline (onboarding), just show the wallet connect flow
  if (inline) {
    return (
      <div className="wallet-step">
        <h3 className="wallet-step__title">LINK ETHEREUM WALLET</h3>
        <p className="wallet-step__subtitle">
          Optional — connect a wallet to view your ETH balance
        </p>
        <WalletConnectSection onConnected={onConnected} />
        <div className="wallet-skip">
          <button className="btn btn-secondary btn-sm" onClick={onSkipped}>
            SKIP FOR NOW
          </button>
        </div>
      </div>
    );
  }

  const content = (
    <div className="wallet-panel">
      <div className="wallet-tabs">
        <button
          className={`wallet-tabs__btn${activeTab === "ingame" ? " wallet-tabs__btn--active" : ""}`}
          onClick={() => setActiveTab("ingame")}
        >
          In-Game
        </button>
        <button
          className={`wallet-tabs__btn${activeTab === "wallet" ? " wallet-tabs__btn--active" : ""}`}
          onClick={() => setActiveTab("wallet")}
        >
          Wallet
        </button>
      </div>

      {activeTab === "ingame" ? (
        <InGameTab />
      ) : (
        <WalletTab onConnected={onConnected} />
      )}
    </div>
  );

  if (bare) return <div className="panel-content">{content}</div>;

  return content;
}

// ---- In-Game Tab ----

function InGameTab() {
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [ships, setShips] = useState<ShipNft[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [character, setCharacter] = useState<CharacterNft | null>(null);
  const [planets, setPlanets] = useState<PlanetNft[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [withdrawAmt, setWithdrawAmt] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    Promise.all([
      getWalletTokens().then(({ data }) => setTokens(data.tokens || [])),
      getWalletNfts().then(({ data }) => {
        setShips(data.ships || []);
        setEquipment(data.equipment || []);
        setCharacter(data.character || null);
        setPlanets(data.planets || []);
      }),
      getWalletStatus().then(({ data }) => setHasWallet(!!data.walletAddress)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleWithdraw = async (resource: string) => {
    const amt = parseFloat(withdrawAmt[resource] || "0");
    if (!amt || amt <= 0) return;
    setMsg("");
    setWithdrawing(resource);
    try {
      const { data } = await withdrawTokens(resource, amt);
      setMsg(data.message);
      // Refresh balances
      const { data: updated } = await getWalletTokens();
      setTokens(updated.tokens || []);
      setWithdrawAmt((p) => ({ ...p, [resource]: "" }));
    } catch (err: any) {
      setMsg(err.response?.data?.error || "Withdrawal failed");
    } finally {
      setWithdrawing(null);
    }
  };

  const handleWithdrawNft = async (nftType: string, tokenId: number) => {
    setMsg("");
    setWithdrawing(`${nftType}:${tokenId}`);
    try {
      const { data } = await withdrawNft(nftType, tokenId);
      setMsg(data.message);
    } catch (err: any) {
      setMsg(err.response?.data?.error || "NFT withdrawal failed");
    } finally {
      setWithdrawing(null);
    }
  };

  if (loading) {
    return <div className="wallet-loading">Loading assets...</div>;
  }

  return (
    <div className="wallet-tab-content">
      {msg && <div className="wallet-msg">{msg}</div>}

      {/* ERC-20 Tokens */}
      <div className="wallet-section">
        <div className="wallet-section__header">TOKENS</div>
        {tokens.length === 0 ? (
          <div className="wallet-empty">No token balances</div>
        ) : (
          <div className="wallet-tokens__grid">
            {tokens.map((t) => (
              <div key={t.resource} className="wallet-tokens__row">
                <span
                  className="wallet-tokens__symbol"
                  style={{
                    color: TOKEN_COLORS[t.symbol] || "var(--text-primary)",
                  }}
                >
                  {t.symbol}
                </span>
                <span className="wallet-tokens__name">{t.name}</span>
                <span className="wallet-tokens__balance">{t.balance}</span>
                {hasWallet && parseFloat(t.balance) > 0 && (
                  <div className="wallet-withdraw-inline">
                    <input
                      type="number"
                      className="wallet-withdraw-input"
                      placeholder="Amt"
                      value={withdrawAmt[t.resource] || ""}
                      onChange={(e) =>
                        setWithdrawAmt((p) => ({
                          ...p,
                          [t.resource]: e.target.value,
                        }))
                      }
                      min="0"
                      max={t.balance}
                      step="0.01"
                    />
                    <button
                      className="btn btn-sm wallet-withdraw-btn"
                      onClick={() => handleWithdraw(t.resource)}
                      disabled={
                        withdrawing === t.resource ||
                        !withdrawAmt[t.resource] ||
                        parseFloat(withdrawAmt[t.resource]) <= 0
                      }
                    >
                      {withdrawing === t.resource ? "..." : "WITHDRAW"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NFTs */}
      {ships.length > 0 && (
        <div className="wallet-section">
          <div className="wallet-section__header">SHIPS</div>
          <div className="wallet-nft-grid">
            {ships.map((s) => (
              <div key={s.id} className="wallet-nft-card">
                <div className="wallet-nft-card__title">
                  {s.name || s.typeName}
                </div>
                <div className="wallet-nft-card__sub">{s.typeName}</div>
                <div className="wallet-nft-card__id">#{s.tokenId}</div>
                {hasWallet && (
                  <button
                    className="btn btn-sm wallet-withdraw-btn"
                    onClick={() => handleWithdrawNft("ship", s.tokenId)}
                    disabled={withdrawing === `ship:${s.tokenId}`}
                  >
                    {withdrawing === `ship:${s.tokenId}` ? "..." : "WITHDRAW"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {character && (
        <div className="wallet-section">
          <div className="wallet-section__header">CHARACTER</div>
          <div className="wallet-nft-grid">
            <div className="wallet-nft-card">
              <div className="wallet-nft-card__title">
                {character.race?.charAt(0).toUpperCase()}
                {character.race?.slice(1)}
              </div>
              <div className="wallet-nft-card__sub">
                Level {character.level}
              </div>
              <div className="wallet-nft-card__id">#{character.tokenId}</div>
              {hasWallet && (
                <button
                  className="btn btn-sm wallet-withdraw-btn"
                  onClick={() =>
                    handleWithdrawNft("character", character.tokenId)
                  }
                  disabled={withdrawing === `character:${character.tokenId}`}
                >
                  {withdrawing === `character:${character.tokenId}`
                    ? "..."
                    : "WITHDRAW"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {planets.length > 0 && (
        <div className="wallet-section">
          <div className="wallet-section__header">PLANETS</div>
          <div className="wallet-nft-grid">
            {planets.map((p) => (
              <div key={p.id} className="wallet-nft-card">
                <div className="wallet-nft-card__title">{p.name}</div>
                <div className="wallet-nft-card__sub">
                  Class {p.planetClass} — Sector {p.sectorId}
                </div>
                <div className="wallet-nft-card__id">#{p.tokenId}</div>
                {hasWallet && (
                  <button
                    className="btn btn-sm wallet-withdraw-btn"
                    onClick={() => handleWithdrawNft("planet", p.tokenId)}
                    disabled={withdrawing === `planet:${p.tokenId}`}
                  >
                    {withdrawing === `planet:${p.tokenId}` ? "..." : "WITHDRAW"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {equipment.length > 0 && (
        <div className="wallet-section">
          <div className="wallet-section__header">EQUIPMENT</div>
          <div className="wallet-nft-grid">
            {equipment.map((eq) => (
              <div key={eq.id} className="wallet-nft-card">
                <div className="wallet-nft-card__title">{eq.name}</div>
                <div className="wallet-nft-card__sub">
                  {eq.slot} {eq.shipName ? `— on ${eq.shipName}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasWallet && (
        <div className="wallet-hint">
          Link a wallet in the Wallet tab to enable withdrawals.
        </div>
      )}
    </div>
  );
}

// ---- Wallet Tab ----

function WalletTab({
  onConnected,
}: {
  onConnected?: (address: string) => void;
}) {
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWalletStatus()
      .then(({ data }) => {
        if (data.walletAddress) setLinkedAddress(data.walletAddress);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!linkedAddress) return;
    getWalletHoldings()
      .then(({ data }) => {
        setEthBalance(data.ethBalance);
        setHoldings(data.tokens || []);
      })
      .catch(() => {});
  }, [linkedAddress]);

  if (loading) {
    return <div className="wallet-loading">Loading...</div>;
  }

  return (
    <div className="wallet-tab-content">
      {linkedAddress ? (
        <>
          <div className="wallet-section">
            <div className="wallet-section__header">LINKED WALLET</div>
            <div className="wallet-address">
              <span className="wallet-address__label">ADDRESS</span>
              <span className="wallet-address__value">
                {linkedAddress.slice(0, 6)}...{linkedAddress.slice(-4)}
              </span>
            </div>
            {ethBalance != null && (
              <div className="wallet-balance">
                <span className="wallet-balance__label">ETH BALANCE</span>
                <span className="wallet-balance__value">
                  {parseFloat(ethBalance).toFixed(4)} ETH
                </span>
              </div>
            )}
          </div>

          {holdings.length > 0 && (
            <div className="wallet-section">
              <div className="wallet-section__header">WITHDRAWN TOKENS</div>
              <div className="wallet-tokens__grid">
                {holdings.map((t) => (
                  <div key={t.resource} className="wallet-tokens__row">
                    <span
                      className="wallet-tokens__symbol"
                      style={{
                        color: TOKEN_COLORS[t.symbol] || "var(--text-primary)",
                      }}
                    >
                      {t.symbol}
                    </span>
                    <span className="wallet-tokens__name">{t.name}</span>
                    <span className="wallet-tokens__balance">{t.balance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DisconnectButton
            onDisconnected={() => {
              setLinkedAddress(null);
              setEthBalance(null);
              setHoldings([]);
            }}
          />
        </>
      ) : (
        <WalletConnectSection
          onConnected={(addr) => {
            setLinkedAddress(addr);
            onConnected?.(addr);
          }}
        />
      )}
    </div>
  );
}

// ---- Wallet Connect / Disconnect ----

function WalletConnectSection({
  onConnected,
}: {
  onConnected?: (address: string) => void;
}) {
  const { address, isConnected } = useAccount();
  const { connectors: allConnectors, connect } = useConnect();
  const connectors = allConnectors.filter(
    (c) => c.name === "MetaMask" || c.name === "WalletConnect",
  );
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!address) return;
    setError("");
    setVerifying(true);
    try {
      await switchChainAsync({ chainId: mainnet.id });
      const { data: nonceData } = await getWalletNonce();
      const domain = window.location.host;
      const origin = window.location.origin;
      const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        address,
        "",
        "Link your wallet to Cosmic Horizon.",
        "",
        `URI: ${origin}`,
        "Version: 1",
        `Chain ID: 1`,
        `Nonce: ${nonceData.nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join("\n");
      const signature = await signMessageAsync({ message });
      const { data } = await verifyWallet(message, signature);
      onConnected?.(data.walletAddress);
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("User rejected")) {
        setError("Signature rejected");
      } else if (err?.response?.status === 409) {
        setError("Wallet already linked to another account");
      } else {
        setError(err?.response?.data?.error || "Verification failed");
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="wallet-connect-section">
      {error && <div className="wallet-error">{error}</div>}
      {isConnected && address ? (
        <div className="wallet-verify">
          <div className="wallet-address">
            <span className="wallet-address__label">CONNECTED</span>
            <span className="wallet-address__value">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleVerify}
            disabled={verifying}
          >
            {verifying ? "VERIFYING..." : "VERIFY & LINK"}
          </button>
        </div>
      ) : (
        <div className="wallet-connect">
          <p
            className="text-muted"
            style={{ fontSize: "11px", marginBottom: "8px" }}
          >
            Link an Ethereum wallet to enable withdrawals and view external
            balances.
          </p>
          <div className="wallet-connectors">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                className="btn btn-sm wallet-connector-btn"
                onClick={() => {
                  setError("");
                  connect(
                    { connector, chainId: mainnet.id },
                    {
                      onError: (err) =>
                        setError(err.message || "Connection failed"),
                    },
                  );
                }}
              >
                {connector.name.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DisconnectButton({ onDisconnected }: { onDisconnected: () => void }) {
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const [error, setError] = useState("");

  return (
    <div style={{ marginTop: 8 }}>
      {error && <div className="wallet-error">{error}</div>}
      <button
        className="btn btn-sm wallet-disconnect"
        onClick={async () => {
          try {
            await disconnectWallet();
            wagmiDisconnect();
            onDisconnected();
          } catch {
            setError("Failed to disconnect");
          }
        }}
      >
        DISCONNECT WALLET
      </button>
    </div>
  );
}
