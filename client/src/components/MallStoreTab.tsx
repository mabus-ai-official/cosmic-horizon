import { useState, useEffect } from "react";
import { getStoreCatalog, buyStoreItem } from "../services/api";
import type { ToastType } from "../hooks/useToast";

interface StoreItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
}

const PURCHASE_HINTS: Record<string, string> = {
  planetary_scanner: "Look for the SCAN button in the Helm when in open space.",
  escape_pod: "Eject is now available in your context panel.",
  self_destruct_device: "Self-Destruct is now available in your context panel.",
};

interface Props {
  credits: number;
  onAction: () => void;
  showToast?: (msg: string, type?: ToastType, duration?: number) => number;
}

export default function MallStoreTab({ credits, onAction, showToast }: Props) {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    getStoreCatalog()
      .then(({ data }) => setItems(data.items || data.catalog || []))
      .catch(() => setError("Failed to load store"))
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (itemId: string) => {
    setBuying(itemId);
    setError("");
    try {
      const { data } = await buyStoreItem(itemId);
      onAction();
      if (showToast) {
        showToast(
          data.message || `Purchased ${data.name || itemId}`,
          "success",
        );
        const hint = PURCHASE_HINTS[data.item || itemId];
        if (hint) showToast(hint, "info", 6000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Purchase failed");
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div className="text-muted">Loading store...</div>;

  return (
    <div className="mall-tab-content">
      <div className="mall-tab-credits">
        Credits: <span className="text-trade">{credits.toLocaleString()}</span>
      </div>
      {error && <div className="mall-error">{error}</div>}
      {items.length === 0 ? (
        <div className="text-muted">No items available.</div>
      ) : (
        <div className="mall-item-list">
          {items.map((item) => (
            <div key={item.id} className="mall-item">
              <div className="mall-item__info">
                <span className="mall-item__name">{item.name}</span>
                <span className="mall-item__category">{item.category}</span>
                {item.description && (
                  <span className="mall-item__desc">{item.description}</span>
                )}
              </div>
              <div className="mall-item__action">
                <span className="mall-item__price">
                  {item.price.toLocaleString()} cr
                </span>
                <button
                  className="btn-sm btn-buy"
                  disabled={buying === item.id || credits < item.price}
                  onClick={() => handleBuy(item.id)}
                >
                  {buying === item.id ? "..." : "BUY"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
