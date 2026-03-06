import { useState, useEffect } from "react";
import {
  getSyndicateVotes,
  proposeVote,
  castVote,
  getSyndicateSettings,
} from "../services/api";

interface Vote {
  id: string;
  type: string;
  description: string;
  status: string;
  quorum_percent: number;
  expires_at: string;
  created_at: string;
  proposedBy: string;
  yes: number;
  no: number;
  abstain: number;
  totalVotes: number;
}

interface Props {
  syndicateId: string;
  refreshKey?: number;
  bare?: boolean;
}

const VOTE_TYPES = [
  "alliance",
  "treasury_withdraw",
  "disband",
  "project",
  "charter_amendment",
];

export default function GovernanceTab({
  syndicateId,
  refreshKey,
  bare: _bare,
}: Props) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [showPropose, setShowPropose] = useState(false);
  const [proposeType, setProposeType] = useState("alliance");
  const [proposeDesc, setProposeDesc] = useState("");
  const [proposeTarget, setProposeTarget] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [castedVotes, setCastedVotes] = useState<Record<string, string>>({});

  const fetchVotes = () => {
    getSyndicateVotes(syndicateId)
      .then(({ data }) => setVotes(data.votes || []))
      .catch(() => setVotes([]));
  };

  useEffect(() => {
    fetchVotes();
    getSyndicateSettings(syndicateId)
      .then(({ data }) => setSettings(data.settings))
      .catch(() => {});
  }, [syndicateId, refreshKey]);

  const handlePropose = async () => {
    if (!proposeDesc.trim()) return;
    setActionMsg("");
    try {
      const targetData: any = {};
      if (proposeType === "treasury_withdraw")
        targetData.amount = Number(proposeTarget) || 0;
      else if (proposeType === "alliance")
        targetData.targetSyndicate = proposeTarget;
      else if (proposeType === "charter_amendment")
        targetData.amendment = proposeTarget;

      await proposeVote(
        syndicateId,
        proposeType,
        proposeDesc.trim(),
        targetData,
      );
      setActionMsg("Vote proposed!");
      setProposeDesc("");
      setProposeTarget("");
      setShowPropose(false);
      fetchVotes();
    } catch (err: any) {
      setActionMsg(err.response?.data?.error || "Failed to propose vote");
    }
  };

  const handleCast = async (voteId: string, choice: string) => {
    try {
      const { data } = await castVote(syndicateId, voteId, choice);
      setCastedVotes((prev) => ({ ...prev, [voteId]: choice }));
      if (data.resolved) {
        setActionMsg(`Vote resolved: ${data.result}`);
      }
      fetchVotes();
    } catch (err: any) {
      setActionMsg(err.response?.data?.error || "Cast failed");
    }
  };

  const timeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m left`;
  };

  const typeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      alliance: "var(--cyan)",
      treasury_withdraw: "var(--yellow)",
      disband: "var(--red)",
      project: "var(--green)",
      charter_amendment: "var(--purple)",
    };
    return colors[type] || "#888";
  };

  const activeVotes = votes.filter((v) => v.status === "active");
  const recentVotes = votes.filter((v) => v.status !== "active").slice(0, 10);

  const content = (
    <>
      {actionMsg && (
        <div style={{ color: "var(--cyan)", marginBottom: 4 }}>{actionMsg}</div>
      )}

      <div
        className="panel-subheader"
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        <span>Active Votes ({activeVotes.length})</span>
        <button
          className="btn-sm btn-buy"
          onClick={() => setShowPropose(!showPropose)}
          style={{ fontSize: 9 }}
        >
          {showPropose ? "CANCEL" : "+ PROPOSE"}
        </button>
      </div>

      {showPropose && (
        <div
          className="vote-propose"
          style={{
            marginBottom: 8,
            padding: 6,
            border: "1px solid #333",
            background: "#111",
          }}
        >
          <div className="panel-row" style={{ gap: 4, marginBottom: 4 }}>
            <label style={{ fontSize: 10, color: "#888" }}>Type:</label>
            <select
              value={proposeType}
              onChange={(e) => setProposeType(e.target.value)}
              className="qty-input"
              style={{ width: "auto" }}
            >
              {VOTE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Description..."
            value={proposeDesc}
            onChange={(e) => setProposeDesc(e.target.value)}
            className="chat-input"
            style={{
              width: "100%",
              minHeight: 40,
              marginBottom: 4,
              resize: "vertical",
            }}
          />
          {proposeType === "treasury_withdraw" && (
            <input
              type="number"
              placeholder="Amount"
              value={proposeTarget}
              onChange={(e) => setProposeTarget(e.target.value)}
              className="qty-input"
              style={{ width: 80, marginBottom: 4 }}
            />
          )}
          {proposeType === "alliance" && (
            <input
              placeholder="Target syndicate name"
              value={proposeTarget}
              onChange={(e) => setProposeTarget(e.target.value)}
              className="chat-input"
              style={{ marginBottom: 4 }}
            />
          )}
          {proposeType === "charter_amendment" && (
            <textarea
              placeholder="Amendment text"
              value={proposeTarget}
              onChange={(e) => setProposeTarget(e.target.value)}
              className="chat-input"
              style={{ width: "100%", minHeight: 30, marginBottom: 4 }}
            />
          )}
          <button className="btn-sm btn-buy" onClick={handlePropose}>
            PROPOSE VOTE
          </button>
        </div>
      )}

      {activeVotes.length === 0 ? (
        <div className="text-muted">No active votes</div>
      ) : (
        activeVotes.map((v) => (
          <div key={v.id} className="vote-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  color: typeBadgeColor(v.type),
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                {v.type.replace(/_/g, " ")}
              </span>
              <span style={{ color: "#888", fontSize: 9 }}>
                {timeRemaining(v.expires_at)}
              </span>
            </div>
            <div style={{ fontSize: 11, marginBottom: 4 }}>{v.description}</div>
            <div style={{ fontSize: 9, color: "#666", marginBottom: 4 }}>
              by {v.proposedBy}
            </div>

            {/* Progress bar */}
            <div className="vote-progress">
              <div className="vote-progress__bar">
                {v.totalVotes > 0 && (
                  <>
                    <div
                      className="vote-bar-yes"
                      style={{ width: `${(v.yes / v.totalVotes) * 100}%` }}
                    />
                    <div
                      className="vote-bar-no"
                      style={{ width: `${(v.no / v.totalVotes) * 100}%` }}
                    />
                    <div
                      className="vote-bar-abstain"
                      style={{ width: `${(v.abstain / v.totalVotes) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div
                style={{ fontSize: 9, color: "#888", display: "flex", gap: 8 }}
              >
                <span style={{ color: "var(--green)" }}>Y:{v.yes}</span>
                <span style={{ color: "var(--red)" }}>N:{v.no}</span>
                <span>A:{v.abstain}</span>
                <span>
                  ({v.totalVotes} total, {v.quorum_percent}% quorum)
                </span>
              </div>
            </div>

            {/* Vote buttons */}
            {!castedVotes[v.id] && (
              <div
                className="vote-buttons"
                style={{ display: "flex", gap: 4, marginTop: 4 }}
              >
                <button
                  className="btn-sm"
                  style={{ background: "#030", color: "var(--green)" }}
                  onClick={() => handleCast(v.id, "yes")}
                >
                  YES
                </button>
                <button
                  className="btn-sm"
                  style={{ background: "#300", color: "var(--red)" }}
                  onClick={() => handleCast(v.id, "no")}
                >
                  NO
                </button>
                <button
                  className="btn-sm"
                  style={{ background: "#222", color: "#888" }}
                  onClick={() => handleCast(v.id, "abstain")}
                >
                  ABSTAIN
                </button>
              </div>
            )}
            {castedVotes[v.id] && (
              <div style={{ fontSize: 9, color: "var(--cyan)", marginTop: 4 }}>
                Voted: {castedVotes[v.id]}
              </div>
            )}
          </div>
        ))
      )}

      {recentVotes.length > 0 && (
        <>
          <div className="panel-subheader" style={{ marginTop: 8 }}>
            Recent Votes
          </div>
          {recentVotes.map((v) => (
            <div key={v.id} className="vote-card" style={{ opacity: 0.7 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span
                  style={{
                    color: typeBadgeColor(v.type),
                    fontSize: 10,
                    textTransform: "uppercase",
                  }}
                >
                  {v.type.replace(/_/g, " ")}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color:
                      v.status === "passed"
                        ? "var(--green)"
                        : v.status === "failed"
                          ? "var(--red)"
                          : "#888",
                    textTransform: "uppercase",
                  }}
                >
                  {v.status}
                </span>
              </div>
              <div style={{ fontSize: 11 }}>{v.description}</div>
              <div style={{ fontSize: 9, color: "#666" }}>
                Y:{v.yes} N:{v.no} A:{v.abstain}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Charter view */}
      {settings && (
        <>
          <div className="panel-subheader" style={{ marginTop: 8 }}>
            Charter
          </div>
          {settings.motto && (
            <div className="panel-row">
              <span className="panel-label">Motto:</span>{" "}
              <span style={{ fontStyle: "italic", color: "#aaa" }}>
                {settings.motto}
              </span>
            </div>
          )}
          {settings.description && (
            <div style={{ fontSize: 11, color: "#ccc", marginTop: 2 }}>
              {settings.description}
            </div>
          )}
          <div
            className="panel-row"
            style={{
              fontSize: 10,
              color: "#666",
              marginTop: 4,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>Recruitment: {settings.recruitment_mode}</span>
            <span>Min Level: {settings.min_level}</span>
            <span>Quorum: {settings.quorum_percent}%</span>
            <span>Vote Duration: {settings.vote_duration_hours}h</span>
            <span>
              Succession: {settings.succession_rule?.replace(/_/g, " ")}
            </span>
          </div>
        </>
      )}
    </>
  );

  return <div className="panel-content">{content}</div>;
}
