import { useState, useEffect } from "react";
import {
  getIncomingTrades,
  getOutgoingTrades,
  acceptTrade,
  rejectTrade,
  cancelTrade,
} from "../services/api";

interface TradeOffer {
  id: string;
  tradeType: "resource" | "planet";
  fromName?: string;
  toName?: string;
  planetName?: string;
  resourceType?: string;
  quantity?: number;
  price?: number;
  status: string;
  createdAt: string;
}

interface Props {
  refreshKey?: number;
  onAction?: () => void;
  bare?: boolean;
}

export default function TradeOffersPanel({
  refreshKey,
  onAction,
  bare,
}: Props) {
  const [incoming, setIncoming] = useState<TradeOffer[]>([]);
  const [outgoing, setOutgoing] = useState<TradeOffer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");

  const refresh = () => {
    getIncomingTrades()
      .then(({ data }) => setIncoming(data.offers || data || []))
      .catch(() => setIncoming([]));
    getOutgoingTrades()
      .then(({ data }) => setOutgoing(data.offers || data || []))
      .catch(() => setOutgoing([]));
  };

  useEffect(() => {
    refresh();
  }, [refreshKey]);

  const handleAccept = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      await acceptTrade(id);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept trade");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      await rejectTrade(id);
      refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reject trade");
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      await cancelTrade(id);
      refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to cancel trade");
    } finally {
      setBusy(null);
    }
  };

  const formatOffer = (o: TradeOffer) => {
    if (o.tradeType === "planet") {
      return `Planet: ${o.planetName || "Unknown"}${o.price ? ` for ${o.price.toLocaleString()} cr` : " (free)"}`;
    }
    return `${o.quantity ?? 0}x ${o.resourceType || "resource"}${o.price ? ` for ${o.price.toLocaleString()} cr` : " (free)"}`;
  };

  const totalIncoming = incoming.length;
  const totalOutgoing = outgoing.length;

  const content = (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "var(--cyan)",
          marginBottom: 6,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 4,
        }}
      >
        TRADE OFFERS
      </div>
      <div className="group-panel-tabs" style={{ marginBottom: 6 }}>
        <span
          onClick={() => setTab("incoming")}
          style={{
            cursor: "pointer",
            color: tab === "incoming" ? "#0f0" : "#666",
          }}
        >
          {tab === "incoming" ? "[Incoming]" : "Incoming"}
          {totalIncoming > 0 && (
            <span style={{ color: "var(--orange)", marginLeft: 4 }}>
              ({totalIncoming})
            </span>
          )}
        </span>
        <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
        <span
          onClick={() => setTab("outgoing")}
          style={{
            cursor: "pointer",
            color: tab === "outgoing" ? "#0f0" : "#666",
          }}
        >
          {tab === "outgoing" ? "[Outgoing]" : "Outgoing"}
          {totalOutgoing > 0 && (
            <span style={{ color: "var(--text-secondary)", marginLeft: 4 }}>
              ({totalOutgoing})
            </span>
          )}
        </span>
      </div>

      {error && <div className="mall-error">{error}</div>}

      {tab === "incoming" && (
        <>
          {incoming.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 11 }}>
              No incoming trade offers.
            </div>
          ) : (
            incoming.map((o) => (
              <div
                key={o.id}
                style={{
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 11,
                }}
              >
                <div>
                  <span style={{ color: "var(--cyan)" }}>
                    From: {o.fromName || "Unknown"}
                  </span>
                </div>
                <div style={{ color: "var(--text-primary)", margin: "2px 0" }}>
                  {formatOffer(o)}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  <button
                    className="btn-sm btn-buy"
                    disabled={busy === o.id}
                    onClick={() => handleAccept(o.id)}
                  >
                    {busy === o.id ? "..." : "ACCEPT"}
                  </button>
                  <button
                    className="btn-sm btn-sell"
                    disabled={busy === o.id}
                    onClick={() => handleReject(o.id)}
                  >
                    {busy === o.id ? "..." : "REJECT"}
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "outgoing" && (
        <>
          {outgoing.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 11 }}>
              No outgoing trade offers.
            </div>
          ) : (
            outgoing.map((o) => (
              <div
                key={o.id}
                style={{
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 11,
                }}
              >
                <div>
                  <span style={{ color: "var(--cyan)" }}>
                    To: {o.toName || "Unknown"}
                  </span>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      marginLeft: 8,
                      fontSize: 10,
                    }}
                  >
                    {o.status}
                  </span>
                </div>
                <div style={{ color: "var(--text-primary)", margin: "2px 0" }}>
                  {formatOffer(o)}
                </div>
                {o.status === "pending" && (
                  <button
                    className="btn-sm"
                    disabled={busy === o.id}
                    onClick={() => handleCancel(o.id)}
                    style={{
                      marginTop: 4,
                      color: "var(--orange)",
                      borderColor: "var(--orange)",
                    }}
                  >
                    {busy === o.id ? "..." : "CANCEL"}
                  </button>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );

  if (bare) return content;
  return <div className="panel-content">{content}</div>;
}
