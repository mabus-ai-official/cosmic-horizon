import { useState, useEffect } from "react";
import {
  talkToNPC,
  getNPCVendor,
  buyFromNPCVendor,
  getFactionReps,
} from "../services/api";

interface DialogueOption {
  text: string;
  index: number;
}

interface DialogueState {
  npcName: string;
  npcTitle?: string;
  dialogue: string;
  options: DialogueOption[];
  reputationChange?: number;
  missionOffer?: { id: string; title: string; description: string };
  ended?: boolean;
}

interface VendorItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  available: boolean;
  requiredFame?: number;
  currentFame?: number;
}

interface Props {
  npcId: string;
  npcName: string;
  npcTitle?: string;
  onClose: () => void;
  onAction?: () => void;
}

export default function NPCDialogueView({
  npcId,
  npcName,
  npcTitle,
  onClose,
  onAction,
}: Props) {
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showShop, setShowShop] = useState(false);
  const [vendorItems, setVendorItems] = useState<VendorItem[]>([]);
  const [shopBusy, setShopBusy] = useState(false);
  const [shopError, setShopError] = useState("");
  const [shopSuccess, setShopSuccess] = useState("");
  const [factionReps, setFactionReps] = useState<
    Record<string, { fame: number; tier: string }>
  >({});

  const startDialogue = async (choiceIndex?: number) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await talkToNPC(npcId, choiceIndex);
      setDialogue({
        npcName: data.npcName || npcName,
        npcTitle: data.npcTitle || npcTitle,
        dialogue: data.dialogue || data.message || data.text || "",
        options: (data.options || data.choices || []).map(
          (opt: any, i: number) => ({
            text: typeof opt === "string" ? opt : opt.text || opt.label,
            index: typeof opt === "string" ? i : (opt.index ?? i),
          }),
        ),
        reputationChange: data.reputationChange,
        missionOffer: data.missionOffer || data.mission,
        ended: data.ended || data.conversationEnded,
      });
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to talk to NPC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startDialogue();
  }, [npcId]);

  const handleChoice = (index: number) => {
    startDialogue(index);
  };

  const openShop = async () => {
    setShowShop(true);
    setShopBusy(true);
    setShopError("");
    setShopSuccess("");
    try {
      const [vendorRes, repRes] = await Promise.all([
        getNPCVendor(npcId),
        getFactionReps().catch(() => ({ data: { factions: [] } })),
      ]);
      setVendorItems(vendorRes.data.items || []);
      const repMap: Record<string, { fame: number; tier: string }> = {};
      for (const f of repRes.data.factions || []) {
        repMap[f.factionName] = { fame: f.fame, tier: f.tier };
      }
      setFactionReps(repMap);
    } catch (err: any) {
      setShopError(err.response?.data?.error || "Failed to load vendor items");
    } finally {
      setShopBusy(false);
    }
  };
  void openShop;

  const handleBuy = async (itemId: string) => {
    setShopBusy(true);
    setShopError("");
    setShopSuccess("");
    try {
      await buyFromNPCVendor(npcId, itemId);
      setShopSuccess("Purchase successful!");
      const { data } = await getNPCVendor(npcId);
      setVendorItems(data.items || []);
      onAction?.();
    } catch (err: any) {
      setShopError(err.response?.data?.error || "Purchase failed");
    } finally {
      setShopBusy(false);
    }
  };

  const closeShop = () => {
    setShowShop(false);
    setShopError("");
    setShopSuccess("");
  };

  if (showShop) {
    return (
      <div className="npc-dialogue">
        <div className="npc-dialogue__header">
          <div className="npc-dialogue__name">{npcName} — Shop</div>
          {npcTitle && <div className="npc-dialogue__title">{npcTitle}</div>}
        </div>
        {Object.keys(factionReps).length > 0 && (
          <div className="npc-faction-reps">
            {Object.entries(factionReps).map(([name, rep]) => (
              <div key={name} className="npc-faction-rep-row">
                <span className="npc-faction-rep-row__name">{name}</span>
                <span
                  className="npc-faction-rep-row__tier"
                  style={{
                    color:
                      rep.tier === "Neutral"
                        ? "var(--text-muted)"
                        : rep.fame > 0
                          ? "var(--green)"
                          : "var(--text-secondary)",
                  }}
                >
                  [{rep.tier}]
                </span>
                <span className="npc-faction-rep-row__fame">
                  {rep.fame} fame
                </span>
              </div>
            ))}
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              Earn fame by talking to NPCs, completing missions, and trading
            </div>
          </div>
        )}
        {shopError && <div className="mall-error">{shopError}</div>}
        {shopSuccess && (
          <div
            className="text-success"
            style={{ fontSize: "11px", marginBottom: "4px" }}
          >
            {shopSuccess}
          </div>
        )}
        {shopBusy && vendorItems.length === 0 && (
          <div className="text-muted">Loading...</div>
        )}
        <div className="npc-vendor-list">
          {vendorItems.map((item) => (
            <div
              key={item.id}
              className={`npc-vendor-item${!item.available ? " npc-vendor-item--locked" : ""}`}
            >
              <div>
                <span className="npc-vendor-item__name">{item.name}</span>
                <span className="npc-vendor-item__price">
                  {" "}
                  — {item.price} credits
                </span>
                {item.description && (
                  <div className="text-muted" style={{ fontSize: "11px" }}>
                    {item.description}
                  </div>
                )}
                {!item.available && item.requiredFame != null && (
                  <div className="npc-vendor-item__fame-req">
                    <span style={{ color: "var(--red)" }}>
                      Requires {item.requiredFame} fame
                    </span>
                    {item.currentFame != null && (
                      <>
                        <div
                          className="fame-progress-bar"
                          style={{ marginTop: 3 }}
                        >
                          <div
                            className="fame-progress-bar__fill"
                            style={{
                              width: `${Math.min(100, (item.currentFame / item.requiredFame) * 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {item.currentFame}/{item.requiredFame}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              {item.available ? (
                <button
                  className="btn-sm btn-buy"
                  disabled={shopBusy}
                  onClick={() => handleBuy(item.id)}
                >
                  BUY
                </button>
              ) : (
                <span className="text-muted" style={{ fontSize: "11px" }}>
                  Locked
                </span>
              )}
            </div>
          ))}
        </div>
        <button
          className="btn-sm"
          onClick={closeShop}
          style={{
            marginTop: "8px",
            color: "var(--text-secondary)",
            borderColor: "var(--text-secondary)",
          }}
        >
          [Back to dialogue]
        </button>
      </div>
    );
  }

  return (
    <div className="npc-dialogue">
      <div className="npc-dialogue__header">
        <div className="npc-dialogue__name">{npcName}</div>
        {npcTitle && <div className="npc-dialogue__title">{npcTitle}</div>}
      </div>
      {error && <div className="mall-error">{error}</div>}
      {loading && <div className="text-muted">...</div>}
      {dialogue && !loading && (
        <>
          <div className="npc-dialogue__text">{dialogue.dialogue}</div>
          {dialogue.reputationChange != null &&
            dialogue.reputationChange !== 0 && (
              <div
                className={
                  dialogue.reputationChange > 0 ? "text-success" : "text-error"
                }
                style={{ fontSize: "11px", marginTop: "4px" }}
              >
                Reputation {dialogue.reputationChange > 0 ? "+" : ""}
                {dialogue.reputationChange}
              </div>
            )}
          {dialogue.missionOffer && (
            <div className="npc-dialogue__mission">
              <span className="text-warning">
                Mission: {dialogue.missionOffer.title}
              </span>
              {dialogue.missionOffer.description && (
                <div className="text-muted" style={{ fontSize: "11px" }}>
                  {dialogue.missionOffer.description}
                </div>
              )}
            </div>
          )}
          <div className="npc-dialogue__options">
            {dialogue.options.map((opt) => (
              <button
                key={opt.index}
                className="npc-dialogue__option"
                onClick={() => handleChoice(opt.index)}
              >
                {opt.text}
              </button>
            ))}
            {/* Vendor shop hidden until vendor items have working use effects */}
          </div>
        </>
      )}
      {(dialogue?.ended ||
        (dialogue && dialogue.options.length === 0 && !loading)) && (
        <button
          className="btn-sm"
          onClick={onClose}
          style={{
            marginTop: "8px",
            color: "var(--text-secondary)",
            borderColor: "var(--text-secondary)",
          }}
        >
          [End conversation]
        </button>
      )}
      {!dialogue?.ended && dialogue && dialogue.options.length > 0 && (
        <button
          className="btn-sm"
          onClick={onClose}
          style={{
            marginTop: "8px",
            color: "var(--text-muted)",
            borderColor: "var(--text-muted)",
          }}
        >
          [Leave]
        </button>
      )}
    </div>
  );
}
