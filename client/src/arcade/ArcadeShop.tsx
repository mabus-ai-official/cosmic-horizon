import { useState, useEffect } from "react";
import { getShopItems, buyShopItem } from "./services/arcade-api";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  slot: string;
  stat_bonus: number;
  token_price: number;
  max_stack: number;
}

interface ArcadeShopProps {
  tokenBalance: number;
  onBalanceChange: (balance: number | ((prev: number) => number)) => void;
  onBack: () => void;
}

const SLOT_ICONS: Record<string, string> = {
  weapon: "[W]",
  engine: "[E]",
  cargo: "[C]",
  shield: "[S]",
};

export default function ArcadeShop({
  tokenBalance,
  onBalanceChange,
  onBack,
}: ArcadeShopProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getShopItems()
      .then((data) => {
        setItems(data.items);
        onBalanceChange(data.balance);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [onBalanceChange]);

  const handleBuy = async (item: ShopItem) => {
    if (tokenBalance < item.token_price) return;
    setBuying(item.id);
    setMessage(null);
    try {
      const result = await buyShopItem(item.id);
      onBalanceChange(result.newBalance);
      setMessage(
        `Installed ${result.name} (+${result.effectiveBonus} ${result.slot})`,
      );
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Purchase failed");
    }
    setBuying(null);
  };

  return (
    <div className="arcade-shop">
      <div className="arcade-shop__header">
        <button className="arcade-shop__back" onClick={onBack}>
          BACK
        </button>
        <div className="arcade-shop__title">TOKEN SHOP</div>
        <div className="arcade-shop__balance">
          <span className="arcade-shop__balance-label">TOKENS:</span>
          <span className="arcade-shop__balance-value">{tokenBalance}</span>
        </div>
      </div>

      {message && <div className="arcade-shop__message">{message}</div>}

      {loading ? (
        <div className="arcade-shop__loading">Loading shop...</div>
      ) : items.length === 0 ? (
        <div className="arcade-shop__empty">No items available</div>
      ) : (
        <div className="arcade-shop__grid">
          {items.map((item) => (
            <div key={item.id} className="arcade-shop__card">
              <div className="arcade-shop__card-header">
                <span className="arcade-shop__slot">
                  {SLOT_ICONS[item.slot] || item.slot}
                </span>
                <span className="arcade-shop__item-name">{item.name}</span>
              </div>
              <div className="arcade-shop__item-desc">{item.description}</div>
              <div className="arcade-shop__card-footer">
                <span className="arcade-shop__stat">
                  +{item.stat_bonus} {item.slot}
                </span>
                <button
                  className={`arcade-shop__buy${tokenBalance < item.token_price ? " arcade-shop__buy--disabled" : ""}`}
                  disabled={
                    tokenBalance < item.token_price || buying === item.id
                  }
                  onClick={() => handleBuy(item)}
                >
                  {buying === item.id ? "..." : `${item.token_price} TOKENS`}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
