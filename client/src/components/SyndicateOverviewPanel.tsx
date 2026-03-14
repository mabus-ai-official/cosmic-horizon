import { useState, useEffect, useRef } from "react";
import {
  getSyndicate,
  getAlliances,
  createSyndicate,
  browseSyndicates,
  joinSyndicate,
  joinSyndicateByCode,
  depositToTreasury,
  withdrawFromTreasury,
  leaveSyndicate,
} from "../services/api";

interface Member {
  id: string;
  username: string;
  role: string;
  level?: number;
  role_id?: string | null;
}

interface PersonalAlly {
  id: string;
  allyId: string;
  allyName: string;
  formedAt: string;
}

interface SyndicateAlly {
  id: string;
  allySyndicateId: string;
  allySyndicateName: string;
  formedAt: string;
}

interface BrowseResult {
  id: string;
  name: string;
  treasury: number;
  recruitment_mode: string;
  min_level: number;
  motto: string | null;
  member_count: number;
}

interface Props {
  refreshKey?: number;
  onCommand: (cmd: string) => void;
  bare?: boolean;
  onRefresh?: () => void;
}

export default function SyndicateOverviewPanel({
  refreshKey,
  onCommand: _onCommand,
  bare: _bare,
  onRefresh,
}: Props) {
  const [syndicate, setSyndicate] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [personalAllies, setPersonalAllies] = useState<PersonalAlly[]>([]);
  const [syndicateAllies, setSyndicateAllies] = useState<SyndicateAlly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [createName, setCreateName] = useState("");
  const [createMotto, setCreateMotto] = useState("");
  const [createMode, setCreateMode] = useState("closed");
  const [createMinLevel, setCreateMinLevel] = useState(1);
  const [createQuorum, setCreateQuorum] = useState(60);
  const [createVoteDuration, setCreateVoteDuration] = useState(48);
  const [creating, setCreating] = useState(false);

  // Browse
  const [browseResults, setBrowseResults] = useState<BrowseResult[]>([]);
  const [browseSearch, setBrowseSearch] = useState("");
  const [browseMode, setBrowseMode] = useState("all");
  const [browsing, setBrowsing] = useState(false);

  // Join by code
  const [inviteCode, setInviteCode] = useState("");

  // Treasury
  const [depositAmt, setDepositAmt] = useState(100);
  const [withdrawAmt, setWithdrawAmt] = useState(100);

  const [actionMsg, setActionMsg] = useState("");

  // Track whether we know we're in a syndicate (to prevent race conditions resetting state)
  const knownInSyndicate = useRef(false);

  const fetchData = (isInitial = false) => {
    if (isInitial) setLoading(true);
    getSyndicate()
      .then(({ data }) => {
        setSyndicate(data);
        setMembers(data.members || []);
        knownInSyndicate.current = true;
        setLoading(false);
      })
      .catch(() => {
        // Only reset to null if we don't already know we're in a syndicate
        if (!knownInSyndicate.current) {
          setSyndicate(null);
        }
        setLoading(false);
      });

    getAlliances()
      .then(({ data }) => {
        setPersonalAllies(data.personalAllies || []);
        setSyndicateAllies(data.syndicateAllies || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchData(true);
  }, [refreshKey]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const { data } = await createSyndicate({
        name: createName.trim(),
        motto: createMotto.trim() || undefined,
        recruitment_mode: createMode,
        min_level: createMinLevel,
        quorum_percent: createQuorum,
        vote_duration_hours: createVoteDuration,
      });
      // Mark that we're in a syndicate and set state immediately
      knownInSyndicate.current = true;
      setSyndicate({
        id: data.syndicateId,
        name: data.name,
        treasury: 0,
        members: [],
        settings: null,
      });
      setMembers([]);
      onRefresh?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create syndicate");
    }
    setCreating(false);
  };

  const handleBrowse = async () => {
    setBrowsing(true);
    try {
      const { data } = await browseSyndicates({
        search: browseSearch || undefined,
        recruitment_mode: browseMode !== "all" ? browseMode : undefined,
      });
      setBrowseResults(data.syndicates || []);
    } catch {
      setBrowseResults([]);
    }
    setBrowsing(false);
  };

  const handleJoin = async (syndicateId: string) => {
    setActionMsg("");
    try {
      const { data } = await joinSyndicate(syndicateId);
      setActionMsg(
        data.action === "joined" ? "Joined syndicate!" : "Join request sent!",
      );
      if (data.action === "joined") {
        knownInSyndicate.current = true;
        setSyndicate({
          id: data.syndicateId || syndicateId,
          name: "",
          treasury: 0,
          members: [],
          settings: null,
        });
        onRefresh?.();
      }
    } catch (err: any) {
      setActionMsg(err.response?.data?.error || "Join failed");
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;
    setActionMsg("");
    try {
      const { data } = await joinSyndicateByCode(inviteCode.trim());
      setActionMsg("Joined syndicate!");
      knownInSyndicate.current = true;
      setSyndicate({
        id: data.syndicateId || "",
        name: "",
        treasury: 0,
        members: [],
        settings: null,
      });
      onRefresh?.();
    } catch (err: any) {
      setActionMsg(err.response?.data?.error || "Invalid code");
    }
  };

  const handleDeposit = async () => {
    try {
      await depositToTreasury(depositAmt);
      fetchData();
      onRefresh?.();
    } catch (err: any) {
      setActionMsg(err.response?.data?.error || "Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdrawFromTreasury(withdrawAmt);
      fetchData();
      onRefresh?.();
    } catch (err: any) {
      setActionMsg(err.response?.data?.error || "Withdraw failed");
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this syndicate?")) return;
    try {
      await leaveSyndicate();
      knownInSyndicate.current = false;
      setSyndicate(null);
      onRefresh?.();
    } catch (err: any) {
      setActionMsg(err.response?.data?.error || "Leave failed");
    }
  };

  if (loading) {
    return (
      <div className="panel-content">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  // ── NOT IN A SYNDICATE ─────────────────────────────────────
  if (!syndicate) {
    const content = (
      <>
        <div
          className="text-muted"
          style={{ marginBottom: 8, fontStyle: "italic" }}
        >
          Form or join a syndicate to pool resources, govern territories, and
          dominate the galaxy.
        </div>

        {error && (
          <div style={{ color: "var(--red)", marginBottom: 4 }}>{error}</div>
        )}
        {actionMsg && (
          <div style={{ color: "var(--cyan)", marginBottom: 4 }}>
            {actionMsg}
          </div>
        )}

        {/* Create Syndicate */}
        <div className="panel-subheader">Create Syndicate</div>
        <div className="syndicate-create-form">
          <input
            placeholder="Syndicate name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            className="chat-input"
            style={{ marginBottom: 4 }}
          />
          <input
            placeholder="Motto (optional)"
            value={createMotto}
            onChange={(e) => setCreateMotto(e.target.value)}
            className="chat-input"
            style={{ marginBottom: 4 }}
          />
          <div className="panel-row" style={{ gap: 4, flexWrap: "wrap" }}>
            <label style={{ fontSize: 10, color: "#888" }}>Recruitment:</label>
            <select
              value={createMode}
              onChange={(e) => setCreateMode(e.target.value)}
              className="qty-input"
              style={{ width: "auto" }}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="invite_only">Invite Only</option>
            </select>
            <label style={{ fontSize: 10, color: "#888" }}>Min Lvl:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={createMinLevel}
              onChange={(e) => setCreateMinLevel(Number(e.target.value) || 1)}
              className="qty-input"
              style={{ width: 40 }}
            />
          </div>
          <div
            className="panel-row"
            style={{ gap: 4, flexWrap: "wrap", marginTop: 4 }}
          >
            <label style={{ fontSize: 10, color: "#888" }}>Quorum %:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={createQuorum}
              onChange={(e) => setCreateQuorum(Number(e.target.value) || 60)}
              className="qty-input"
              style={{ width: 40 }}
            />
            <label style={{ fontSize: 10, color: "#888" }}>Vote hrs:</label>
            <input
              type="number"
              min={1}
              max={720}
              value={createVoteDuration}
              onChange={(e) =>
                setCreateVoteDuration(Number(e.target.value) || 48)
              }
              className="qty-input"
              style={{ width: 50 }}
            />
          </div>
          <button
            className="btn-sm btn-buy"
            onClick={handleCreate}
            disabled={creating}
            style={{ marginTop: 6 }}
          >
            {creating ? "CREATING..." : "CREATE"}
          </button>
        </div>

        {/* Browse Syndicates */}
        <div className="panel-subheader" style={{ marginTop: 8 }}>
          Browse Syndicates
        </div>
        <div className="panel-row" style={{ gap: 4 }}>
          <input
            placeholder="Search..."
            value={browseSearch}
            onChange={(e) => setBrowseSearch(e.target.value)}
            className="chat-input"
            style={{ flex: 1 }}
          />
          <select
            value={browseMode}
            onChange={(e) => setBrowseMode(e.target.value)}
            className="qty-input"
            style={{ width: "auto" }}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <button
            className="btn-sm btn-buy"
            onClick={handleBrowse}
            disabled={browsing}
          >
            {browsing ? "..." : "SEARCH"}
          </button>
        </div>
        {browseResults.length > 0 && (
          <div className="syndicate-browse" style={{ marginTop: 4 }}>
            {browseResults.map((s) => (
              <div key={s.id} className="syndicate-browse-item">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "var(--magenta)", fontWeight: "bold" }}>
                    {s.name}
                  </span>
                  <span style={{ fontSize: 9, color: "#888" }}>
                    {s.member_count} members
                    {s.min_level > 1 && ` · Lvl ${s.min_level}+`}
                  </span>
                </div>
                {s.motto && (
                  <div
                    style={{ fontSize: 10, color: "#aaa", fontStyle: "italic" }}
                  >
                    {s.motto}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 2,
                  }}
                >
                  <span
                    className={`badge-recruitment badge-${s.recruitment_mode || "closed"}`}
                  >
                    {(s.recruitment_mode || "closed").toUpperCase()}
                  </span>
                  <button
                    className="btn-sm btn-buy"
                    onClick={() => handleJoin(s.id)}
                  >
                    {(s.recruitment_mode || "closed") === "open"
                      ? "JOIN"
                      : "REQUEST"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join by Code */}
        <div className="panel-subheader" style={{ marginTop: 8 }}>
          Join by Invite Code
        </div>
        <div className="panel-row" style={{ gap: 4 }}>
          <input
            placeholder="Enter code..."
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="chat-input"
            style={{ flex: 1 }}
          />
          <button className="btn-sm btn-buy" onClick={handleJoinByCode}>
            JOIN
          </button>
        </div>
      </>
    );
    return <div className="panel-content">{content}</div>;
  }

  // ── IN A SYNDICATE ─────────────────────────────────────────
  const roleColor = (role: string) => {
    if (role === "leader") return "var(--yellow)";
    if (role === "officer") return "var(--cyan)";
    return "var(--green)";
  };

  const content = (
    <>
      {actionMsg && (
        <div style={{ color: "var(--cyan)", marginBottom: 4 }}>{actionMsg}</div>
      )}

      <div className="panel-row">
        <span className="panel-label">Name:</span>
        <span style={{ color: "var(--magenta)" }}>{syndicate.name}</span>
      </div>
      {syndicate.settings?.motto && (
        <div className="panel-row">
          <span className="panel-label">Motto:</span>
          <span style={{ color: "#aaa", fontStyle: "italic" }}>
            {syndicate.settings.motto}
          </span>
        </div>
      )}
      <div className="panel-row">
        <span className="panel-label">Treasury:</span>
        <span style={{ color: "var(--yellow)" }}>
          {Number(syndicate.treasury).toLocaleString()} cr
        </span>
      </div>
      {syndicate.settings && (
        <div className="panel-row">
          <span className="panel-label">Recruitment:</span>
          <span
            className={`badge-recruitment badge-${syndicate.settings.recruitment_mode}`}
          >
            {syndicate.settings.recruitment_mode?.toUpperCase()}
          </span>
        </div>
      )}

      <div className="panel-subheader">Treasury</div>
      <div className="panel-row" style={{ gap: 4 }}>
        <input
          type="number"
          min={1}
          value={depositAmt}
          onChange={(e) =>
            setDepositAmt(Math.max(1, parseInt(e.target.value) || 1))
          }
          className="qty-input"
          style={{ width: 70 }}
        />
        <button className="btn-sm btn-buy" onClick={handleDeposit}>
          DEPOSIT
        </button>
        <input
          type="number"
          min={1}
          value={withdrawAmt}
          onChange={(e) =>
            setWithdrawAmt(Math.max(1, parseInt(e.target.value) || 1))
          }
          className="qty-input"
          style={{ width: 70 }}
        />
        <button className="btn-sm btn-sell" onClick={handleWithdraw}>
          WITHDRAW
        </button>
      </div>

      <div className="panel-subheader">Members ({members.length})</div>
      {members.map((m) => (
        <div
          key={m.id}
          className="panel-row"
          style={{ justifyContent: "space-between" }}
        >
          <span>{m.username}</span>
          <span
            style={{
              color: roleColor(m.role),
              fontSize: 10,
              textTransform: "uppercase",
            }}
          >
            {m.role}
          </span>
        </div>
      ))}

      {syndicateAllies.length > 0 && (
        <>
          <div className="panel-subheader">Syndicate Alliances</div>
          {syndicateAllies.map((a) => (
            <div key={a.id} className="panel-row">
              <span style={{ color: "var(--purple)" }}>
                {a.allySyndicateName}
              </span>
            </div>
          ))}
        </>
      )}

      {personalAllies.length > 0 && (
        <>
          <div className="panel-subheader">Personal Alliances</div>
          {personalAllies.map((a) => (
            <div key={a.id} className="panel-row">
              <span style={{ color: "var(--cyan)" }}>{a.allyName}</span>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <button
          className="btn-sm"
          style={{ background: "#400", color: "var(--red)" }}
          onClick={handleLeave}
        >
          LEAVE SYNDICATE
        </button>
      </div>
    </>
  );

  return <div className="panel-content">{content}</div>;
}
