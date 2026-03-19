import { useState, useEffect, useRef } from "react";
import {
  getCantina,
  buyCantineIntel,
  talkBartender,
  getCantinaDrinks,
  orderCantinaDrink,
  eavesdropCantina,
  checkCantinaEasterEgg,
  resolveCantinaEasterEgg,
} from "../services/api";
import { getEavesdropNarrationUrl } from "../config/narration-manifest";
import type { ToastType } from "../hooks/useToast";

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
  onDrink?: () => void;
  showToast?: (msg: string, type?: ToastType, duration?: number) => number;
  onStoryEvent?: (data: any) => void;
}

export default function MallCantinaTab({
  credits,
  onAction,
  onDrink,
  showToast,
  onStoryEvent,
}: Props) {
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

  // Easter egg: track drink order
  const drinkHistoryRef = useRef<string[]>([]);
  const [drifterActive, setDrifterActive] = useState(false);

  // Eavesdrop state
  const [eavesdropLines, setEavesdropLines] = useState<EavesdropLine[]>([]);
  const [eavesdropHint, setEavesdropHint] = useState<string | null>(null);
  const [revealedLines, setRevealedLines] = useState(0);
  const [eavesdropActive, setEavesdropActive] = useState(false);
  const eavesdropTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const eavesdropAudio = useRef<HTMLAudioElement | null>(null);

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

  const handleOrderDrink = async (
    drinkId: string,
    drinkName: string,
    drinkPrice: number,
  ) => {
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
      onDrink?.();
      showToast?.(`${drinkName} — ${drinkPrice} cr`, "info", 3000);

      // Easter egg: track drink sequence
      drinkHistoryRef.current = [...drinkHistoryRef.current, drinkId];
      const newHistory = drinkHistoryRef.current;

      if (newHistory.length >= 3 && !drifterActive) {
        try {
          const { data: egg } = await checkCantinaEasterEgg(newHistory);
          if (egg.triggered) {
            setDrifterActive(true);
            triggerDrifterEncounter(egg.changeCost);
          }
        } catch (eggErr: any) {
          console.error(
            "[Cantina Easter Egg] check failed:",
            eggErr?.response?.data || eggErr?.message,
          );
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to order drink");
    } finally {
      setBusy(false);
    }
  };

  const triggerDrifterEncounter = (changeCost: number) => {
    if (!onStoryEvent) return;

    const speech = [
      "A disheveled figure slides onto the stool next to you. His flight suit is patched with duct tape and what might be dried food paste. He smells like engine coolant and regret.",
      "",
      "\"Hey... hey buddy. You drinking the grog too? Hah. I can tell. You got that look. That's how it starts, you know. The grog. Then the stout. Then you're ordering quantum cocktails at 3 AM wondering if the drink is good or bad and realizing it doesn't matter because YOU'RE the one who's collapsing into a probability cloud.\"",
      "",
      "He stares into a glass that appears to be empty.",
      "",
      "\"I used to be somebody, you know. Had a Battleship. A BATTLESHIP. The ISS Regrettable Decision. Beautiful ship. Thirty-two gun ports. Full cyrillium plating. You know what happened? I bet it. ALL of it. On a cargo race to Sector 4000. 'It's a sure thing,' they said. 'Nobody runs that route,' they said.\"",
      "",
      "He pauses to drink from the empty glass.",
      "",
      '"Turns out EVERYBODY runs that route. I came in dead last. Behind a guy in a DODGE POD. A dodge pod! Those things don\'t even have engines, they just sort of... drift aggressively. Lost the ship. Lost the cargo. Lost my crew. My first mate — lovely woman, four arms, could rewire a hyperdrive while making lunch — she left me for the dodge pod guy. THE DODGE POD GUY."',
      "",
      "He signals the bartender, who pointedly ignores him.",
      "",
      "\"Then I tried mining. Asteroid mining, they said, good honest work. So I'm out there in the belt with a pickaxe — a PICKAXE, because I sold my mining laser for grog money — and I hit this rock and it cracks open and there's this... this THING inside. Glowing. Pulsing. Beautiful. I thought I'd found a Precursor artifact. You know what it was? A fluorescent space mushroom. Worthless. Well, not ENTIRELY worthless. I ate it. Things got... weird for a while. I think I was the captain of a trading syndicate for about six hours. Or I hallucinated it. Hard to tell.\"",
      "",
      "He leans uncomfortably close.",
      "",
      "\"The point is... the POINT is... what was the point? Oh right. Don't mix the grog with the stout with the quantum cocktail. That's the combination that got me kicked off Station Twelve. And Station Thirteen. And that one station that doesn't have a number, just a skull painted on the airlock. Even THEY kicked me out. Said I was 'lowering the tone.' At a SKULL STATION.\"",
      "",
      "His eyes go glassy for a moment.",
      "",
      "\"Anyway that's how I ended up homeless. Living in the cargo hold of an abandoned freighter. It's not so bad. The rats and I have an understanding. They get the left side, I get the right side, and we don't talk about what happened in the engine room.\"",
      "",
      "He turns to you with watery eyes.",
      "",
      `"Hey... you got ${changeCost} credits? Just... just some change? I swear I won't spend it on grog. I mean I WILL spend it on grog, but I appreciate the honesty of admitting that upfront, you know?"`,
    ].join("\n");

    onStoryEvent({
      category: "lore_reveal",
      priority: "blocking",
      duration: 0,
      dismissable: false,
      title: "A FAMILIAR STRANGER",
      subtitle: "The Drifter",
      body: speech,
      narrationUrl: "/audio/narration/easter_egg_drifter.mp3",
      actions: [
        {
          label: `Give him ${changeCost} credits`,
          id: "give_change",
        },
        {
          label: "Walk away",
          id: "refuse",
        },
      ],
      onAction: async (actionId: string) => {
        const gaveChange = actionId === "give_change";
        try {
          await resolveCantinaEasterEgg(gaveChange);
          onAction();
          if (gaveChange) {
            showToast?.(
              "The Drifter grins and stumbles away humming.",
              "info",
              5000,
            );
          } else {
            showToast?.(
              'The Drifter shrugs. "Fair enough. Fair enough."',
              "info",
              5000,
            );
          }
        } catch (resolveErr: any) {
          console.error(
            "[Cantina Easter Egg] resolve failed:",
            resolveErr?.response?.data || resolveErr?.message,
          );
        }
      },
    });
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
      // Play eavesdrop narration if available
      const narrationUrl = getEavesdropNarrationUrl(result.convoIndex);
      if (narrationUrl) {
        if (eavesdropAudio.current) {
          eavesdropAudio.current.pause();
        }
        eavesdropAudio.current = new Audio(narrationUrl);
        eavesdropAudio.current.volume = 0.9;
        eavesdropAudio.current.play().catch(() => {});
      }
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
                  onClick={() =>
                    handleOrderDrink(drink.id, drink.name, drink.price)
                  }
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
