import { useState, useEffect, useCallback } from "react";
import TradeTable from "./TradeTable";
import MallStoreTab from "./MallStoreTab";
import MallDealerTab from "./MallDealerTab";
import MallGarageTab from "./MallGarageTab";
import MallSalvageTab from "./MallSalvageTab";
import MallCantinaTab from "./MallCantinaTab";
import MallRefuelTab from "./MallRefuelTab";
import BountiesPanel from "./BountiesPanel";
import type { ToastType } from "../hooks/useToast";

type MallTab =
  | "trade"
  | "store"
  | "dealer"
  | "garage"
  | "salvage"
  | "cantina"
  | "refuel"
  | "bounties";

const TABS: { key: MallTab; label: string; icon: string }[] = [
  { key: "trade", label: "Trade", icon: "⇋" },
  { key: "store", label: "Store", icon: "◈" },
  { key: "dealer", label: "Dealer", icon: "⚔" },
  { key: "garage", label: "Garage", icon: "⚙" },
  { key: "salvage", label: "Salvage", icon: "♻" },
  { key: "cantina", label: "Cantina", icon: "☕" },
  { key: "refuel", label: "Refuel", icon: "⚡" },
  { key: "bounties", label: "Bounties", icon: "◎" },
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
  onDrink?: () => void;
  onStoryEvent?: (data: any) => void;
  onClose: () => void;
}

export default function StarmallModal({
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
  onDrink,
  onStoryEvent,
  onClose,
}: Props) {
  const [tab, setTab] = useState<MallTab>("trade");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
        return (
          <MallCantinaTab
            credits={credits}
            onAction={onAction}
            onDrink={onDrink}
            showToast={showToast}
            onStoryEvent={onStoryEvent}
          />
        );
      case "refuel":
        return (
          <MallRefuelTab
            energy={energy}
            maxEnergy={maxEnergy}
            credits={credits}
            onAction={onAction}
          />
        );
      case "bounties":
        return (
          <BountiesPanel
            credits={credits}
            onAction={onAction}
            showToast={showToast}
          />
        );
    }
  };

  return (
    <div
      className="starmall-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="starmall-modal">
        {/* Header */}
        <div className="starmall-header">
          <div className="starmall-title">
            <span className="starmall-title-icon">◆</span>
            STAR MALL
          </div>
          <div className="starmall-header-actions">
            {onArcade && (
              <button className="starmall-arcade-btn" onClick={onArcade}>
                ARCADE
              </button>
            )}
            <button className="starmall-close-btn" onClick={onClose}>
              ESC
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="starmall-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`starmall-tab${tab === t.key ? " starmall-tab--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <span className="starmall-tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="starmall-body">{renderTab()}</div>
      </div>
    </div>
  );
}
