import { useState } from "react";
import TradeTable from "./TradeTable";
import MallStoreTab from "./MallStoreTab";
import MallDealerTab from "./MallDealerTab";
import MallGarageTab from "./MallGarageTab";
import MallSalvageTab from "./MallSalvageTab";
import MallCantinaTab from "./MallCantinaTab";
import MallRefuelTab from "./MallRefuelTab";
import type { ToastType } from "../hooks/useToast";

type MallTab =
  | "trade"
  | "store"
  | "dealer"
  | "garage"
  | "salvage"
  | "cantina"
  | "refuel"
  | "arcade";

const TABS: { key: MallTab; label: string }[] = [
  { key: "trade", label: "Trade" },
  { key: "store", label: "Store" },
  { key: "dealer", label: "Dealer" },
  { key: "garage", label: "Garage" },
  { key: "salvage", label: "Salvage" },
  { key: "cantina", label: "Cantina" },
  { key: "refuel", label: "Refuel" },
  { key: "arcade", label: "Arcade" },
];

interface Props {
  outpostId: string | null;
  onBuy: (outpostId: string, commodity: string, quantity: number) => void;
  onSell: (outpostId: string, commodity: string, quantity: number) => void;
  credits: number;
  energy: number;
  maxEnergy: number;
  playerLevel?: number;
  onAction: () => void;
  onArcade?: () => void;
  showToast?: (msg: string, type?: ToastType, duration?: number) => number;
  bare?: boolean;
}

export default function MallPanel({
  outpostId,
  onBuy,
  onSell,
  credits,
  energy,
  maxEnergy,
  playerLevel,
  onAction,
  onArcade,
  showToast,
  bare,
}: Props) {
  const [tab, setTab] = useState<MallTab>("trade");

  const tabBar = (
    <div className="group-panel-tabs mall-tabs">
      {TABS.map((t, i) => (
        <span key={t.key}>
          {i > 0 && (
            <span style={{ color: "#444", margin: "0 0.3rem" }}>|</span>
          )}
          <span
            onClick={() => {
              if (t.key === "arcade" && onArcade) {
                onArcade();
              } else {
                setTab(t.key);
              }
            }}
            style={{
              cursor: "pointer",
              color:
                t.key === "arcade"
                  ? "var(--cyan)"
                  : tab === t.key
                    ? "#0f0"
                    : "#666",
            }}
          >
            {tab === t.key ? `[${t.label}]` : t.label}
          </span>
        </span>
      ))}
    </div>
  );

  const renderTab = () => {
    switch (tab) {
      case "trade":
        return (
          <TradeTable
            outpostId={outpostId}
            onBuy={onBuy}
            onSell={onSell}
            bare
          />
        );
      case "store":
        return (
          <MallStoreTab
            credits={credits}
            onAction={onAction}
            showToast={showToast}
          />
        );
      case "dealer":
        return (
          <MallDealerTab
            credits={credits}
            playerLevel={playerLevel}
            onAction={onAction}
            showToast={showToast}
          />
        );
      case "garage":
        return <MallGarageTab onAction={onAction} />;
      case "salvage":
        return <MallSalvageTab onAction={onAction} />;
      case "cantina":
        return <MallCantinaTab credits={credits} onAction={onAction} />;
      case "refuel":
        return (
          <MallRefuelTab
            energy={energy}
            maxEnergy={maxEnergy}
            credits={credits}
            onAction={onAction}
          />
        );
    }
  };

  const content = (
    <>
      {tabBar}
      {renderTab()}
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <div className="panel-content">{content}</div>;
}
