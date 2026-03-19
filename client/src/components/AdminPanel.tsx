import { useState } from "react";
import { adminSkipToMission } from "../services/api";

export default function AdminPanel() {
  const [target, setTarget] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSkip = async () => {
    setBusy(true);
    setResult(null);
    try {
      const { data } = await adminSkipToMission(target);
      setResult(
        `Skipped ${data.skipped} missions. Now on: ${data.targetMission} (#${data.targetStoryOrder})${data.targetAccepted ? " [accepted]" : ""}`,
      );
    } catch (err: any) {
      setResult(err.response?.data?.error || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <div
        style={{
          color: "var(--red, #f44)",
          fontWeight: "bold",
          marginBottom: 10,
          fontSize: 16,
        }}
      >
        ADMIN TOOLS
      </div>
      <div style={{ marginBottom: 14, color: "var(--muted)", fontSize: 14 }}>
        Testing only. Skips all missions before the target and accepts it.
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ fontSize: 14, color: "var(--text)" }}>
          Skip to mission #
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={target}
          onChange={(e) => setTarget(parseInt(e.target.value) || 1)}
          style={{
            width: 60,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: 14,
          }}
        />
        <button
          className="btn-sm btn-buy"
          onClick={handleSkip}
          disabled={busy}
          style={{ fontSize: 14, padding: "4px 12px" }}
        >
          {busy ? "..." : "SKIP"}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: 10,
            fontSize: 14,
            color: result.startsWith("Skipped")
              ? "var(--green)"
              : "var(--red, #f44)",
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}
