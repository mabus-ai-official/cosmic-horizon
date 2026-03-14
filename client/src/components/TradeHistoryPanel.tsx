import { useState, useEffect, useMemo } from "react";
import { getTradeHistory } from "../services/api";

interface Trade {
  id: string;
  commodity: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  direction: string;
  createdAt: string;
  outpostId: string;
  outpostName: string;
}

interface CommoditySummary {
  totalBought: number;
  totalSold: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  netProfit: number;
}

interface Summary {
  byCommodity: Record<string, CommoditySummary>;
  overall: {
    totalSpent: number;
    totalEarned: number;
    netProfit: number;
  };
}

interface Props {
  refreshKey?: number;
  bare?: boolean;
}

export default function TradeHistoryPanel({ refreshKey, bare: _bare }: Props) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (client-side)
  const [searchText, setSearchText] = useState("");
  const [filterCommodity, setFilterCommodity] = useState("all");
  const [filterDirection, setFilterDirection] = useState("all");

  useEffect(() => {
    setLoading(true);
    getTradeHistory({ limit: 100 })
      .then(({ data }) => {
        setTrades(data.trades || []);
        setSummary(data.summary || null);
        setError(null);
      })
      .catch(() => setError("Could not load trade history"))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (filterCommodity !== "all" && t.commodity !== filterCommodity)
        return false;
      if (filterDirection !== "all" && t.direction !== filterDirection)
        return false;
      if (
        searchText &&
        !t.outpostName.toLowerCase().includes(searchText.toLowerCase())
      )
        return false;
      return true;
    });
  }, [trades, filterCommodity, filterDirection, searchText]);

  const profitColor = (val: number) =>
    val > 0 ? "var(--green)" : val < 0 ? "var(--red)" : "var(--grey)";

  const formatCredits = (val: number) => {
    if (val >= 0) return `${val.toLocaleString()} cr`;
    return `-${Math.abs(val).toLocaleString()} cr`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="panel-content">
        <div className="text-muted">Loading trade history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-content">
        <div style={{ color: "var(--red)", fontSize: 11 }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="panel-content">
      <div className="panel-sections">
        {/* P&L Summary */}
        {summary && (
          <div className="panel-section panel-section--accent">
            <div className="panel-section__header">Profit & Loss</div>
            <div className="trade-history-overall">
              <div className="trade-history-stat">
                <span className="trade-history-stat__label">Spent</span>
                <span
                  className="trade-history-stat__value"
                  style={{ color: "var(--red)" }}
                >
                  {formatCredits(summary.overall.totalSpent)}
                </span>
              </div>
              <div className="trade-history-stat">
                <span className="trade-history-stat__label">Earned</span>
                <span
                  className="trade-history-stat__value"
                  style={{ color: "var(--green)" }}
                >
                  {formatCredits(summary.overall.totalEarned)}
                </span>
              </div>
              <div className="trade-history-stat">
                <span className="trade-history-stat__label">Net P&L</span>
                <span
                  className="trade-history-stat__value"
                  style={{
                    color: profitColor(summary.overall.netProfit),
                    fontWeight: "bold",
                  }}
                >
                  {summary.overall.netProfit >= 0 ? "+" : ""}
                  {formatCredits(summary.overall.netProfit)}
                </span>
              </div>
            </div>

            <div className="trade-history-commodities">
              {Object.entries(summary.byCommodity).map(([commodity, data]) => (
                <div key={commodity} className="trade-history-commodity-row">
                  <span className="trade-history-commodity-name">
                    {commodity}
                  </span>
                  <span className="text-muted">
                    B:{data.totalBought} @{data.avgBuyPrice}
                  </span>
                  <span className="text-muted">
                    S:{data.totalSold} @{data.avgSellPrice}
                  </span>
                  <span
                    style={{
                      color: profitColor(data.netProfit),
                      fontWeight: "bold",
                    }}
                  >
                    {data.netProfit >= 0 ? "+" : ""}
                    {data.netProfit.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="panel-section">
          <div className="panel-section__header panel-section__header--muted">
            Filters
          </div>
          <div className="trade-history-filters">
            <input
              type="text"
              className="trade-history-search"
              placeholder="Search outpost..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <select
              className="trade-history-select"
              value={filterCommodity}
              onChange={(e) => setFilterCommodity(e.target.value)}
            >
              <option value="all">All</option>
              <option value="cyrillium">Cyrillium</option>
              <option value="food">Food</option>
              <option value="tech">Tech</option>
            </select>
            <select
              className="trade-history-select"
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
            >
              <option value="all">All</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
        </div>

        {/* Trade List */}
        <div className="panel-section">
          <div className="panel-section__header panel-section__header--muted">
            Transactions ({filteredTrades.length})
          </div>
          <div className="trade-history-list">
            {filteredTrades.length === 0 ? (
              <div className="text-muted" style={{ padding: "8px 0" }}>
                No trades found.
              </div>
            ) : (
              filteredTrades.map((t) => (
                <div key={t.id} className="trade-history-row">
                  <div className="trade-history-row__top">
                    <span
                      className={
                        t.direction === "buy"
                          ? "trade-history-direction trade-history-direction--buy"
                          : "trade-history-direction trade-history-direction--sell"
                      }
                    >
                      {t.direction.toUpperCase()}
                    </span>
                    <span className="trade-history-commodity">
                      {t.commodity}
                    </span>
                    <span className="trade-history-qty">x{t.quantity}</span>
                    <span className="text-muted">@{t.pricePerUnit} cr</span>
                    <span
                      className="trade-history-total"
                      style={{
                        color:
                          t.direction === "sell"
                            ? "var(--green)"
                            : "var(--red)",
                      }}
                    >
                      {t.direction === "sell" ? "+" : "-"}
                      {t.totalPrice.toLocaleString()} cr
                    </span>
                  </div>
                  <div className="trade-history-row__bottom">
                    <span className="text-muted">{t.outpostName}</span>
                    <span className="text-muted">
                      {formatTime(t.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
