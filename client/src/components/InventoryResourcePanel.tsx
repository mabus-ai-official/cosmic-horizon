import { useState, useEffect } from "react";
import PixelSprite from "./PixelSprite";
import {
  getInventory,
  getPlayerResources,
  useStoreItem,
  deploy,
} from "../services/api";

interface InventoryItem {
  itemId: string;
  name: string;
  category: "consumable" | "deployable" | "equipment" | string;
  quantity: number;
}

interface PlayerResource {
  resourceId: string;
  name: string;
  quantity: number;
  tier?: number;
  category?: string;
}

type LineType =
  | "info"
  | "success"
  | "error"
  | "warning"
  | "system"
  | "combat"
  | "trade";

// Items that require a target player to use
const TARGET_ITEMS = new Set(["disruptor_torpedo"]);

interface Props {
  refreshKey?: number;
  onAddLine?: (text: string, type?: LineType) => void;
  onRefreshStatus?: () => void;
  colonistsByRace?: { race: string; count: number }[];
  sectorPlayers?: { id: string; username: string }[];
  playerId?: string;
}

type TabView = "items" | "resources" | "colonists";

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

// Item descriptions for tooltips
const ITEM_HINTS: Record<string, string> = {
  // Consumables
  probe: "Reveals contents of a non-adjacent sector.",
  disruptor_torpedo: "Disables target ship engines for 5 minutes.",
  rache_device:
    "Self-destruct device. Deals massive damage to all ships in sector.",
  cloaking_cell: "Single-use cloak. Lasts until you fire weapons or dock.",
  fuel_cell: "Restores 50 energy points.",
  scanner_probe: "Reveals all planets in your current sector.",
  // Deployables
  mine_halberd: "Explodes on contact, dealing heavy damage.",
  mine_barnacle: "Attaches to ships, draining engine energy over time.",
  drone_offensive: "Attacks hostile ships entering the sector.",
  drone_defensive: "Protects your ships and planets in the sector.",
  drone_toll: "Charges passing ships a toll to traverse the sector.",
  buoy: "Navigation marker visible to all. Logs visitors.",
  // Equipment
  jump_drive: "Instant travel to any explored sector (high energy cost).",
  pgd: "Allows your ship to tow planets between sectors.",
  planetary_scanner: "Reveals planet details in adjacent sectors.",
  // Vendor items
  spore_communicator: "Contact NPCs remotely across sectors.",
  spore_shield: "Absorbs one lethal hit, then breaks.",
  mycelial_navigator: "Reveals hidden warp routes in current sector.",
  crystal_focus_lens: "Boosts weapon accuracy by 15%.",
  resonance_amplifier: "Amplifies scanner range by 2 sectors.",
  mineral_hull_plating: "Reduces incoming damage by 20%.",
  siege_cannon: "+50% damage to deployables and stations.",
  stealth_coating: "Reduces detection range by other players.",
  cargo_optimizer: "Increases cargo capacity by 25%.",
  contraband_scanner: "Detects hidden cargo on other ships.",
  forged_manifest: "Disguises illegal cargo during scans.",
  tracking_module: "Tracks a player's sector for 30 minutes.",
  field_repair_kit: "Restores 30 ship health in the field.",
  overcharge_capacitor: "Next weapon volley deals double damage.",
};

// Resource descriptions for tooltips
const RESOURCE_HINTS: Record<string, string> = {
  cyrillium: "Common metallic ore. Used in most crafting recipes.",
  food: "Organic sustenance for crew and colonists.",
  tech: "Tech components for advanced crafting.",
  bio_fiber: "Organic fiber from hospitable worlds.",
  fertile_soil: "Nutrient-rich soil for agriculture.",
  silica_glass: "Heat-forged glass from desert worlds.",
  solar_crystal: "Energy-storing crystal from sun-baked deserts.",
  bio_extract: "Organic extract from ocean life.",
  coral_alloy: "Hardened coral composite from ocean floors.",
  resonite_ore: "Vibration-sensitive ore from alpine peaks.",
  wind_essence: "Compressed atmospheric energy from high altitudes.",
  cryo_compound: "Supercooled chemical compound from frozen worlds.",
  frost_lattice: "Crystalline ice structure with unique properties.",
  magma_crystal: "Forged in volcanic heat, extremely durable.",
  obsidian_plate: "Volcanic glass plating, razor-sharp edges.",
  plasma_vapor: "Ionized gas harvested from gas giants.",
  nebula_dust: "Rare particles from gas giant atmospheres.",
  genome_fragment: "Genetic material from seed worlds.",
  spore_culture: "Living spore samples with unique properties.",
  dark_matter_shard: "Ultra-rare, immensely valuable.",
  cryo_fossil: "Ancient specimen preserved in eternal ice.",
  ion_crystal: "Charged crystal from gas giant storms.",
  leviathan_pearl: "Formed in deep ocean trenches over millennia.",
  artifact_fragment: "Remnant of an ancient civilization.",
  harmonic_resonator: "Vibrates at frequencies that bend space.",
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  consumable: { label: "CONSUMABLES", color: "#3fb950" },
  deployable: { label: "DEPLOYABLES", color: "#f0883e" },
  equipment: { label: "EQUIPMENT", color: "#58a6ff" },
};

const RESOURCE_CATEGORY_LABELS: Record<
  string,
  { label: string; color: string }
> = {
  base: { label: "BASE MATERIALS", color: "#6e7681" },
  planet_unique: { label: "PLANET RESOURCES", color: "#56d4dd" },
  processed: { label: "PROCESSED", color: "#3fb950" },
  refined: { label: "REFINED", color: "#58a6ff" },
  trade_good: { label: "TRADE GOODS", color: "#d29922" },
  ultra_rare: { label: "ULTRA-RARE", color: "#f0883e" },
};

export default function InventoryResourcePanel({
  refreshKey,
  onAddLine,
  onRefreshStatus,
  colonistsByRace,
  sectorPlayers,
  playerId,
}: Props) {
  const [tab, setTab] = useState<TabView>("items");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [resources, setResources] = useState<PlayerResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingItem, setUsingItem] = useState<string | null>(null);
  const [targetPicker, setTargetPicker] = useState<{
    itemId: string;
    players: { id: string; username: string }[];
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getInventory()
        .then(({ data }) => setItems(data.inventory || []))
        .catch(() => setItems([])),
      getPlayerResources()
        .then(({ data }) => setResources(data.resources || []))
        .catch(() => setResources([])),
    ]).finally(() => setLoading(false));
  }, [refreshKey]);

  const handleUse = async (item: InventoryItem, targetPlayerId?: string) => {
    // If item needs a target and we don't have one, show picker
    if (TARGET_ITEMS.has(item.itemId) && !targetPlayerId) {
      const otherPlayers = (sectorPlayers || []).filter(
        (p) => p.id !== playerId,
      );
      if (otherPlayers.length === 0) {
        onAddLine?.("No targets in this sector", "error");
        return;
      }
      setTargetPicker({ itemId: item.itemId, players: otherPlayers });
      return;
    }

    setUsingItem(item.itemId);
    setTargetPicker(null);
    try {
      if (item.category === "deployable") {
        await deploy(item.itemId);
        onAddLine?.(`Deployed ${item.name}`, "success");
      } else {
        const body = targetPlayerId ? { targetPlayerId } : undefined;
        const { data: useData } = await useStoreItem(item.itemId, body);
        if (useData.message) {
          onAddLine?.(useData.message, "success");
        } else {
          onAddLine?.(`Used ${item.name}`, "success");
        }
        // Extra feedback for specific items
        if (useData.targetPlayer) {
          onAddLine?.(
            `Disruptor torpedo hit ${useData.targetPlayer}! Engines disabled for 5 minutes.`,
            "combat",
          );
        }
        if (useData.cloaked) {
          onAddLine?.("Cloaking device activated.", "success");
        }
        if (useData.planets && !useData.sectorId) {
          for (const p of useData.planets) {
            const owner = p.owner ? ` (${p.owner})` : "";
            onAddLine?.(
              `  ${p.name} [${p.class}] pop:${p.population}${owner}`,
              "info",
            );
          }
        }
        if (useData.shipsHit) {
          for (const hit of useData.shipsHit) {
            onAddLine?.(
              `  ${hit.player}: ${hit.damage} dmg${hit.destroyed ? " [DESTROYED]" : ""}`,
              "combat",
            );
          }
        }
      }
      onRefreshStatus?.();
      const { data } = await getInventory();
      setItems(data.inventory || []);
    } catch (err: any) {
      onAddLine?.(
        err.response?.data?.error || `Failed to use ${item.name}`,
        "error",
      );
    } finally {
      setUsingItem(null);
    }
  };

  // Group items by category
  const groupedByCategory: Record<string, InventoryItem[]> = {};
  for (const item of items) {
    const cat = item.category || "unknown";
    if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
    groupedByCategory[cat].push(item);
  }

  // Group resources by category
  const groupedResources: Record<string, PlayerResource[]> = {};
  for (const r of resources) {
    const key = r.category || "base";
    if (!groupedResources[key]) groupedResources[key] = [];
    groupedResources[key].push(r);
  }

  // Order categories
  const categoryOrder = ["consumable", "deployable", "equipment"];
  const resourceCategoryOrder = [
    "base",
    "planet_unique",
    "processed",
    "refined",
    "trade_good",
    "ultra_rare",
  ];

  if (loading) {
    return (
      <div className="panel-content">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  const totalItems = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const colonists = colonistsByRace?.filter((r) => r.count > 0) || [];
  const totalColonists = colonists.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="panel-content">
      <div className="group-panel-tabs">
        <span
          onClick={() => setTab("items")}
          style={{
            cursor: "pointer",
            color: tab === "items" ? "#0f0" : "#666",
          }}
        >
          {tab === "items"
            ? `[Items (${totalItems})]`
            : `Items (${totalItems})`}
        </span>
        <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
        <span
          onClick={() => setTab("resources")}
          style={{
            cursor: "pointer",
            color: tab === "resources" ? "#0f0" : "#666",
          }}
        >
          {tab === "resources"
            ? `[Resources (${resources.length})]`
            : `Resources (${resources.length})`}
        </span>
        <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
        <span
          onClick={() => setTab("colonists")}
          style={{
            cursor: "pointer",
            color: tab === "colonists" ? "#0f0" : "#666",
          }}
        >
          {tab === "colonists"
            ? `[Colonists (${totalColonists})]`
            : `Colonists (${totalColonists})`}
        </span>
      </div>

      {tab === "items" && (
        <>
          {items.length === 0 ? (
            <div className="text-muted" style={{ marginTop: 8 }}>
              No items. Buy items at Star Mall stores.
            </div>
          ) : (
            <div className="inventory-list">
              {categoryOrder.map((cat) => {
                const catItems = groupedByCategory[cat];
                if (!catItems || catItems.length === 0) return null;
                const info = CATEGORY_LABELS[cat] || {
                  label: cat.toUpperCase(),
                  color: "#6e7681",
                };
                return (
                  <div key={cat}>
                    <div
                      style={{
                        fontSize: "9px",
                        color: info.color,
                        letterSpacing: "1px",
                        padding: "6px 0 2px",
                        borderBottom: `1px solid ${info.color}33`,
                        marginBottom: 2,
                      }}
                    >
                      {info.label}
                    </div>
                    {catItems.map((item) => {
                      const hint = ITEM_HINTS[item.itemId];
                      const actionLabel =
                        item.category === "deployable" ? "DEPLOY" : "USE";
                      const showPicker = targetPicker?.itemId === item.itemId;
                      return (
                        <div key={item.itemId}>
                          <div
                            className="inventory-item"
                            title={hint}
                            style={{ cursor: hint ? "help" : undefined }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="inventory-item__name">
                                <PixelSprite
                                  spriteKey={`item_${item.itemId}`}
                                  size={16}
                                />
                                {item.name}
                                {item.quantity > 1 && (
                                  <span className="inventory-item__count">
                                    {" "}
                                    x{item.quantity}
                                  </span>
                                )}
                              </div>
                              {hint && (
                                <div
                                  style={{
                                    fontSize: "9px",
                                    color: "#6e7681",
                                    paddingLeft: 20,
                                    marginTop: 1,
                                  }}
                                >
                                  {hint}
                                </div>
                              )}
                            </div>
                            {item.category !== "equipment" && (
                              <button
                                className="btn-sm btn-use"
                                onClick={() =>
                                  showPicker
                                    ? setTargetPicker(null)
                                    : handleUse(item)
                                }
                                disabled={usingItem === item.itemId}
                                style={{ flexShrink: 0 }}
                              >
                                {usingItem === item.itemId
                                  ? "..."
                                  : showPicker
                                    ? "CANCEL"
                                    : actionLabel}
                              </button>
                            )}
                          </div>
                          {showPicker && (
                            <div
                              style={{
                                padding: "4px 0 4px 20px",
                                borderLeft: "2px solid #f85149",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#f85149",
                                  marginBottom: 3,
                                }}
                              >
                                SELECT TARGET:
                              </div>
                              {targetPicker.players.map((p) => (
                                <div
                                  key={p.id}
                                  onClick={() => handleUse(item, p.id)}
                                  style={{
                                    cursor: "pointer",
                                    padding: "2px 6px",
                                    fontSize: "11px",
                                    color: "#f0883e",
                                    borderBottom: "1px solid #21262d",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "#21262d")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                      "transparent")
                                  }
                                >
                                  {p.username}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "resources" && (
        <>
          {resources.length === 0 ? (
            <div className="text-muted" style={{ marginTop: 8 }}>
              No resources collected. Harvest from planets or collect in space.
            </div>
          ) : (
            <div className="inventory-list">
              {resourceCategoryOrder.map((cat) => {
                const catResources = groupedResources[cat];
                if (!catResources || catResources.length === 0) return null;
                const info = RESOURCE_CATEGORY_LABELS[cat] || {
                  label: cat.toUpperCase(),
                  color: "#6e7681",
                };
                return (
                  <div key={cat}>
                    <div
                      style={{
                        fontSize: "9px",
                        color: info.color,
                        letterSpacing: "1px",
                        padding: "6px 0 2px",
                        borderBottom: `1px solid ${info.color}33`,
                        marginBottom: 2,
                      }}
                    >
                      {info.label}
                    </div>
                    {catResources.map((r) => {
                      const hint =
                        RESOURCE_HINTS[
                          r.resourceId ||
                            r.name.toLowerCase().replace(/ /g, "_")
                        ];
                      return (
                        <div
                          key={r.resourceId || r.name}
                          className="inventory-item"
                          title={hint}
                          style={{ cursor: hint ? "help" : undefined }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className="inventory-item__name">
                              {r.name}
                            </span>
                            {hint && (
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#6e7681",
                                  marginTop: 1,
                                }}
                              >
                                {hint}
                              </div>
                            )}
                          </div>
                          <span
                            className="inventory-item__qty"
                            style={{ color: info.color }}
                          >
                            x{r.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "colonists" && (
        <>
          {totalColonists === 0 ? (
            <div className="text-muted" style={{ marginTop: 8 }}>
              No colonists aboard. Collect colonists from seed planets.
            </div>
          ) : (
            <div className="inventory-list">
              <div
                style={{
                  fontSize: "9px",
                  color: "#c084fc",
                  letterSpacing: "1px",
                  padding: "6px 0 2px",
                  borderBottom: "1px solid #c084fc33",
                  marginBottom: 2,
                }}
              >
                COLONISTS ABOARD
              </div>
              {colonists.map((r) => (
                <div key={r.race} className="inventory-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      className="inventory-item__name"
                      style={{ color: RACE_COLORS[r.race] || "#aaa" }}
                    >
                      {RACE_LABELS[r.race] || r.race}
                    </span>
                  </div>
                  <span
                    className="inventory-item__qty"
                    style={{ color: RACE_COLORS[r.race] || "#aaa" }}
                  >
                    {r.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
