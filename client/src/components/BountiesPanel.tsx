import { useState, useEffect, useCallback } from "react";
import { getBounties, getBountiesOnMe, placeBounty } from "../services/api";
import type { ToastType } from "../hooks/useToast";

interface Bounty {
  id: string;
  amount: number;
  targetUsername: string;
  targetId: string;
  placedByUsername: string;
  created_at: string;
}

interface BountyOnMe {
  id: string;
  amount: number;
  placedByUsername: string;
  placedAt: string;
}

interface Props {
  refreshKey?: number;
  bare?: boolean;
  credits?: number;
  onAction?: () => void;
  showToast?: (msg: string, type?: ToastType, duration?: number) => number;
  readOnly?: boolean;
}

export default function BountiesPanel({
  refreshKey,
  credits = 0,
  onAction,
  showToast,
  readOnly,
}: Props) {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [bountiesOnMe, setBountiesOnMe] = useState<BountyOnMe[]>([]);
  const [totalBounty, setTotalBounty] = useState(0);
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [targetName, setTargetName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    getBounties()
      .then(({ data }) => setBounties(data.bounties || []))
      .catch(() => setBounties([]));

    getBountiesOnMe()
      .then(({ data }) => {
        setBountiesOnMe(data.bounties || []);
        setTotalBounty(data.totalBounty || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refreshKey, refresh]);

  const handlePlace = async () => {
    const amt = parseInt(amount, 10);
    if (!targetName.trim()) {
      setError("Enter a player name");
      return;
    }
    if (!amt || amt < 100) {
      setError("Minimum bounty: 100 cr");
      return;
    }
    if (amt > credits) {
      setError("Not enough credits");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await placeBounty(targetName.trim(), amt);
      showToast?.(
        `Bounty placed: ${amt.toLocaleString()} cr on ${targetName.trim()}`,
        "warning",
        4000,
      );
      setTargetName("");
      setAmount("");
      setShowPlaceForm(false);
      onAction?.();
      refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to place bounty");
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <>
      {totalBounty > 0 && (
        <div
          style={{
            color: "var(--red)",
            fontSize: 12,
            marginBottom: 8,
            padding: "6px 8px",
            border: "1px solid var(--red)",
            borderRadius: 4,
            background: "rgba(239, 68, 68, 0.08)",
          }}
        >
          WANTED — Bounties on you: {totalBounty.toLocaleString()} cr
        </div>
      )}

      {bountiesOnMe.length > 0 && (
        <>
          <div className="panel-subheader text-warning">Bounties on Me</div>
          {bountiesOnMe.map((b) => (
            <div
              key={b.id}
              className="panel-row"
              style={{ justifyContent: "space-between", fontSize: 12 }}
            >
              <span>{b.placedByUsername}</span>
              <span style={{ color: "var(--red)" }}>
                {Number(b.amount).toLocaleString()} cr
              </span>
            </div>
          ))}
        </>
      )}

      {/* Place Bounty */}
      {!readOnly && (
        <div style={{ margin: "8px 0" }}>
          {!showPlaceForm ? (
            <button
              className="btn-sm"
              style={{
                width: "100%",
                borderColor: "var(--orange)",
                color: "var(--orange)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
              }}
              onClick={() => setShowPlaceForm(true)}
            >
              PLACE BOUNTY
            </button>
          ) : (
            <div
              style={{
                border: "1px solid var(--orange)",
                borderRadius: 4,
                padding: 8,
                background: "rgba(240, 136, 62, 0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--orange)",
                  letterSpacing: 1,
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                PLACE A BOUNTY
              </div>
              <input
                type="text"
                placeholder="Player name"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                style={{
                  width: "100%",
                  marginBottom: 4,
                  fontSize: 12,
                  padding: "4px 6px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  borderRadius: 3,
                }}
              />
              <input
                type="number"
                placeholder="Amount (min 100)"
                min={100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: "100%",
                  marginBottom: 6,
                  fontSize: 12,
                  padding: "4px 6px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  borderRadius: 3,
                }}
              />
              {error && (
                <div
                  style={{ fontSize: 11, color: "var(--red)", marginBottom: 4 }}
                >
                  {error}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn-sm btn-buy"
                  style={{ flex: 1, fontSize: 12 }}
                  disabled={busy}
                  onClick={handlePlace}
                >
                  {busy ? "..." : "CONFIRM"}
                </button>
                <button
                  className="btn-sm"
                  style={{ fontSize: 12 }}
                  onClick={() => {
                    setShowPlaceForm(false);
                    setError("");
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="panel-subheader">Active Bounties</div>
      {bounties.length === 0 ? (
        <div className="text-muted" style={{ fontSize: 12 }}>
          No active bounties.
        </div>
      ) : (
        bounties.map((b) => (
          <div
            key={b.id}
            className="panel-row"
            style={{ justifyContent: "space-between", fontSize: 12 }}
          >
            <span>
              <span style={{ color: "var(--orange)" }}>{b.targetUsername}</span>
              <span className="text-muted"> by {b.placedByUsername}</span>
            </span>
            <span style={{ color: "var(--yellow)" }}>
              {Number(b.amount).toLocaleString()} cr
            </span>
          </div>
        ))
      )}
    </>
  );

  return <div className="panel-content">{content}</div>;
}
