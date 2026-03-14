import { useState, useEffect } from "react";
import { getDealer, buyShip } from "../services/api";
import type { ToastType } from "../hooks/useToast";

interface ShipType {
  id: string;
  name: string;
  price: number;
  levelRequired: number;
  weaponSlots: number;
  cargoCapacity: number;
  enginePower: number;
  hullHp: number;
}

interface Props {
  credits: number;
  playerLevel?: number;
  onAction: () => void;
  showToast?: (msg: string, type?: ToastType, duration?: number) => number;
}

export default function MallDealerTab({
  credits,
  playerLevel = 1,
  onAction,
  showToast,
}: Props) {
  const [ships, setShips] = useState<ShipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    getDealer()
      .then(({ data }) => setShips(data.ships || []))
      .catch(() => setError("Failed to load dealer"))
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (shipTypeId: string) => {
    setBuying(shipTypeId);
    setError("");
    try {
      const { data } = await buyShip(shipTypeId);
      onAction();
      if (showToast) {
        showToast(
          data.message || `Purchased ${data.shipType || shipTypeId}`,
          "success",
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Purchase failed");
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div className="text-muted">Loading dealer...</div>;

  return (
    <div className="mall-tab-content">
      <div className="mall-tab-credits">
        Credits: <span className="text-trade">{credits.toLocaleString()}</span>
      </div>
      {error && <div className="mall-error">{error}</div>}
      {ships.length === 0 ? (
        <div className="text-muted">No ships available.</div>
      ) : (
        <div className="mall-item-list">
          {ships.map((ship) => {
            const locked = playerLevel < ship.levelRequired;
            return (
              <div
                key={ship.id}
                className={`mall-item${locked ? " mall-item--locked" : ""}`}
              >
                <div className="mall-item__info">
                  <span className="mall-item__name">{ship.name}</span>
                  <span className="mall-item__stats">
                    W:{ship.weaponSlots} C:{ship.cargoCapacity} E:
                    {ship.enginePower} HP:{ship.hullHp}
                  </span>
                  {locked && (
                    <span className="mall-item__locked">
                      Requires Level {ship.levelRequired}
                    </span>
                  )}
                </div>
                <div className="mall-item__action">
                  <span className="mall-item__price">
                    {ship.price.toLocaleString()} cr
                  </span>
                  <button
                    className="btn-sm btn-buy"
                    disabled={
                      locked || buying === ship.id || credits < ship.price
                    }
                    onClick={() => handleBuy(ship.id)}
                  >
                    {buying === ship.id ? "..." : "BUY"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
