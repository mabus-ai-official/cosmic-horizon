import { useState, useEffect } from "react";
import {
  getGarage,
  storeShipInGarage,
  retrieveShipFromGarage,
  repairShipInGarage,
} from "../services/api";

interface StoredShip {
  id: string;
  type: string;
  name: string;
  hullHp: number;
  maxHullHp: number;
  needsRepair?: boolean;
  repairCost?: number;
}

interface Props {
  onAction: () => void;
}

export default function MallGarageTab({ onAction }: Props) {
  const [ships, setShips] = useState<StoredShip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const fetchGarage = () => {
    setLoading(true);
    getGarage()
      .then(({ data }) => setShips(data.ships || []))
      .catch(() => setError("Failed to load garage"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGarage();
  }, []);

  const handleStore = async () => {
    setBusy("store");
    setError("");
    try {
      await storeShipInGarage();
      fetchGarage();
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to store ship");
    } finally {
      setBusy(null);
    }
  };

  const handleRetrieve = async (shipId: string) => {
    setBusy(shipId);
    setError("");
    try {
      await retrieveShipFromGarage(shipId);
      fetchGarage();
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to retrieve ship");
    } finally {
      setBusy(null);
    }
  };

  const handleRepair = async (shipId: string) => {
    setBusy(`repair-${shipId}`);
    setError("");
    try {
      await repairShipInGarage(shipId);
      fetchGarage();
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to repair ship");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="text-muted">Loading garage...</div>;

  return (
    <div className="mall-tab-content">
      <button
        className="btn-sm btn-primary"
        disabled={busy === "store"}
        onClick={handleStore}
        style={{ marginBottom: "8px" }}
      >
        {busy === "store" ? "STORING..." : "STORE CURRENT SHIP"}
      </button>
      {error && <div className="mall-error">{error}</div>}
      {ships.length === 0 ? (
        <div className="text-muted">No ships in garage.</div>
      ) : (
        <div className="mall-item-list">
          {ships.map((ship) => (
            <div key={ship.id} className="mall-item">
              <div className="mall-item__info">
                <span className="mall-item__name">{ship.name}</span>
                <span className="mall-item__stats">
                  HP: {ship.hullHp}/{ship.maxHullHp}
                  {ship.needsRepair && (
                    <span style={{ color: "var(--red)", marginLeft: "6px" }}>
                      DAMAGED
                    </span>
                  )}
                </span>
              </div>
              <div
                className="mall-item__action"
                style={{ display: "flex", gap: "4px" }}
              >
                {ship.needsRepair ? (
                  <button
                    className="btn-sm btn-buy"
                    disabled={busy === `repair-${ship.id}`}
                    onClick={() => handleRepair(ship.id)}
                    style={{
                      background: "rgba(210,153,34,0.15)",
                      borderColor: "var(--yellow)",
                      color: "var(--yellow)",
                    }}
                  >
                    {busy === `repair-${ship.id}`
                      ? "..."
                      : `REPAIR (${ship.repairCost}cr)`}
                  </button>
                ) : (
                  <button
                    className="btn-sm btn-buy"
                    disabled={busy === ship.id}
                    onClick={() => handleRetrieve(ship.id)}
                  >
                    {busy === ship.id ? "..." : "RETRIEVE"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
