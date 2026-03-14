import { useState } from "react";
import InventoryPanel from "./InventoryPanel";
import TabletsPanel from "./TabletsPanel";
import CraftingPanel from "./CraftingPanel";
import ShipUpgradesTab from "./ShipUpgradesTab";

interface Props {
  refreshKey?: number;
  onItemUsed?: () => void;
  atStarMall?: boolean;
  bare?: boolean;
}

type TabView = "items" | "tablets" | "crafting" | "upgrades";

export default function GearGroupPanel({
  refreshKey,
  onItemUsed,
  atStarMall = false,
  bare,
}: Props) {
  const [tab, setTab] = useState<TabView>("items");

  const tabBar = (
    <div className="group-panel-tabs">
      <span
        onClick={() => setTab("items")}
        style={{ cursor: "pointer", color: tab === "items" ? "#0f0" : "#666" }}
      >
        {tab === "items" ? "[Items]" : "Items"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("tablets")}
        style={{
          cursor: "pointer",
          color: tab === "tablets" ? "#0f0" : "#666",
        }}
      >
        {tab === "tablets" ? "[Tablets]" : "Tablets"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("crafting")}
        style={{
          cursor: "pointer",
          color: tab === "crafting" ? "#0f0" : "#666",
        }}
      >
        {tab === "crafting" ? "[Crafting]" : "Crafting"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("upgrades")}
        style={{
          cursor: "pointer",
          color: tab === "upgrades" ? "#0f0" : "#666",
        }}
      >
        {tab === "upgrades" ? "[Upgrades]" : "Upgrades"}
      </span>
    </div>
  );

  const content = (
    <div className="panel-sections">
      {tabBar}
      {tab === "items" && (
        <InventoryPanel
          refreshKey={refreshKey}
          onItemUsed={onItemUsed || (() => {})}
          bare
        />
      )}
      {tab === "tablets" && <TabletsPanel refreshKey={refreshKey} bare />}
      {tab === "crafting" && <CraftingPanel refreshKey={refreshKey} bare />}
      {tab === "upgrades" && (
        <ShipUpgradesTab
          refreshKey={refreshKey}
          atStarMall={atStarMall}
          onAction={onItemUsed}
        />
      )}
    </div>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <div className="panel-content">{content}</div>;
}
