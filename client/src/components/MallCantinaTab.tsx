import { useState, useEffect, useRef } from "react";
import {
  getCantina,
  buyCantineIntel,
  talkBartender,
  getCantinaDrinks,
  orderCantinaDrink,
  eavesdropCantina,
} from "../services/api";

interface CantinaData {
  rumor?: string;
  intelCost?: number;
  bartenderAvailable?: boolean;
}

interface IntelData {
  richOutposts: { name: string; sectorId: number; treasury: number }[];
  topPlanets: {
    name: string;
    sectorId: number;
    colonists: number;
    planetClass: string;
  }[];
  dangerousSectors: number[];
  message?: string;
}

interface DrinkItem {
  id: string;
  name: string;
  price: number;
  description: string;
  effect: string;
}

interface EavesdropLine {
  speaker: string;
  text: string;
}

type CantinaView = "bar" | "drinks" | "eavesdrop" | "intel";

interface Props {
  credits: number;
  onAction: () => void;
}

export default function MallCantinaTab({ credits, onAction }: Props) {
  const [data, setData] = useState<CantinaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<CantinaView>("bar");

  // Bar state
  const [dialogueResult, setDialogueResult] = useState<any>(null);

  // Intel state
  const [intelResult, setIntelResult] = useState<IntelData | null>(null);
  const [intelMessage, setIntelMessage] = useState<string | null>(null);

  // Drinks state
  const [drinks, setDrinks] = useState<DrinkItem[]>([]);
  const [drinkResult, setDrinkResult] = useState<{
    drink: string;
    serveLine: string;
    effect: string;
  } | null>(null);

  // Eavesdrop state
  const [eavesdropLines, setEavesdropLines] = useState<EavesdropLine[]>([]);
  const [eavesdropHint, setEavesdropHint] = useState<string | null>(null);
  const [revealedLines, setRevealedLines] = useState(0);
  const [eavesdropActive, setEavesdropActive] = useState(false);
  const eavesdropTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getCantina()
      .then(({ data: d }) => setData(d))
      .catch(() => setError("Failed to load cantina"))
      .finally(() => setLoading(false));
  }, []);

  // Load drinks when switching to drinks view
  useEffect(() => {
    if (view === "drinks" && drinks.length === 0) {
      getCantinaDrinks()
        .then(({ data: d }) => setDrinks(d.drinks))
        .catch(() => setError("Failed to load drink menu"));
    }
  }, [view, drinks.length]);

  // Cleanup eavesdrop timer
  useEffect(() => {
    return () => {
      if (eavesdropTimer.current) clearInterval(eavesdropTimer.current);
    };
  }, []);

  const handleBuyIntel = async () => {
    setBusy(true);
    setError("");
    setIntelResult(null);
    setIntelMessage(null);
    try {
      const { data: result } = await buyCantineIntel();
      if (result.intel && typeof result.intel === "object") {
        setIntelResult(result.intel);
      }
      setIntelMessage(result.message || null);
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to buy intel");
    } finally {
      setBusy(false);
    }
  };

  const handleTalkBartender = async () => {
    setBusy(true);
    setError("");
    setDialogueResult(null);
    try {
      const { data: result } = await talkBartender();
      setDialogueResult(result);
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.error || "Bartender is busy");
    } finally {
      setBusy(false);
    }
  };

  const handleOrderDrink = async (drinkId: string) => {
    setBusy(true);
    setError("");
    setDrinkResult(null);
    try {
      const { data: result } = await orderCantinaDrink(drinkId);
      setDrinkResult({
        drink: result.drink,
        serveLine: result.serveLine,
        effect: result.effect,
      });
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to order drink");
    } finally {
      setBusy(false);
    }
  };

  const handleEavesdrop = async () => {
    setBusy(true);
    setError("");
    setEavesdropLines([]);
    setEavesdropHint(null);
    setRevealedLines(0);
    setEavesdropActive(true);
    try {
      const { data: result } = await eavesdropCantina();
      setEavesdropLines(result.lines);
      setEavesdropHint(result.hint);
      // Reveal lines one at a time
      let count = 0;
      if (eavesdropTimer.current) clearInterval(eavesdropTimer.current);
      eavesdropTimer.current = setInterval(() => {
        count++;
        setRevealedLines(count);
        if (count >= result.lines.length) {
          if (eavesdropTimer.current) clearInterval(eavesdropTimer.current);
          eavesdropTimer.current = null;
        }
      }, 1800);
    } catch (err: any) {
      setError(err.response?.data?.error || "Nothing interesting happening");
      setEavesdropActive(false);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-muted">Loading cantina...</div>;

  return (
    <div className="cantina">
      {/* Ambient header */}
      <div className="cantina-header">
        <div className="cantina-header__ambiance">
          <span className="cantina-neon">CANTINA</span>
          <span className="cantina-subtitle">
            Dim lights. Murmured conversations. The clink of glasses.
          </span>
        </div>
      </div>

      {error && <div className="mall-error">{error}</div>}

      {/* Navigation tabs */}
      <div className="cantina-nav">
        {(
          [
            ["bar", "Bar"],
            ["drinks", "Drinks"],
            ["eavesdrop", "Eavesdrop"],
            ["intel", "Intel"],
          ] as [CantinaView, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={`cantina-nav__tab${view === key ? " cantina-nav__tab--active" : ""}`}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Rumor of the day — always visible */}
      {data?.rumor && (
        <div className="cantina-rumor">
          <span className="cantina-rumor__label">RUMOR:</span> {data.rumor}
        </div>
      )}

      {/* === BAR VIEW === */}
      {view === "bar" && (
        <div className="cantina-view">
          <div className="cantina-scene-text">
            You slide onto a stool at the bar. The bartender — a weathered
            figure with cybernetic eyes — gives you a measured look.
          </div>
          <div className="cantina-actions">
            {data?.bartenderAvailable !== false && (
              <button
                className="btn-sm btn-primary"
                disabled={busy}
                onClick={handleTalkBartender}
              >
                TALK TO BARTENDER
              </button>
            )}
          </div>
          {dialogueResult && (
            <div className="cantina-dialogue">
              <div className="cantina-dialogue__speaker">BARTENDER</div>
              <div className="cantina-dialogue__text">
                {dialogueResult.dialogue ||
                  dialogueResult.message ||
                  "The bartender nods."}
              </div>
              {dialogueResult.mission && (
                <div className="cantina-mission">
                  <span className="text-warning">
                    Mission offered: {dialogueResult.mission.title}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === DRINKS VIEW === */}
      {view === "drinks" && (
        <div className="cantina-view">
          <div className="cantina-scene-text">
            The drink menu glows softly on a holographic display behind the bar.
            Each glass is mixed to order.
          </div>
          <div className="cantina-drink-menu">
            {drinks.map((drink) => (
              <div key={drink.id} className="cantina-drink-card">
                <div className="cantina-drink-card__header">
                  <span className="cantina-drink-card__name">{drink.name}</span>
                  <span className="cantina-drink-card__price">
                    {drink.price} cr
                  </span>
                </div>
                <div className="cantina-drink-card__desc">
                  {drink.description}
                </div>
                <div className="cantina-drink-card__effect">{drink.effect}</div>
                <button
                  className="btn-sm btn-buy cantina-drink-card__btn"
                  disabled={busy || credits < drink.price}
                  onClick={() => handleOrderDrink(drink.id)}
                >
                  ORDER
                </button>
              </div>
            ))}
          </div>
          {drinkResult && (
            <div className="cantina-drink-result">
              <div className="cantina-drink-result__serve">
                {drinkResult.serveLine}
              </div>
              <div className="cantina-drink-result__effect">
                {drinkResult.effect}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === EAVESDROP VIEW === */}
      {view === "eavesdrop" && (
        <div className="cantina-view">
          <div className="cantina-scene-text">
            You lean back and tune into the conversations drifting through the
            haze. Two figures at a nearby booth are deep in discussion...
          </div>
          {!eavesdropActive && eavesdropLines.length === 0 && (
            <button
              className="btn-sm btn-primary"
              disabled={busy}
              onClick={handleEavesdrop}
            >
              LISTEN IN
            </button>
          )}
          {eavesdropLines.length > 0 && (
            <div className="cantina-eavesdrop">
              {eavesdropLines.slice(0, revealedLines).map((line, i) => (
                <div
                  key={i}
                  className={`cantina-eavesdrop__line cantina-eavesdrop__line--${i % 2 === 0 ? "left" : "right"}`}
                >
                  <span className="cantina-eavesdrop__speaker">
                    {line.speaker}
                  </span>
                  <span className="cantina-eavesdrop__text">
                    &ldquo;{line.text}&rdquo;
                  </span>
                </div>
              ))}
              {revealedLines >= eavesdropLines.length && eavesdropHint && (
                <div className="cantina-eavesdrop__hint">
                  <span className="cantina-eavesdrop__hint-label">
                    INTEL GATHERED:
                  </span>{" "}
                  {eavesdropHint}
                </div>
              )}
              {revealedLines >= eavesdropLines.length && (
                <button
                  className="btn-sm btn-primary"
                  style={{ marginTop: 8 }}
                  disabled={busy}
                  onClick={handleEavesdrop}
                >
                  LISTEN TO ANOTHER
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* === INTEL VIEW === */}
      {view === "intel" && (
        <div className="cantina-view">
          <div className="cantina-scene-text">
            The bartender slides a data chip across the counter. &ldquo;Sector
            intel. Fresh. {data?.intelCost ?? 500} credits.&rdquo;
          </div>
          <div className="cantina-actions">
            <button
              className="btn-sm btn-buy"
              disabled={
                busy || (data?.intelCost != null && credits < data.intelCost)
              }
              onClick={handleBuyIntel}
            >
              BUY INTEL ({data?.intelCost ?? 500} cr)
            </button>
          </div>
          {intelMessage && (
            <div className="cantina-result">
              <span className="cantina-result__label">INTEL:</span>{" "}
              {intelMessage}
            </div>
          )}
          {intelResult && (
            <div className="cantina-intel">
              {intelResult.richOutposts?.length > 0 && (
                <div className="cantina-intel__section">
                  <div className="cantina-intel__title">WEALTHY OUTPOSTS</div>
                  {intelResult.richOutposts.map((o, i) => (
                    <div key={i} className="cantina-intel__row">
                      <span>{o.name}</span>
                      <span className="text-muted">
                        Sector {o.sectorId} —{" "}
                        {Number(o.treasury).toLocaleString()} cr
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {intelResult.topPlanets?.length > 0 && (
                <div className="cantina-intel__section">
                  <div className="cantina-intel__title">POPULATED PLANETS</div>
                  {intelResult.topPlanets.map((p, i) => (
                    <div key={i} className="cantina-intel__row">
                      <span>
                        {p.name}{" "}
                        <span className="text-muted">[{p.planetClass}]</span>
                      </span>
                      <span className="text-muted">
                        Sector {p.sectorId} —{" "}
                        {Number(p.colonists).toLocaleString()} pop
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {intelResult.dangerousSectors?.length > 0 && (
                <div className="cantina-intel__section">
                  <div className="cantina-intel__title">COMBAT HOTSPOTS</div>
                  <div className="cantina-intel__row">
                    <span>
                      Sectors: {intelResult.dangerousSectors.join(", ")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
