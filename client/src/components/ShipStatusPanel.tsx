import { useState } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import PixelSprite from "./PixelSprite";
import type { PlayerState } from "../hooks/useGameState";

const RACE_LABELS: Record<string, string> = {
  muscarian: "Muscarian",
  vedic: "Vedic",
  kalin: "Kalin",
  tarri: "Tar'ri",
};

const RACE_COLORS: Record<string, string> = {
  muscarian: "#c084fc",
  vedic: "#60a5fa",
  kalin: "#34d399",
  tarri: "#fb923c",
};

type CargoTab = "goods" | "colonists";

interface Props {
  player: PlayerState | null;
}

export default function ShipStatusPanel({ player }: Props) {
  const [cargoTab, setCargoTab] = useState<CargoTab>("goods");
  const ship = player?.currentShip;
  if (!ship) {
    return (
      <CollapsiblePanel title="SHIP STATUS">
        <div className="panel-row text-muted">No active ship</div>
      </CollapsiblePanel>
    );
  }

  const totalCargo =
    ship.cyrilliumCargo +
    ship.foodCargo +
    ship.techCargo +
    ship.colonistsCargo +
    (ship.vedicCargo || 0);
  const cargoPercent =
    ship.maxCargoHolds > 0
      ? Math.round((totalCargo / ship.maxCargoHolds) * 100)
      : 0;
  const colonists = ship.colonistsByRace || [];
  const totalColonists = colonists.reduce((sum, r) => sum + r.count, 0);

  return (
    <CollapsiblePanel title="SHIP STATUS">
      <div className="ship-status-sprite-header">
        <PixelSprite
          spriteKey={`ship_${ship.shipTypeId}`}
          size={48}
          className="ship-status-sprite"
        />
        <div className="ship-status-sprite-header__info">
          <div className="panel-row">
            <span className="panel-label">Type:</span>
            <span>{ship.shipTypeId}</span>
          </div>
          <div className="panel-row">
            <span className="panel-label">Weapons:</span>
            <span className="text-combat">{ship.weaponEnergy}</span>
          </div>
          <div className="panel-row">
            <span className="panel-label">Engines:</span>
            <span className="text-info">{ship.engineEnergy}</span>
          </div>
          <div className="panel-row">
            <span className="panel-label">Hull:</span>
            <span
              className={`${ship.hullHp < ship.maxHullHp * 0.25 ? "text-error hull-critical" : ship.hullHp < ship.maxHullHp * 0.5 ? "text-warning" : "text-success"}`}
            >
              {ship.hullHp}/{ship.maxHullHp}
            </span>
          </div>
        </div>
      </div>

      <div className="panel-subheader">
        Cargo [{totalCargo}/{ship.maxCargoHolds}]
      </div>
      <div className="cargo-bar">
        <div
          className="cargo-bar__fill"
          style={{ width: `${Math.min(100, cargoPercent)}%` }}
        />
      </div>

      <div className="group-panel-tabs" style={{ marginTop: "0.5rem" }}>
        <span
          onClick={() => setCargoTab("goods")}
          style={{
            cursor: "pointer",
            color: cargoTab === "goods" ? "#0f0" : "#666",
          }}
        >
          {cargoTab === "goods" ? "[Goods]" : "Goods"}
        </span>
        <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
        <span
          onClick={() => setCargoTab("colonists")}
          style={{
            cursor: "pointer",
            color: cargoTab === "colonists" ? "#0f0" : "#666",
          }}
        >
          {cargoTab === "colonists"
            ? `[Colonists (${totalColonists})]`
            : `Colonists (${totalColonists})`}
        </span>
      </div>

      {cargoTab === "goods" && (
        <div className="cargo-breakdown">
          {ship.cyrilliumCargo > 0 && (
            <span className="cargo-item cargo-item--cyr">
              Cyr: {ship.cyrilliumCargo}
            </span>
          )}
          {ship.foodCargo > 0 && (
            <span className="cargo-item cargo-item--food">
              Food: {ship.foodCargo}
            </span>
          )}
          {ship.techCargo > 0 && (
            <span className="cargo-item cargo-item--tech">
              Tech: {ship.techCargo}
            </span>
          )}
          {(ship.vedicCargo || 0) > 0 && (
            <span className="cargo-item" style={{ color: "#c0f" }}>
              VCry: {ship.vedicCargo}
            </span>
          )}
          {ship.colonistsCargo > 0 && (
            <span className="cargo-item cargo-item--col">
              Col: {ship.colonistsCargo}
            </span>
          )}
          {totalCargo === 0 && <span className="text-muted">Empty</span>}
        </div>
      )}

      {cargoTab === "colonists" && (
        <div
          className="cargo-breakdown"
          style={{ flexDirection: "column", gap: "0.25rem" }}
        >
          {colonists.length === 0 || totalColonists === 0 ? (
            <span className="text-muted">No colonists aboard</span>
          ) : (
            colonists
              .filter((r) => r.count > 0)
              .map((r) => (
                <div
                  key={r.race}
                  className="panel-row"
                  style={{ justifyContent: "space-between" }}
                >
                  <span style={{ color: RACE_COLORS[r.race] || "#aaa" }}>
                    {RACE_LABELS[r.race] || r.race}
                  </span>
                  <span>{r.count.toLocaleString()}</span>
                </div>
              ))
          )}
        </div>
      )}
    </CollapsiblePanel>
  );
}
