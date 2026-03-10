import { useState, useEffect, useMemo } from "react";
import { getTradeDirectory } from "../services/api";
import CollapsiblePanel from "./CollapsiblePanel";

type FilterId =
  | "all"
  | "buy_cyrillium"
  | "buy_food"
  | "buy_tech"
  | "sell_cyrillium"
  | "sell_food"
  | "sell_tech"
  | "sells_fuel";

interface CommodityInfo {
  mode: string;
  stock: number;
  capacity: number;
  price: number;
}

interface OutpostEntry {
  id: string;
  name: string;
  sectorId: number;
  sellsFuel: boolean;
  hasStarMall: boolean;
  cyrillium: CommodityInfo;
  food: CommodityInfo;
  tech: CommodityInfo;
}

interface TradeComputerPanelProps {
  bare?: boolean;
}

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sell_cyrillium", label: "Buy Cyr" },
  { id: "sell_food", label: "Buy Food" },
  { id: "sell_tech", label: "Buy Tech" },
  { id: "buy_cyrillium", label: "Sell Cyr" },
  { id: "buy_food", label: "Sell Food" },
  { id: "buy_tech", label: "Sell Tech" },
  { id: "sells_fuel", label: "Fuel" },
];

function modeColor(mode: string): string {
  if (mode === "buy") return "var(--green)";
  if (mode === "sell") return "var(--orange)";
  return "var(--text-muted)";
}

export default function TradeComputerPanel({ bare }: TradeComputerPanelProps) {
  const [outposts, setOutposts] = useState<OutpostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");

  useEffect(() => {
    setLoading(true);
    getTradeDirectory()
      .then((res) => {
        setOutposts(res.data.outposts);
        setError(null);
      })
      .catch(() => setError("Failed to load trade directory"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return outposts;
    if (filter === "sells_fuel") return outposts.filter((o) => o.sellsFuel);
    // Parse "buy_cyrillium" -> commodity="cyrillium", mode="buy"
    const [mode, commodity] = filter.split("_") as [string, string];
    return outposts.filter((o) => {
      const key = commodity === "cyr" ? "cyrillium" : commodity;
      const info = o[key as keyof OutpostEntry] as CommodityInfo | undefined;
      return info && info.mode === mode;
    });
  }, [outposts, filter]);

  if (loading) {
    const spinner = (
      <div className="tc-loading">Loading trade directory...</div>
    );
    if (bare) return <div className="panel-content">{spinner}</div>;
    return (
      <CollapsiblePanel title="TRADE COMPUTER">{spinner}</CollapsiblePanel>
    );
  }

  if (error) {
    const errMsg = <div className="text-error">{error}</div>;
    if (bare) return <div className="panel-content">{errMsg}</div>;
    return <CollapsiblePanel title="TRADE COMPUTER">{errMsg}</CollapsiblePanel>;
  }

  const content = (
    <div className="tc-container">
      <div className="tc-header">TRADE COMPUTER</div>
      <div className="tc-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`btn-sm tc-filter-btn${filter === f.id ? " tc-filter-active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="tc-count">
        {filtered.length} outpost{filtered.length !== 1 ? "s" : ""}
      </div>
      <div className="tc-list">
        {filtered.map((o) => (
          <div key={o.id} className="tc-outpost">
            <div className="tc-outpost-header">
              <span className="tc-outpost-name">{o.name}</span>
              <span className="tc-outpost-sector">Sector {o.sectorId}</span>
            </div>
            <div className="tc-outpost-tags">
              {o.sellsFuel && <span className="tc-tag tc-tag-fuel">FUEL</span>}
              {o.hasStarMall && (
                <span className="tc-tag tc-tag-mall">STAR MALL</span>
              )}
            </div>
            <div className="tc-commodities">
              <CommodityRow label="Cyrillium" info={o.cyrillium} />
              <CommodityRow label="Food" info={o.food} />
              <CommodityRow label="Tech" info={o.tech} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="tc-empty">No outposts match this filter.</div>
        )}
      </div>
    </div>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <CollapsiblePanel title="TRADE COMPUTER">{content}</CollapsiblePanel>;
}

function CommodityRow({ label, info }: { label: string; info: CommodityInfo }) {
  const pct = info.capacity > 0 ? (info.stock / info.capacity) * 100 : 0;
  return (
    <div className="tc-commodity-row">
      <span className="tc-commodity-name">{label}</span>
      <span className="tc-commodity-price">{info.price} cr</span>
      <span className="tc-commodity-stock">
        {info.stock}/{info.capacity}
      </span>
      <div className="tc-stock-bar">
        <div
          className="tc-stock-fill"
          style={{
            width: `${pct}%`,
            backgroundColor: modeColor(info.mode),
          }}
        />
      </div>
    </div>
  );
}
