import { useState, useEffect } from "react";
import { getCantina, buyCantineIntel, talkBartender } from "../services/api";

interface CantinaData {
  rumor?: string;
  intelCost?: number;
  bartenderAvailable?: boolean;
}

interface IntelData {
  richOutposts: { name: string; sectorId: number; treasury: number }[];
  topPlanets: {
    name: string;
    sectorId: number;
    colonists: number;
    planetClass: string;
  }[];
  dangerousSectors: number[];
  message?: string;
}

interface Props {
  credits: number;
  onAction: () => void;
}

export default function MallCantinaTab({ credits, onAction }: Props) {
  const [data, setData] = useState<CantinaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [intelResult, setIntelResult] = useState<IntelData | null>(null);
  const [intelMessage, setIntelMessage] = useState<string | null>(null);
  const [dialogueResult, setDialogueResult] = useState<any>(null);

  useEffect(() => {
    getCantina()
      .then(({ data: d }) => setData(d))
      .catch(() => setError("Failed to load cantina"))
      .finally(() => setLoading(false));
  }, []);

  const handleBuyIntel = async () => {
    setBusy(true);
    setError("");
    setIntelResult(null);
    setIntelMessage(null);
    try {
      const { data: result } = await buyCantineIntel();
      if (result.intel && typeof result.intel === "object") {
        setIntelResult(result.intel);
      }
      setIntelMessage(result.message || null);
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to buy intel");
    } finally {
      setBusy(false);
    }
  };

  const handleTalkBartender = async () => {
    setBusy(true);
    setError("");
    setDialogueResult(null);
    try {
      const { data: result } = await talkBartender();
      setDialogueResult(result);
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.error || "Bartender is busy");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-muted">Loading cantina...</div>;

  return (
    <div className="mall-tab-content">
      {error && <div className="mall-error">{error}</div>}
      {data?.rumor && (
        <div className="cantina-rumor">
          <span className="cantina-rumor__label">RUMOR:</span> {data.rumor}
        </div>
      )}
      <div className="cantina-actions">
        <div className="cantina-action">
          <button
            className="btn-sm btn-buy"
            disabled={
              busy || (data?.intelCost != null && credits < data.intelCost)
            }
            onClick={handleBuyIntel}
          >
            BUY INTEL
          </button>
          {data?.intelCost != null && (
            <span className="text-muted"> ({data.intelCost} cr)</span>
          )}
        </div>
        {data?.bartenderAvailable !== false && (
          <div className="cantina-action">
            <button
              className="btn-sm btn-primary"
              disabled={busy}
              onClick={handleTalkBartender}
            >
              TALK TO BARTENDER
            </button>
          </div>
        )}
      </div>
      {intelMessage && (
        <div className="cantina-result">
          <span className="cantina-result__label">INTEL:</span> {intelMessage}
        </div>
      )}
      {intelResult && (
        <div className="cantina-intel">
          {intelResult.richOutposts?.length > 0 && (
            <div className="cantina-intel__section">
              <div className="cantina-intel__title">WEALTHY OUTPOSTS</div>
              {intelResult.richOutposts.map((o, i) => (
                <div key={i} className="cantina-intel__row">
                  <span>{o.name}</span>
                  <span className="text-muted">
                    Sector {o.sectorId} — {Number(o.treasury).toLocaleString()}{" "}
                    cr
                  </span>
                </div>
              ))}
            </div>
          )}
          {intelResult.topPlanets?.length > 0 && (
            <div className="cantina-intel__section">
              <div className="cantina-intel__title">POPULATED PLANETS</div>
              {intelResult.topPlanets.map((p, i) => (
                <div key={i} className="cantina-intel__row">
                  <span>
                    {p.name}{" "}
                    <span className="text-muted">[{p.planetClass}]</span>
                  </span>
                  <span className="text-muted">
                    Sector {p.sectorId} — {Number(p.colonists).toLocaleString()}{" "}
                    pop
                  </span>
                </div>
              ))}
            </div>
          )}
          {intelResult.dangerousSectors?.length > 0 && (
            <div className="cantina-intel__section">
              <div className="cantina-intel__title">COMBAT HOTSPOTS</div>
              <div className="cantina-intel__row">
                <span>Sectors: {intelResult.dangerousSectors.join(", ")}</span>
              </div>
            </div>
          )}
        </div>
      )}
      {dialogueResult && (
        <div className="cantina-result">
          <span className="cantina-result__label">BARTENDER:</span>{" "}
          {dialogueResult.dialogue ||
            dialogueResult.message ||
            "The bartender nods."}
          {dialogueResult.mission && (
            <div className="cantina-mission">
              <span className="text-warning">
                Mission offered: {dialogueResult.mission.title}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
