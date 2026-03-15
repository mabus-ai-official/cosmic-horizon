import { useState, useEffect, useCallback } from "react";
import {
  getTradeableAssets,
  createBarterOffer,
  getBarterIncoming,
  getBarterOutgoing,
  acceptBarterOffer,
  rejectBarterOffer,
  cancelBarterOffer,
} from "../services/api";

// ─── Types ───────────────────────────────────────────────────────────

interface OfferItem {
  id?: string;
  itemType: string;
  itemId?: string;
  quantity: number;
  metadata?: Record<string, any>;
}

interface BarterOffer {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  parentOfferId: string | null;
  status: string;
  message: string | null;
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
  offeredItems: OfferItem[];
  requestedItems: OfferItem[];
}

interface TradeableAssets {
  credits: number;
  resources: { id: string; name: string; quantity: number }[];
  cargo: { commodity: string; quantity: number }[];
  tablets: { id: string; name: string; rarity: string; effects: any }[];
  planets: { id: string; name: string; class: string; sectorId: number }[];
  upgrades: { id: string; typeId: string; typeName: string; slot: string }[];
}

interface DraftItem {
  key: string; // unique key for React
  itemType: string;
  itemId?: string;
  quantity: number;
  label: string;
  maxQty?: number;
}

interface Props {
  refreshKey?: number;
  onAction?: () => void;
  bare?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatItemList(items: OfferItem[]): string {
  return items
    .map((i) => {
      const name = i.metadata?.name || i.itemId || i.itemType;
      if (i.itemType === "credits") return `${i.quantity.toLocaleString()} cr`;
      if (i.quantity > 1) return `${i.quantity}x ${name}`;
      return name;
    })
    .join(", ");
}

function timeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Main Panel ──────────────────────────────────────────────────────

export default function TradeOffersPanel({
  refreshKey,
  onAction,
  bare,
}: Props) {
  const [tab, setTab] = useState<"new" | "incoming" | "outgoing">("incoming");
  const [incoming, setIncoming] = useState<BarterOffer[]>([]);
  const [outgoing, setOutgoing] = useState<BarterOffer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Counter-offer pre-fill state
  const [counterPrefill, setCounterPrefill] = useState<{
    recipientName: string;
    parentOfferId: string;
    offeredItems: DraftItem[];
    requestedItems: DraftItem[];
  } | null>(null);

  const refresh = useCallback(() => {
    getBarterIncoming()
      .then(({ data }) => setIncoming(data || []))
      .catch(() => setIncoming([]));
    getBarterOutgoing()
      .then(({ data }) => setOutgoing(data || []))
      .catch(() => setOutgoing([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refreshKey, refresh]);

  const handleAccept = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      await acceptBarterOffer(id);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      await rejectBarterOffer(id);
      refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reject");
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      await cancelBarterOffer(id);
      refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to cancel");
    } finally {
      setBusy(null);
    }
  };

  const handleCounter = (offer: BarterOffer) => {
    // Pre-fill: swap sides, target the sender
    setCounterPrefill({
      recipientName: offer.senderName,
      parentOfferId: offer.id,
      offeredItems: offer.requestedItems.map((i) => ({
        key: crypto.randomUUID(),
        itemType: i.itemType,
        itemId: i.itemId,
        quantity: i.quantity,
        label: i.metadata?.name || i.itemId || i.itemType,
      })),
      requestedItems: offer.offeredItems.map((i) => ({
        key: crypto.randomUUID(),
        itemType: i.itemType,
        itemId: i.itemId,
        quantity: i.quantity,
        label: i.metadata?.name || i.itemId || i.itemType,
      })),
    });
    setTab("new");
  };

  const content = (
    <div style={{ marginTop: 8 }}>
      {/* Sub-tabs */}
      <div
        className="group-panel-tabs"
        style={{ marginBottom: 8, fontSize: 13 }}
      >
        <span
          onClick={() => {
            setTab("new");
            setCounterPrefill(null);
          }}
          style={{ cursor: "pointer", color: tab === "new" ? "#0f0" : "#666" }}
        >
          {tab === "new" ? "[New Offer]" : "New Offer"}
        </span>
        <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
        <span
          onClick={() => setTab("incoming")}
          style={{
            cursor: "pointer",
            color: tab === "incoming" ? "#0f0" : "#666",
          }}
        >
          {tab === "incoming" ? "[Incoming]" : "Incoming"}
          {incoming.length > 0 && (
            <span style={{ color: "var(--orange)", marginLeft: 4 }}>
              ({incoming.length})
            </span>
          )}
        </span>
        <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
        <span
          onClick={() => setTab("outgoing")}
          style={{
            cursor: "pointer",
            color: tab === "outgoing" ? "#0f0" : "#666",
          }}
        >
          {tab === "outgoing" ? "[Outgoing]" : "Outgoing"}
          {outgoing.length > 0 && (
            <span style={{ color: "var(--text-secondary)", marginLeft: 4 }}>
              ({outgoing.length})
            </span>
          )}
        </span>
      </div>

      {error && (
        <div className="mall-error" style={{ fontSize: 12, marginBottom: 6 }}>
          {error}
        </div>
      )}

      {tab === "new" && (
        <OfferBuilder
          prefill={counterPrefill}
          onSent={() => {
            setCounterPrefill(null);
            setTab("outgoing");
            refresh();
          }}
          onError={setError}
        />
      )}

      {tab === "incoming" && (
        <IncomingTab
          offers={incoming}
          busy={busy}
          onAccept={handleAccept}
          onReject={handleReject}
          onCounter={handleCounter}
        />
      )}

      {tab === "outgoing" && (
        <OutgoingTab offers={outgoing} busy={busy} onCancel={handleCancel} />
      )}
    </div>
  );

  if (bare) return content;
  return <div className="panel-content">{content}</div>;
}

// ─── Offer Builder ───────────────────────────────────────────────────

function OfferBuilder({
  prefill,
  onSent,
  onError,
}: {
  prefill: {
    recipientName: string;
    parentOfferId: string;
    offeredItems: DraftItem[];
    requestedItems: DraftItem[];
  } | null;
  onSent: () => void;
  onError: (msg: string) => void;
}) {
  const [assets, setAssets] = useState<TradeableAssets | null>(null);
  const [recipient, setRecipient] = useState(prefill?.recipientName || "");
  const [message, setMessage] = useState("");
  const [offered, setOffered] = useState<DraftItem[]>(
    prefill?.offeredItems || [],
  );
  const [requested, setRequested] = useState<DraftItem[]>(
    prefill?.requestedItems || [],
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getTradeableAssets()
      .then(({ data }) => setAssets(data))
      .catch(() => setAssets(null));
  }, []);

  useEffect(() => {
    if (prefill) {
      setRecipient(prefill.recipientName);
      setOffered(prefill.offeredItems);
      setRequested(prefill.requestedItems);
    }
  }, [prefill]);

  const addItem = (side: "offered" | "requested", item: DraftItem) => {
    if (side === "offered") setOffered((p) => [...p, item]);
    else setRequested((p) => [...p, item]);
  };

  const removeItem = (side: "offered" | "requested", key: string) => {
    if (side === "offered") setOffered((p) => p.filter((i) => i.key !== key));
    else setRequested((p) => p.filter((i) => i.key !== key));
  };

  const updateQty = (
    side: "offered" | "requested",
    key: string,
    qty: number,
  ) => {
    const update = (items: DraftItem[]) =>
      items.map((i) =>
        i.key === key ? { ...i, quantity: Math.max(1, qty) } : i,
      );
    if (side === "offered") setOffered(update);
    else setRequested(update);
  };

  const handleSend = async () => {
    if (!recipient.trim()) {
      onError("Enter a recipient name");
      return;
    }
    if (offered.length === 0 && requested.length === 0) {
      onError("Add at least one item");
      return;
    }
    setSending(true);
    onError("");
    try {
      await createBarterOffer({
        recipientName: recipient.trim(),
        message: message.trim() || undefined,
        parentOfferId: prefill?.parentOfferId,
        offeredItems: offered.map((i) => ({
          itemType: i.itemType,
          itemId: i.itemId,
          quantity: i.quantity,
        })),
        requestedItems: requested.map((i) => ({
          itemType: i.itemType,
          itemId: i.itemId,
          quantity: i.quantity,
        })),
      });
      setRecipient("");
      setMessage("");
      setOffered([]);
      setRequested([]);
      onSent();
    } catch (err: any) {
      onError(err.response?.data?.error || "Failed to send offer");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {prefill && (
        <div
          style={{
            fontSize: 11,
            color: "var(--yellow)",
            marginBottom: 6,
            padding: "4px 6px",
            background: "rgba(255,200,0,0.08)",
            borderRadius: 4,
          }}
        >
          Counter-offer — modify terms below
        </div>
      )}

      {/* Recipient */}
      <div style={{ marginBottom: 6 }}>
        <label
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            display: "block",
            marginBottom: 2,
          }}
        >
          TO
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Player name"
          disabled={!!prefill}
          style={{
            width: "100%",
            padding: "4px 6px",
            fontSize: 13,
            background: "var(--bg-input, #1a1a2e)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: 3,
          }}
        />
      </div>

      {/* Message */}
      <div style={{ marginBottom: 8 }}>
        <label
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            display: "block",
            marginBottom: 2,
          }}
        >
          MESSAGE (optional)
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. I want 10 cyrillium for this upgrade"
          maxLength={200}
          style={{
            width: "100%",
            padding: "4px 6px",
            fontSize: 12,
            background: "var(--bg-input, #1a1a2e)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: 3,
          }}
        />
      </div>

      {/* Two columns */}
      <div style={{ display: "flex", gap: 8 }}>
        <ItemColumn
          title="YOU OFFER"
          titleColor="var(--green)"
          items={offered}
          assets={assets}
          side="offered"
          onAdd={(item) => addItem("offered", item)}
          onRemove={(key) => removeItem("offered", key)}
          onUpdateQty={(key, qty) => updateQty("offered", key, qty)}
          showOwnedAssets
        />
        <ItemColumn
          title="YOU REQUEST"
          titleColor="var(--orange)"
          items={requested}
          assets={assets}
          side="requested"
          onAdd={(item) => addItem("requested", item)}
          onRemove={(key) => removeItem("requested", key)}
          onUpdateQty={(key, qty) => updateQty("requested", key, qty)}
          showOwnedAssets={false}
        />
      </div>

      {/* Send button */}
      <button
        className="btn-sm btn-buy"
        onClick={handleSend}
        disabled={sending || (offered.length === 0 && requested.length === 0)}
        style={{ marginTop: 8, width: "100%", fontSize: 13, padding: "6px 0" }}
      >
        {sending ? "SENDING..." : prefill ? "SEND COUNTER-OFFER" : "SEND OFFER"}
      </button>
    </div>
  );
}

// ─── Item Column ─────────────────────────────────────────────────────

function ItemColumn({
  title,
  titleColor,
  items,
  assets,
  side: _side,
  onAdd,
  onRemove,
  onUpdateQty,
  showOwnedAssets,
}: {
  title: string;
  titleColor: string;
  items: DraftItem[];
  assets: TradeableAssets | null;
  side: "offered" | "requested";
  onAdd: (item: DraftItem) => void;
  onRemove: (key: string) => void;
  onUpdateQty: (key: string, qty: number) => void;
  showOwnedAssets: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<string>("");

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 11,
          color: titleColor,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 4,
          borderBottom: `1px solid ${titleColor}33`,
          paddingBottom: 2,
        }}
      >
        {title}
      </div>

      {/* Item list */}
      {items.length === 0 && (
        <div style={{ fontSize: 11, color: "#555", padding: "4px 0" }}>
          No items added
        </div>
      )}
      {items.map((item) => (
        <div
          key={item.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 0",
            fontSize: 12,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              flex: 1,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </span>
          {item.itemType !== "tablet" &&
            item.itemType !== "planet" &&
            item.itemType !== "upgrade" && (
              <input
                type="number"
                value={item.quantity}
                min={1}
                max={item.maxQty || 999999}
                onChange={(e) =>
                  onUpdateQty(item.key, parseInt(e.target.value) || 1)
                }
                style={{
                  width: 55,
                  padding: "2px 4px",
                  fontSize: 12,
                  background: "var(--bg-input, #1a1a2e)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: 2,
                  textAlign: "right",
                }}
              />
            )}
          <button
            onClick={() => onRemove(item.key)}
            style={{
              background: "none",
              border: "none",
              color: "var(--red, #f55)",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 2px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}

      {/* Add item button */}
      {!pickerOpen ? (
        <button
          onClick={() => setPickerOpen(true)}
          style={{
            marginTop: 4,
            background: "none",
            border: "1px dashed var(--border)",
            color: "#888",
            cursor: "pointer",
            width: "100%",
            padding: "4px 0",
            fontSize: 12,
            borderRadius: 3,
          }}
        >
          + Add Item
        </button>
      ) : (
        <ItemPicker
          assets={assets}
          showOwned={showOwnedAssets}
          pickerType={pickerType}
          setPickerType={setPickerType}
          existingItems={items}
          onSelect={(item) => {
            onAdd(item);
            setPickerOpen(false);
            setPickerType("");
          }}
          onCancel={() => {
            setPickerOpen(false);
            setPickerType("");
          }}
        />
      )}
    </div>
  );
}

// ─── Item Picker ─────────────────────────────────────────────────────

const ITEM_CATEGORIES = [
  { type: "credits", label: "Credits" },
  { type: "resource", label: "Resources" },
  { type: "cargo", label: "Ship Cargo" },
  { type: "tablet", label: "Tablets" },
  { type: "planet", label: "Planets" },
  { type: "upgrade", label: "Upgrades" },
];

function ItemPicker({
  assets,
  showOwned,
  pickerType,
  setPickerType,
  existingItems,
  onSelect,
  onCancel,
}: {
  assets: TradeableAssets | null;
  showOwned: boolean;
  pickerType: string;
  setPickerType: (t: string) => void;
  existingItems: DraftItem[];
  onSelect: (item: DraftItem) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [manualType, setManualType] = useState("");

  if (!pickerType) {
    return (
      <div
        style={{
          marginTop: 4,
          padding: 4,
          border: "1px solid var(--border)",
          borderRadius: 3,
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
          Select category:
        </div>
        {ITEM_CATEGORIES.map((cat) => (
          <button
            key={cat.type}
            onClick={() => {
              setPickerType(cat.type);
              setQty(1);
              setManualType("");
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "3px 6px",
              fontSize: 12,
              background: "none",
              border: "none",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            {cat.label}
          </button>
        ))}
        <button
          onClick={onCancel}
          style={{
            marginTop: 4,
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  const confirmItem = (
    itemType: string,
    itemId: string | undefined,
    label: string,
    maxQty?: number,
  ) => {
    onSelect({
      key: crypto.randomUUID(),
      itemType,
      itemId,
      quantity: qty,
      label,
      maxQty,
    });
  };

  return (
    <div
      style={{
        marginTop: 4,
        padding: 4,
        border: "1px solid var(--border)",
        borderRadius: 3,
        background: "rgba(0,0,0,0.3)",
        maxHeight: 200,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 11, color: "var(--cyan)" }}>
          {ITEM_CATEGORIES.find((c) => c.type === pickerType)?.label}
        </span>
        <button
          onClick={() => setPickerType("")}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          Back
        </button>
      </div>

      {pickerType === "credits" && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="number"
            value={qty}
            min={1}
            onChange={(e) => setQty(parseInt(e.target.value) || 1)}
            placeholder="Amount"
            style={{
              flex: 1,
              padding: "3px 6px",
              fontSize: 12,
              background: "var(--bg-input, #1a1a2e)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: 2,
            }}
          />
          {showOwned && assets && (
            <span style={{ fontSize: 11, color: "#666" }}>
              have: {assets.credits.toLocaleString()}
            </span>
          )}
          <button
            className="btn-sm btn-buy"
            onClick={() => confirmItem("credits", undefined, `${qty} credits`)}
            disabled={existingItems.some((i) => i.itemType === "credits")}
          >
            ADD
          </button>
        </div>
      )}

      {pickerType === "resource" && (
        <>
          {showOwned && assets ? (
            assets.resources.length === 0 ? (
              <div style={{ fontSize: 11, color: "#555" }}>No resources</div>
            ) : (
              assets.resources
                .filter(
                  (r) =>
                    !existingItems.some(
                      (e) => e.itemType === "resource" && e.itemId === r.id,
                    ),
                )
                .map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      padding: "2px 0",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: "var(--text-primary)",
                      }}
                    >
                      {r.name}
                      <span style={{ color: "#666", marginLeft: 4 }}>
                        ({r.quantity})
                      </span>
                    </span>
                    <input
                      type="number"
                      defaultValue={1}
                      min={1}
                      max={r.quantity}
                      onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                      style={{
                        width: 50,
                        padding: "2px 4px",
                        fontSize: 12,
                        background: "var(--bg-input, #1a1a2e)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                        borderRadius: 2,
                        textAlign: "right",
                      }}
                    />
                    <button
                      className="btn-sm btn-buy"
                      onClick={() =>
                        confirmItem("resource", r.id, r.name, r.quantity)
                      }
                    >
                      ADD
                    </button>
                  </div>
                ))
            )
          ) : (
            /* For "requested" side — manual input */
            <div>
              <input
                type="text"
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
                placeholder="Resource name (e.g. cyrillium)"
                style={{
                  width: "100%",
                  padding: "3px 6px",
                  fontSize: 12,
                  marginBottom: 4,
                  background: "var(--bg-input, #1a1a2e)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: 2,
                }}
              />
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="number"
                  value={qty}
                  min={1}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  style={{
                    flex: 1,
                    padding: "3px 6px",
                    fontSize: 12,
                    background: "var(--bg-input, #1a1a2e)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: 2,
                    textAlign: "right",
                  }}
                />
                <button
                  className="btn-sm btn-buy"
                  onClick={() => {
                    if (manualType.trim())
                      confirmItem(
                        "resource",
                        manualType.trim().toLowerCase().replace(/\s+/g, "_"),
                        manualType.trim(),
                      );
                  }}
                  disabled={!manualType.trim()}
                >
                  ADD
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {pickerType === "cargo" && (
        <>
          {showOwned && assets ? (
            assets.cargo.length === 0 ? (
              <div style={{ fontSize: 11, color: "#555" }}>No cargo</div>
            ) : (
              assets.cargo
                .filter(
                  (c) =>
                    !existingItems.some(
                      (e) => e.itemType === "cargo" && e.itemId === c.commodity,
                    ),
                )
                .map((c) => (
                  <div
                    key={c.commodity}
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      padding: "2px 0",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: "var(--text-primary)",
                        textTransform: "capitalize",
                      }}
                    >
                      {c.commodity}
                      <span style={{ color: "#666", marginLeft: 4 }}>
                        ({c.quantity})
                      </span>
                    </span>
                    <input
                      type="number"
                      defaultValue={1}
                      min={1}
                      max={c.quantity}
                      onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                      style={{
                        width: 50,
                        padding: "2px 4px",
                        fontSize: 12,
                        background: "var(--bg-input, #1a1a2e)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                        borderRadius: 2,
                        textAlign: "right",
                      }}
                    />
                    <button
                      className="btn-sm btn-buy"
                      onClick={() =>
                        confirmItem(
                          "cargo",
                          c.commodity,
                          c.commodity,
                          c.quantity,
                        )
                      }
                    >
                      ADD
                    </button>
                  </div>
                ))
            )
          ) : (
            ["cyrillium", "food", "tech"]
              .filter(
                (c) =>
                  !existingItems.some(
                    (e) => e.itemType === "cargo" && e.itemId === c,
                  ),
              )
              .map((c) => (
                <div
                  key={c}
                  style={{
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    padding: "2px 0",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: "var(--text-primary)",
                      textTransform: "capitalize",
                    }}
                  >
                    {c}
                  </span>
                  <input
                    type="number"
                    defaultValue={1}
                    min={1}
                    onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                    style={{
                      width: 50,
                      padding: "2px 4px",
                      fontSize: 12,
                      background: "var(--bg-input, #1a1a2e)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: 2,
                      textAlign: "right",
                    }}
                  />
                  <button
                    className="btn-sm btn-buy"
                    onClick={() => confirmItem("cargo", c, c)}
                  >
                    ADD
                  </button>
                </div>
              ))
          )}
        </>
      )}

      {pickerType === "tablet" && (
        <>
          {showOwned && assets ? (
            assets.tablets.length === 0 ? (
              <div style={{ fontSize: 11, color: "#555" }}>
                No unequipped tablets
              </div>
            ) : (
              assets.tablets
                .filter(
                  (t) =>
                    !existingItems.some(
                      (e) => e.itemType === "tablet" && e.itemId === t.id,
                    ),
                )
                .map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      padding: "2px 0",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: "var(--text-primary)",
                      }}
                    >
                      {t.name}
                      <span
                        style={{ color: "#888", marginLeft: 4, fontSize: 11 }}
                      >
                        [{t.rarity}]
                      </span>
                    </span>
                    <button
                      className="btn-sm btn-buy"
                      onClick={() =>
                        confirmItem("tablet", t.id, `${t.name} [${t.rarity}]`)
                      }
                    >
                      ADD
                    </button>
                  </div>
                ))
            )
          ) : (
            <div style={{ fontSize: 11, color: "#888" }}>
              Specify tablets by name in a message — the sender needs to add
              them.
            </div>
          )}
        </>
      )}

      {pickerType === "planet" && (
        <>
          {showOwned && assets ? (
            assets.planets.length === 0 ? (
              <div style={{ fontSize: 11, color: "#555" }}>
                No owned planets
              </div>
            ) : (
              assets.planets
                .filter(
                  (p) =>
                    !existingItems.some(
                      (e) => e.itemType === "planet" && e.itemId === p.id,
                    ),
                )
                .map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      padding: "2px 0",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: "var(--text-primary)",
                      }}
                    >
                      {p.name}
                      <span
                        style={{ color: "#888", marginLeft: 4, fontSize: 11 }}
                      >
                        Class {p.class} · Sec {p.sectorId}
                      </span>
                    </span>
                    <button
                      className="btn-sm btn-buy"
                      onClick={() =>
                        confirmItem("planet", p.id, `${p.name} (${p.class})`)
                      }
                    >
                      ADD
                    </button>
                  </div>
                ))
            )
          ) : (
            <div style={{ fontSize: 11, color: "#888" }}>
              Specify planets by name in a message — the sender needs to add
              them.
            </div>
          )}
        </>
      )}

      {pickerType === "upgrade" && (
        <>
          {showOwned && assets ? (
            assets.upgrades.length === 0 ? (
              <div style={{ fontSize: 11, color: "#555" }}>
                No upgrades in inventory
              </div>
            ) : (
              assets.upgrades
                .filter(
                  (u) =>
                    !existingItems.some(
                      (e) => e.itemType === "upgrade" && e.itemId === u.id,
                    ),
                )
                .map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      padding: "2px 0",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: "var(--text-primary)",
                      }}
                    >
                      {u.typeName}
                      <span
                        style={{ color: "#888", marginLeft: 4, fontSize: 11 }}
                      >
                        [{u.slot}]
                      </span>
                    </span>
                    <button
                      className="btn-sm btn-buy"
                      onClick={() =>
                        confirmItem(
                          "upgrade",
                          u.id,
                          `${u.typeName} [${u.slot}]`,
                        )
                      }
                    >
                      ADD
                    </button>
                  </div>
                ))
            )
          ) : (
            <div style={{ fontSize: 11, color: "#888" }}>
              Specify upgrades by name in a message — the sender needs to add
              them.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Incoming Tab ────────────────────────────────────────────────────

function IncomingTab({
  offers,
  busy,
  onAccept,
  onReject,
  onCounter,
}: {
  offers: BarterOffer[];
  busy: string | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCounter: (offer: BarterOffer) => void;
}) {
  if (offers.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "#555", padding: "8px 0" }}>
        No incoming trade offers.
      </div>
    );
  }

  return (
    <>
      {offers.map((o) => (
        <div
          key={o.id}
          style={{
            padding: "6px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--cyan)" }}>
              From: {o.senderName}
            </span>
            <span style={{ fontSize: 11, color: "#666" }}>
              {timeRemaining(o.expiresAt)}
            </span>
          </div>

          {o.message && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                fontStyle: "italic",
                margin: "2px 0",
              }}
            >
              &quot;{o.message}&quot;
            </div>
          )}

          <div
            style={{ display: "flex", gap: 8, margin: "4px 0", fontSize: 12 }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ color: "var(--green)", fontSize: 11 }}>
                OFFERS:{" "}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                {o.offeredItems.length > 0
                  ? formatItemList(o.offeredItems)
                  : "nothing"}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ color: "var(--orange)", fontSize: 11 }}>
                WANTS:{" "}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                {o.requestedItems.length > 0
                  ? formatItemList(o.requestedItems)
                  : "nothing"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <button
              className="btn-sm btn-buy"
              disabled={busy === o.id}
              onClick={() => onAccept(o.id)}
            >
              {busy === o.id ? "..." : "ACCEPT"}
            </button>
            <button
              className="btn-sm"
              disabled={busy === o.id}
              onClick={() => onCounter(o)}
              style={{ color: "var(--yellow)", borderColor: "var(--yellow)" }}
            >
              COUNTER
            </button>
            <button
              className="btn-sm btn-sell"
              disabled={busy === o.id}
              onClick={() => onReject(o.id)}
            >
              {busy === o.id ? "..." : "REJECT"}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Outgoing Tab ────────────────────────────────────────────────────

function OutgoingTab({
  offers,
  busy,
  onCancel,
}: {
  offers: BarterOffer[];
  busy: string | null;
  onCancel: (id: string) => void;
}) {
  if (offers.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "#555", padding: "8px 0" }}>
        No outgoing trade offers.
      </div>
    );
  }

  return (
    <>
      {offers.map((o) => (
        <div
          key={o.id}
          style={{
            padding: "6px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--cyan)" }}>
              To: {o.recipientName}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 11,
                  padding: "1px 6px",
                  borderRadius: 3,
                  background:
                    o.status === "pending"
                      ? "rgba(0,255,0,0.1)"
                      : o.status === "countered"
                        ? "rgba(255,200,0,0.1)"
                        : "rgba(255,255,255,0.05)",
                  color:
                    o.status === "pending"
                      ? "var(--green)"
                      : o.status === "countered"
                        ? "var(--yellow)"
                        : "#888",
                }}
              >
                {o.status}
              </span>
              {o.status === "pending" && (
                <span style={{ fontSize: 11, color: "#666" }}>
                  {timeRemaining(o.expiresAt)}
                </span>
              )}
            </div>
          </div>

          {o.message && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                fontStyle: "italic",
                margin: "2px 0",
              }}
            >
              &quot;{o.message}&quot;
            </div>
          )}

          <div
            style={{ display: "flex", gap: 8, margin: "4px 0", fontSize: 12 }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ color: "var(--green)", fontSize: 11 }}>
                OFFERING:{" "}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                {o.offeredItems.length > 0
                  ? formatItemList(o.offeredItems)
                  : "nothing"}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ color: "var(--orange)", fontSize: 11 }}>
                REQUESTING:{" "}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                {o.requestedItems.length > 0
                  ? formatItemList(o.requestedItems)
                  : "nothing"}
              </span>
            </div>
          </div>

          {o.status === "pending" && (
            <button
              className="btn-sm"
              disabled={busy === o.id}
              onClick={() => onCancel(o.id)}
              style={{
                marginTop: 4,
                color: "var(--orange)",
                borderColor: "var(--orange)",
              }}
            >
              {busy === o.id ? "..." : "CANCEL"}
            </button>
          )}
        </div>
      ))}
    </>
  );
}
