/**
 * useGameEffects — all useEffect hooks extracted from Game.tsx.
 * Manages side effects: socket listeners, mood/audio sync, story progression,
 * daily missions, tutorial detection, and ARIA triggers.
 */
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import {
  getDailyMissions,
  getStoryRecap,
  acceptRandomEvent as apiAcceptRandomEvent,
  declineRandomEvent as apiDeclineRandomEvent,
  submitStoryChoice,
  submitFactionChoice,
  rescueMerchantBuy,
  npcEncounterBuy,
  tarriBuy,
} from "../services/api";
import {
  getAlliances,
  getSyndicate,
  getPendingAlliances,
} from "../services/api";
import {
  FIRST_TIME_EVENTS,
  hasSeenFirstTime,
  markFirstTimeSeen,
} from "../config/first-time-events";
import {
  STORY_NUDGES,
  ACT_OPENINGS,
  ACT_COMPLETIONS,
} from "../config/story-interstitials";
import {
  getNarrationUrl,
  getPhaseNarrationUrl,
  getChoiceNarrationUrl,
  getActCompletionNarrationUrl,
  TUTORIAL_WELCOME_NARRATION,
} from "../config/narration-manifest";
import {
  buildIdleSpaceScene,
  buildIdleOutpostScene,
  buildIdleDockedScene,
} from "../config/scenes/ambient-scenes";
import { buildCombatScene } from "../config/scenes/combat-scene";
import { buildDestroyedScene } from "../config/scenes/destroyed-scene";
import { buildMallInteriorScene } from "../config/scenes/mall-interior-scene";
import type { ChatMessage } from "../components/SectorChatPanel";

let chatIdCounter = 10000;

/** Story act gate thresholds for single-player mode. */
const SP_ACT_GATES = [
  { gate: 5, act: 1 },
  { gate: 10, act: 2 },
  { gate: 15, act: 3 },
  { gate: 20, act: 4 },
];
const SP_ACT_STARTS = [
  { start: 1, act: 1 },
  { start: 6, act: 2 },
  { start: 11, act: 3 },
  { start: 16, act: 4 },
];
/** Story act gate thresholds for multiplayer mode. */
const MP_ACT_GATES = [
  { gate: 20, act: 1 },
  { gate: 40, act: 2 },
  { gate: 60, act: 3 },
  { gate: 80, act: 4 },
];
const MP_ACT_STARTS = [
  { start: 1, act: 1 },
  { start: 21, act: 2 },
  { start: 41, act: 3 },
  { start: 61, act: 4 },
];

interface UseGameEffectsParams {
  game: any;
  on: (
    event: string,
    handler: (...args: any[]) => void,
  ) => (() => void) | undefined;
  audio: any;
  aria: any;
  mood: any;
  activePanel: string;
  selectPanel: (id: any) => void;
  incrementBadge: (id: any) => void;
  showToast: (msg: string, type: any, duration?: number) => any;
  eventOverlay: any;
  narration: {
    playNarration: (url: string) => void;
    narrationEnabled: boolean;
  };
  onLogout?: () => void;
}

export function useGameEffects({
  game,
  on,
  audio,
  aria,
  mood,
  activePanel,
  selectPanel,
  incrementBadge,
  showToast,
  eventOverlay,
  narration: _narration,
}: UseGameEffectsParams) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPostTutorialScene, setShowPostTutorialScene] = useState(false);
  const [combatFlash, setCombatFlash] = useState(false);
  const [combatShake, setCombatShake] = useState(false);
  const [merchantFlash, setMerchantFlash] = useState(false);
  const [eventFlash, setEventFlash] = useState(false);
  const [encounterFlash, setEncounterFlash] = useState(false);
  const [tradeFlash, setTradeFlash] = useState(false);

  /** Trigger a vignette flash by type. Duration matches CSS animation. */
  const triggerFlash = useCallback(
    (type: "combat" | "merchant" | "event" | "encounter" | "trade") => {
      const setters: Record<string, (v: boolean) => void> = {
        combat: setCombatFlash,
        merchant: setMerchantFlash,
        event: setEventFlash,
        encounter: setEncounterFlash,
        trade: setTradeFlash,
      };
      const durations: Record<string, number> = {
        combat: 2500,
        merchant: 1300,
        event: 1900,
        encounter: 1300,
        trade: 1300,
      };
      const setter = setters[type];
      if (!setter) return;
      setter(true);
      setTimeout(() => setter(false), durations[type]);
    },
    [],
  );
  const [showSPComplete, setShowSPComplete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showArcade, setShowArcade] = useState(false);
  const [alliedPlayerIds, setAlliedPlayerIds] = useState<string[]>([]);
  const [pendingAllianceIds, setPendingAllianceIds] = useState<
    { fromId: string; fromName: string }[]
  >([]);
  const [hasSyndicate, setHasSyndicate] = useState(false);
  const [syndicateInfo, setSyndicateInfo] = useState<{
    name: string;
    role: string;
  } | null>(null);
  const [hasAlliance, setHasAlliance] = useState(false);
  const [crewInitialTab, setCrewInitialTab] = useState<
    "players" | "npcs" | "contacts" | undefined
  >(undefined);
  const [autoTalkNpcId, setAutoTalkNpcId] = useState<string | null>(null);
  const [map3D, setMap3D] = useState(true);
  const [commodityFilter, setCommodityFilter] = useState<any>(null);

  const lastSectorRef = useRef<number | null>(null);
  const lastListingRef = useRef<{ id: string; label: string }[] | null>(null);
  const activePanelRef = useRef(activePanel);
  activePanelRef.current = activePanel;
  const prevResourceSectorRef = useRef<number | null>(null);
  const prevLevelRef = useRef(game.player?.level ?? 0);
  const dailyFetched = useRef(false);
  const storyNudgeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStoryAction = useRef(Date.now());
  const lastNudge = useRef(0);
  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const prevMissionsCompleted = useRef<number | null>(null);
  const prevSectorRef = useRef(game.player?.currentSectorId);
  const prevDockedRef = useRef(game.player?.dockedAtOutpostId);
  const hostileFanfareSectorRef = useRef<number | null>(null);

  const ARIA_MILESTONE_CATEGORIES = useMemo(
    () =>
      new Set([
        "level_up",
        "story_act",
        "faction_rankup",
        "first_time",
        "mission_complete",
      ]),
    [],
  );

  // ARIA integration: trigger milestone comment when significant overlays appear
  useEffect(() => {
    if (
      eventOverlay.currentEvent &&
      ARIA_MILESTONE_CATEGORIES.has(eventOverlay.currentEvent.category)
    ) {
      aria.triggerMilestone();
    }
  }, [eventOverlay.currentEvent?.id]);

  // Ambient scene — determines the idle viewport background based on location
  const ambientScene = useMemo(() => {
    const ctx = {
      shipTypeId: game.player?.currentShip?.shipTypeId ?? "scout",
      sectorType: game.sector?.type,
      planetClasses: game.sector?.planets?.map((p: any) => p.planetClass) ?? [],
      playerCount: game.sector?.players?.length ?? 0,
      sectorId: game.sector?.sectorId,
    };
    if (game.player?.dockedAtOutpostId) {
      if (game.sector?.hasStarMall) {
        return buildMallInteriorScene();
      }
      return buildIdleDockedScene(ctx);
    }
    if ((game.sector?.outposts?.length ?? 0) > 0) {
      return buildIdleOutpostScene(ctx);
    }
    return buildIdleSpaceScene(ctx);
  }, [
    game.player?.dockedAtOutpostId,
    game.sector?.hasStarMall,
    game.sector?.outposts?.length,
    game.player?.currentShip?.shipTypeId,
    game.sector?.sectorId,
    game.sector?.type,
    game.sector?.planets?.length,
    game.sector?.players?.length,
  ]);

  // Clear chat when changing sectors
  useEffect(() => {
    if (
      game.player?.currentSectorId &&
      game.player.currentSectorId !== lastSectorRef.current
    ) {
      const isFirstMove = lastSectorRef.current !== null;
      lastSectorRef.current = game.player.currentSectorId;
      setChatMessages([]);
      aria.triggerMove();
      if (isFirstMove && !hasSeenFirstTime("first_explore")) {
        markFirstTimeSeen("first_explore");
        const ft = FIRST_TIME_EVENTS.explore;
        eventOverlay.enqueueEvent({
          category: "first_time",
          title: ft.title,
          subtitle: ft.subtitle,
          body: ft.body,
          colorScheme: ft.colorScheme,
          duration: ft.duration,
        });
      }
    }
  }, [game.player?.currentSectorId]);

  // Hostile contact fanfare — red flash + overlay when entering a sector with other players
  useEffect(() => {
    const sectorId = game.sector?.sectorId ?? null;
    const players = game.sector?.players ?? [];
    if (
      sectorId &&
      players.length > 0 &&
      hostileFanfareSectorRef.current !== sectorId
    ) {
      hostileFanfareSectorRef.current = sectorId;
      setCombatFlash(true);
      setTimeout(() => setCombatFlash(false), 2500);
      mood.onCombatStart();
      eventOverlay.enqueueEvent({
        category: "hostile_contact",
        title: "HOSTILE CONTACT",
        subtitle: `${players.length} ship${players.length > 1 ? "s" : ""} detected`,
        body: "Weapons ready. Engage or evade.",
        colorScheme: "red",
        duration: 3000,
        priority: "interstitial",
      });
      selectPanel("combat");
    }
  }, [game.sector?.sectorId, game.sector?.players?.length]);

  // Resource event overlay when entering a new sector with events
  useEffect(() => {
    const sectorId = game.sector?.sectorId ?? null;
    const events = game.sector?.events ?? [];
    if (
      sectorId &&
      prevResourceSectorRef.current !== null &&
      sectorId !== prevResourceSectorRef.current &&
      events.length > 0
    ) {
      const EVENT_INFO: Record<string, { label: string; description: string }> =
        {
          asteroid_field: {
            label: "Asteroid Field Detected",
            description: "Rich mineral deposits drift through this sector.",
          },
          derelict: {
            label: "Derelict Vessel Found",
            description: "An abandoned ship floats silently nearby.",
          },
          anomaly: {
            label: "Spatial Anomaly Detected",
            description:
              "Strange energy readings emanate from an unstable region of space.",
          },
          alien_cache: {
            label: "Alien Cache Located",
            description: "A guarded alien structure has been detected.",
          },
        };
      const evList = events.map((e: any) => {
        const info = EVENT_INFO[e.eventType] ?? {
          label: e.eventType.replace(/_/g, " ").toUpperCase(),
          description: "Something unusual has been detected.",
        };
        return info.label;
      });
      eventOverlay.enqueueEvent({
        category: "resource_discovery",
        title: "DISCOVERY",
        subtitle: evList.join(", "),
        body: events
          .map(
            (e: any) =>
              EVENT_INFO[e.eventType]?.description ??
              "Something unusual has been detected.",
          )
          .join(" "),
        actions: [
          { id: "investigate", label: "INVESTIGATE", variant: "primary" },
        ],
        onAction: (actionId: string) => {
          if (actionId === "investigate") selectPanel("explore");
        },
      });
    }
    if (sectorId) {
      prevResourceSectorRef.current = sectorId;
    }
  }, [game.sector?.sectorId, game.sector?.events]);

  // Level-up detection
  useEffect(() => {
    const level = game.player?.level ?? 0;
    const rank = game.player?.rank ?? "";
    if (prevLevelRef.current > 0 && level > prevLevelRef.current) {
      eventOverlay.enqueueEvent({
        category: "level_up",
        title: "LEVEL UP!",
        subtitle: `${level}`,
        body: rank,
        colorScheme: "cyan",
      });
      game.addLine(`LEVEL UP! You are now level ${level} — ${rank}`, "success");
      showToast(`Level ${level} — ${rank}!`, "success", 8000);
      aria.triggerMilestone();
    }
    prevLevelRef.current = level;
  }, [game.player?.level, game.player?.rank]);

  // Daily missions overlay
  useEffect(() => {
    if (dailyFetched.current || !game.player) return;
    dailyFetched.current = true;
    const STORAGE_KEY = "coho_daily_missions_date";
    const REMINDER_LINES = [
      "Your daily orders are standing by, Commander.",
      "Unclaimed missions expire at midnight UTC. Don't leave credits on the table.",
      "The galaxy doesn't wait — daily objectives await your attention.",
      "Incoming transmission: daily missions ready for review, pilot.",
      "Fuel up, suit up — daily missions won't complete themselves.",
      "HQ reminds you: outstanding daily missions remain unclaimed.",
    ];
    const today = new Date().toISOString().slice(0, 10);
    const alreadyShownToday = localStorage.getItem(STORAGE_KEY) === today;

    getDailyMissions()
      .then(({ data }) => {
        const missions = data.missions || [];
        const hasUnclaimed = missions.some((m: any) => !m.claimed);
        if (missions.length === 0 || !hasUnclaimed) return;

        if (!alreadyShownToday) {
          localStorage.setItem(STORAGE_KEY, today);
          const completed = missions.filter(
            (m: any) => m.completed && !m.claimed,
          ).length;
          const totalXp = missions.reduce(
            (s: number, m: any) => s + m.xpReward,
            0,
          );
          const totalCredits = missions.reduce(
            (s: number, m: any) => s + m.creditReward,
            0,
          );
          eventOverlay.enqueueEvent({
            category: "daily_missions",
            title: "DAILY MISSIONS",
            subtitle:
              completed > 0
                ? `${completed} ready to claim!`
                : "New objectives available",
            body: (
              <div style={{ textAlign: "left" }}>
                {missions.map((m: any) => {
                  const pct = Math.min(
                    100,
                    Math.round((m.progress / m.target) * 100),
                  );
                  return (
                    <div
                      key={m.id}
                      style={{ marginBottom: 8, opacity: m.claimed ? 0.4 : 1 }}
                    >
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-primary)",
                          marginBottom: 4,
                        }}
                      >
                        {m.claimed ? "\u2713 " : m.completed ? "\u2605 " : ""}
                        {m.description}
                      </div>
                      <div
                        style={{
                          height: 4,
                          background: "var(--bg-tertiary)",
                          borderRadius: 2,
                          overflow: "hidden",
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background:
                              "linear-gradient(90deg, var(--cyan), var(--purple))",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.65rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span>
                          {m.progress}/{m.target}
                        </span>
                        <span>
                          +{m.xpReward} XP, +{m.creditReward} cr
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--yellow)",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Total: +{totalXp} XP, +{totalCredits} cr
                </div>
              </div>
            ),
            actions: [
              { id: "view", label: "VIEW MISSIONS [I]", variant: "primary" },
            ],
            onAction: (actionId: string) => {
              if (actionId === "view") selectPanel("missions");
            },
          });
        } else {
          const line =
            REMINDER_LINES[Math.floor(Math.random() * REMINDER_LINES.length)];
          showToast(line, "system", 6000);
        }
      })
      .catch(() => {});
  }, [game.player?.id]);

  // Idle story nudge system
  useEffect(() => {
    if (!game.player) return;
    lastStoryAction.current = Date.now();

    const IDLE_THRESHOLD = 30 * 60 * 1000;
    const NUDGE_COOLDOWN = 15 * 60 * 1000;

    storyNudgeTimer.current = setInterval(() => {
      const now = Date.now();
      const idle = now - lastStoryAction.current;
      const sinceLast = now - lastNudge.current;
      if (idle < IDLE_THRESHOLD || sinceLast < NUDGE_COOLDOWN) return;
      if (mood.currentMood === "tension") return;

      const isSP = game.player?.gameMode === "singleplayer";
      const completed = isSP
        ? (game.player?.spMissions?.completed ?? 0)
        : (game.player?.missionsCompleted ?? 0);
      let act = 0;
      if (isSP) {
        if (completed >= 16) act = 4;
        else if (completed >= 11) act = 3;
        else if (completed >= 6) act = 2;
        else if (completed >= 1) act = 1;
      } else {
        if (completed >= 61) act = 4;
        else if (completed >= 41) act = 3;
        else if (completed >= 21) act = 2;
        else if (completed >= 1) act = 1;
      }

      const pool = STORY_NUDGES[act] ?? STORY_NUDGES[0];
      if (!pool || pool.length === 0) return;
      const msg = pool[Math.floor(Math.random() * pool.length)];
      showToast(msg, "system", 8000);
      lastNudge.current = now;
    }, 60_000);

    return () => {
      if (storyNudgeTimer.current) clearInterval(storyNudgeTimer.current);
    };
  }, [game.player?.id]);

  // Reset story idle timer when visiting missions/crew panel
  useEffect(() => {
    if (activePanel === "missions" || activePanel === "crew") {
      lastStoryAction.current = Date.now();
    }
  }, [activePanel]);

  // Alliance/syndicate refresh helpers
  const refreshAlliances = useCallback(() => {
    getAlliances()
      .then(({ data }) => {
        setAlliedPlayerIds(
          (data.personalAllies || []).map((a: any) => a.allyId),
        );
        setHasAlliance((data.syndicateAllies || []).length > 0);
      })
      .catch(() => {});
    getPendingAlliances()
      .then(({ data }) => {
        setPendingAllianceIds(
          (data.pendingRequests || []).map((r: any) => ({
            fromId: r.fromId,
            fromName: r.fromName,
          })),
        );
      })
      .catch(() => {});
  }, []);

  const refreshSyndicateStatus = useCallback(() => {
    getSyndicate()
      .then(({ data }) => {
        setHasSyndicate(true);
        const playerId = game.player?.id;
        const myMember = data.members?.find((m: any) => m.id === playerId);
        setSyndicateInfo({ name: data.name, role: myMember?.role || "member" });
      })
      .catch(() => {
        setHasSyndicate(false);
        setSyndicateInfo(null);
      });
  }, [game.player?.id]);

  // Initial data load
  useEffect(() => {
    game.refreshStatus();
    game.refreshSector();
    game.refreshTutorial();
    game.refreshMap();
    refreshAlliances();
    refreshSyndicateStatus();
    getStoryRecap()
      .then(({ data }) => {
        if (data?.recap) {
          showToast(
            `Previously on Cosmic Horizon... ${data.recap}`,
            "system",
            8000,
          );
        }
      })
      .catch(() => {});
  }, []);

  // No-op: useActivePanel("nav") already initialises to nav.
  // Previously this called selectPanel("nav") which also unminimised the panel card.

  // Audio track switching based on game context
  useEffect(() => {
    if (!game.player) return;
    if (!game.player.hasSeenIntro) {
      audio.unmute();
      audio.play("intro");
    } else if (
      game.player.tutorialCompleted &&
      !game.player.hasSeenPostTutorial
    ) {
      audio.unmute();
      audio.play("post-tutorial");
    } else if (game.sector?.outposts?.length) {
      const hasStarMall = game.sector.outposts.length > 0;
      if (hasStarMall) {
        audio.play("starmall");
      } else {
        audio.play("gameplay");
      }
    } else {
      audio.play("gameplay");
    }
  }, [
    game.player?.hasSeenIntro,
    game.player?.hasSeenPostTutorial,
    game.player?.tutorialCompleted,
    game.sector?.sectorId,
  ]);

  // Sync mood engine to audio system
  useEffect(() => {
    const moodTracks = mood.getMoodTracks();
    audio.setMoodTracks(moodTracks.length > 0 ? moodTracks : null);
  }, [mood.currentMood]);

  useEffect(() => {
    audio.setVolumeMultiplier(mood.silenceState.volumeMultiplier);
  }, [mood.silenceState.volumeMultiplier]);

  // Multi-session sync: debounced refresh on sync:* events
  useEffect(() => {
    if (!game.player) return;

    function debouncedSync(key: string, fn: () => void) {
      if (syncTimers.current[key]) clearTimeout(syncTimers.current[key]);
      syncTimers.current[key] = setTimeout(fn, 300);
    }

    const syncUnsubs = [
      on("sync:status", () =>
        debouncedSync("status", () => {
          game.refreshStatus();
          setRefreshKey((k) => k + 1);
        }),
      ),
      on("sync:sector", () =>
        debouncedSync("sector", () => {
          game.refreshSector();
          setRefreshKey((k) => k + 1);
        }),
      ),
      on("sync:map", () => debouncedSync("map", game.refreshMap)),
      on("sync:full", () => {
        debouncedSync("status", () => {
          game.refreshStatus();
          setRefreshKey((k) => k + 1);
        });
        debouncedSync("sector", () => {
          game.refreshSector();
          setRefreshKey((k) => k + 1);
        });
        debouncedSync("map", game.refreshMap);
      }),
      on("syndicate:economy_update", () => setRefreshKey((k) => k + 1)),
      on("syndicate:project_completed", () => {
        setRefreshKey((k) => k + 1);
        showToast("A mega-project has been completed!", "success", 6000);
      }),
    ];

    return () => {
      syncUnsubs.forEach((unsub) => unsub?.());
      Object.values(syncTimers.current).forEach(clearTimeout);
      syncTimers.current = {};
    };
  }, [
    game.player?.id,
    on,
    game.refreshStatus,
    game.refreshSector,
    game.refreshMap,
    showToast,
  ]);

  // WebSocket event listeners
  useEffect(() => {
    if (!game.player) return;

    const unsubs = [
      on(
        "energy:update",
        (data: {
          energy: number;
          maxEnergy: number;
          weaponEnergy?: number;
          maxWeaponEnergy?: number;
        }) => {
          game.setPlayer((prev: any) => {
            if (!prev) return null;
            const updated = {
              ...prev,
              energy: data.energy,
              maxEnergy: data.maxEnergy,
            };
            if (data.weaponEnergy !== undefined && prev.currentShip) {
              updated.currentShip = {
                ...prev.currentShip,
                weaponEnergy: data.weaponEnergy,
              };
            }
            return updated;
          });
          if (data.energy <= data.maxEnergy * 0.15) {
            showToast(
              `Low energy: ${data.energy}/${data.maxEnergy}`,
              "warning",
              5000,
            );
          }
        },
      ),
      on("player:entered", (data: { username: string; sectorId: number }) => {
        game.addLine(`${data.username} has entered the sector`, "warning");
        game.refreshSector();
      }),
      on("player:left", (_data: { playerId: string }) => {
        game.refreshSector();
      }),
      on(
        "combat:volley",
        (data: {
          attackerName: string;
          damage: number;
          yourEnergyRemaining: number;
        }) => {
          game.addLine(
            `${data.attackerName} fired on you! ${data.damage} damage taken.`,
            "combat",
          );
          showToast(
            `${data.attackerName} hit you for ${data.damage} damage!`,
            "combat",
            5000,
          );
          game.refreshStatus();
          if (activePanelRef.current !== "combat") incrementBadge("combat");
          setCombatFlash(true);
          setCombatShake(true);
          setTimeout(() => setCombatFlash(false), 2500);
          setTimeout(() => setCombatShake(false), 400);
          mood.onCombatStart();
          aria.triggerCombat();
          game.enqueueScene(buildCombatScene("scout", data.damage));
          aria.triggerCombat();
          if (!hasSeenFirstTime("first_combat")) {
            markFirstTimeSeen("first_combat");
            const ft = FIRST_TIME_EVENTS.combat;
            eventOverlay.enqueueEvent({
              category: "first_time",
              title: ft.title,
              subtitle: ft.subtitle,
              body: ft.body,
              colorScheme: ft.colorScheme,
              duration: ft.duration,
            });
          }
        },
      ),
      on("combat-v2:session_start", () => {
        // Auto-open combat modal when attacked
        if (typeof (window as any).__openCombatV2 === "function") {
          (window as any).__openCombatV2();
        }
      }),
      on("combat:destroyed", (data: { destroyerName: string }) => {
        game.addLine(
          `Your ship was destroyed by ${data.destroyerName}!`,
          "error",
        );
        game.addLine("You ejected in a Dodge Pod.", "warning");
        showToast(`Ship destroyed by ${data.destroyerName}!`, "error", 6000);
        game.enqueueScene(
          buildDestroyedScene(game.player?.currentShip?.shipTypeId ?? "scout"),
        );
        game.refreshStatus();
      }),
      on(
        "chat:sector",
        (data: { senderId: string; senderName: string; message: string }) => {
          const isOwn = data.senderId === game.player?.id;
          if (isOwn) return;
          game.addLine(`[${data.senderName}] ${data.message}`, "info");
          setChatMessages((prev) => [
            ...prev.slice(-49),
            {
              id: chatIdCounter++,
              senderName: data.senderName,
              message: data.message,
              isOwn: false,
            },
          ]);
          if (activePanelRef.current !== "comms") incrementBadge("comms");
        },
      ),
      on(
        "chat:galaxy",
        (data: {
          senderId: string;
          senderName: string;
          message: string;
          fromDiscord?: boolean;
        }) => {
          const isOwn = data.senderId === game.player?.id;
          if (isOwn) return;
          setChatMessages((prev) => [
            ...prev.slice(-99),
            {
              id: chatIdCounter++,
              senderName: data.senderName,
              message: data.message,
              isOwn: false,
              channel: "galaxy",
              fromDiscord: data.fromDiscord,
            },
          ]);
          if (activePanelRef.current !== "comms") incrementBadge("comms");
        },
      ),
      on("notification", (data: { message: string }) => {
        game.addLine(data.message, "system");
        showToast(data.message, "system");
        if (activePanelRef.current !== "missions") incrementBadge("missions");
      }),
      on("alliance:request", (data: { fromName?: string }) => {
        refreshAlliances();
        showToast(
          data?.fromName
            ? `${data.fromName} wants to ally with you!`
            : "New alliance request received!",
          "system",
          6000,
        );
        if (activePanelRef.current !== "crew") incrementBadge("crew");
      }),
      on(
        "chat:syndicate",
        (data: { senderId: string; senderName: string; message: string }) => {
          const isOwn = data.senderId === game.player?.id;
          if (isOwn) return;
          setChatMessages((prev) => [
            ...prev.slice(-99),
            {
              id: chatIdCounter++,
              senderName: data.senderName,
              message: data.message,
              isOwn: false,
              channel: "syndicate",
            },
          ]);
          if (activePanelRef.current !== "comms") incrementBadge("comms");
        },
      ),
      on(
        "chat:alliance",
        (data: {
          senderId: string;
          senderName: string;
          syndicateName: string;
          message: string;
        }) => {
          const isOwn = data.senderId === game.player?.id;
          if (isOwn) return;
          setChatMessages((prev) => [
            ...prev.slice(-99),
            {
              id: chatIdCounter++,
              senderName: data.senderName,
              message: data.message,
              isOwn: false,
              channel: "alliance",
              syndicateName: data.syndicateName,
            },
          ]);
          if (activePanelRef.current !== "comms") incrementBadge("comms");
        },
      ),
      on("syndicate:member_joined", (data: { username: string }) => {
        game.addLine(`${data.username} joined the syndicate`, "system");
      }),
      on("syndicate:member_left", (data: { username: string }) => {
        game.addLine(`${data.username} left the syndicate`, "system");
      }),
      on(
        "syndicate:vote_created",
        (data: { type: string; description: string; proposedBy: string }) => {
          game.addLine(
            `New vote proposed: [${data.type}] ${data.description}`,
            "system",
          );
          if (activePanelRef.current !== "syndicate")
            incrementBadge("syndicate");
        },
      ),
      on("syndicate:vote_resolved", (data: { result: string }) => {
        game.addLine(`Vote resolved: ${data.result}`, "system");
      }),
      on(
        "achievement:unlocked",
        (data: {
          name: string;
          description: string;
          xpReward: number;
          creditReward: number;
        }) => {
          showToast(`Achievement: ${data.name}`, "achievement", 6000);
          game.addLine(
            `Achievement unlocked: ${data.name} — ${data.description}`,
            "success",
          );
          aria.triggerMilestone();
        },
      ),
      on(
        "mission:completed",
        (data: {
          missionId: string;
          title: string;
          type: string;
          rewardCredits: number;
          rewardXp: number;
          requiresClaim: boolean;
          isStory?: boolean;
          storyOrder?: number;
        }) => {
          if (data.isStory) {
            const storyOrder = data.storyOrder || 0;
            eventOverlay.enqueueEvent({
              category: "story_mission",
              title: "STORY QUEST COMPLETE",
              subtitle: data.title,
              body: "Objectives fulfilled. Claim your reward in the Story tab.",
              narrationUrl:
                getNarrationUrl(storyOrder, "complete") ?? undefined,
              colorScheme: "yellow",
              duration: 7000,
              dismissable: true,
              priority: "interstitial",
            });
          } else {
            eventOverlay.enqueueEvent({
              category: "mission_complete",
              title: "MISSION COMPLETE",
              subtitle: data.title,
              body: data.requiresClaim
                ? "Visit a Star Mall to claim your reward."
                : `+${data.rewardXp} XP  +${data.rewardCredits} cr`,
              colorScheme: "green",
              duration: 6000,
              dismissable: true,
              priority: "interstitial",
            });
          }
          if (activePanelRef.current !== "missions") incrementBadge("missions");
        },
      ),
      on("mission:progress", () => {
        setRefreshKey((k) => k + 1);
      }),
      on(
        "story:act_complete",
        (data: { act: number; actTitle: string; actSummary: string }) => {
          const interstitialData = ACT_COMPLETIONS[data.act];
          eventOverlay.enqueueEvent({
            category: "story_act",
            title: interstitialData?.title || `CHAPTER ${data.act} COMPLETE`,
            subtitle: interstitialData?.subtitle || data.actTitle,
            body: interstitialData?.body || data.actSummary,
            narrationUrl: getActCompletionNarrationUrl(data.act) ?? undefined,
            colorScheme: interstitialData?.colorScheme || "yellow",
            duration: 0,
            priority: "blocking",
            actions: [
              { id: "continue", label: "CONTINUE", variant: "primary" },
            ],
          });
        },
      ),
      on("story:act_unlocked", (data: { message: string }) => {
        showToast(data.message, "story", 8000);
        game.refreshStatus();
      }),
      on(
        "story:lore_unlocked",
        (data: {
          codexTitle: string;
          codexContent: string;
          storyOrder?: number;
        }) => {
          eventOverlay.enqueueEvent({
            category: "lore_reveal",
            title: "CODEX ENTRY UNLOCKED",
            subtitle: data.codexTitle,
            body: data.codexContent,
            narrationUrl:
              getNarrationUrl(data.storyOrder || 0, "codex") ?? undefined,
            colorScheme: "purple",
            duration: 7000,
            priority: "interstitial",
          });
        },
      ),
      on(
        "faction:rankup",
        (data: {
          factionId: string;
          factionName: string;
          newTier: string;
          fame: number;
        }) => {
          eventOverlay.enqueueEvent({
            category: "faction_rankup",
            title: "FACTION RANK UP",
            subtitle: `${data.factionName}: ${data.newTier}`,
            colorScheme: "purple",
            duration: 7000,
            dismissable: true,
            priority: "interstitial",
          });
          game.addLine(
            `Faction rank up: ${data.factionName} — ${data.newTier}`,
            "success",
          );
        },
      ),
      on(
        "random_event:triggered",
        (data: {
          eventInstanceId: string;
          eventKey: string;
          title: string;
          description: string;
          rewards: { credits?: number; xp?: number } | null;
        }) => {
          eventOverlay.enqueueEvent({
            category: "resource_discovery",
            title: "EVENT",
            subtitle: data.title,
            body: data.description,
            colorScheme: "cyan",
            duration: 0,
            priority: "blocking",
            actions: [
              {
                id: `accept:${data.eventInstanceId}`,
                label: "Accept",
                variant: "primary",
              },
              {
                id: `decline:${data.eventInstanceId}`,
                label: "Decline",
                variant: "secondary",
              },
            ],
            onAction: (actionId: string) => {
              const [action, instanceId] = actionId.split(":");
              if (action === "accept") {
                apiAcceptRandomEvent(instanceId)
                  .then(() => game.refreshStatus())
                  .catch(() => {});
              } else if (action === "decline") {
                apiDeclineRandomEvent(instanceId).catch(() => {});
              }
            },
          });
          game.addLine(`Random event: ${data.title}`, "system");
        },
      ),
      on(
        "mission:phase_advanced",
        (data: {
          phaseOrder: number;
          phaseTitle: string;
          phaseDescription?: string;
          totalPhases?: number;
          loreText?: string;
          title?: string;
          storyOrder?: number;
          narrationKey?: string;
        }) => {
          const phaseLabel = data.totalPhases
            ? `Phase ${data.phaseOrder}/${data.totalPhases}`
            : `Phase ${data.phaseOrder}`;
          const narrationUrl = data.storyOrder
            ? (getPhaseNarrationUrl(data.storyOrder, data.phaseOrder) ??
              undefined)
            : undefined;
          eventOverlay.enqueueEvent({
            category: "phase_intro",
            title: data.title || "NEXT PHASE",
            subtitle: `${phaseLabel} — ${data.phaseTitle}`,
            body: [data.loreText, data.phaseDescription]
              .filter(Boolean)
              .join("\n\n"),
            colorScheme: "cyan",
            duration: 0,
            priority: "blocking",
            narrationUrl,
            actions: [
              {
                id: "continue",
                label: "CONTINUE",
                variant: "primary" as const,
              },
            ],
          });
          setRefreshKey((k) => k + 1);
        },
      ),
      on(
        "mission:phase_progress",
        (_data: {
          missionId: string;
          phaseOrder: number;
          objectivesDetail: any[];
        }) => {
          // Refresh mission panel to show updated checkboxes
          setRefreshKey((k) => k + 1);
        },
      ),
      on(
        "mission:npc_encounter",
        (data: {
          missionId: string;
          npcName: string;
          npcTitle?: string;
          npcRace?: string;
          dialogue?: string;
          sectorId: number;
        }) => {
          eventOverlay.enqueueEvent({
            category: "npc_dialogue",
            title: data.npcName,
            subtitle: data.npcTitle || "NPC Encounter",
            body:
              data.dialogue ||
              `You have arrived at ${data.npcName}'s location.`,
            colorScheme: "cyan",
            duration: 0,
            priority: "blocking",
            portrait: data.npcRace
              ? {
                  npcName: data.npcName,
                  npcTitle: data.npcTitle || "",
                  npcRace: data.npcRace,
                }
              : undefined,
            actions: [
              {
                id: "acknowledge",
                label: "CONTINUE",
                variant: "primary" as const,
              },
            ],
          });
          setRefreshKey((k) => k + 1);
        },
      ),
      on(
        "mission:ambush",
        (data: { missionId: string; npcName: string; sectorId: number }) => {
          eventOverlay.enqueueEvent({
            category: "story_accept",
            title: "AMBUSH!",
            subtitle: `${data.npcName} detected`,
            body: "Hostile ship has dropped out of warp in your sector. Prepare for combat!\n\nIf you flee, the hostile will remain until you return and destroy it.",
            colorScheme: "red",
            duration: 5000,
            priority: "interstitial",
          });
          game.addLine(
            `Ambush! ${data.npcName} has appeared in Sector ${data.sectorId}!`,
            "combat",
          );
          // Refresh sector to pick up the spawned NPC as a combat target
          game.refreshStatus();
          // Auto-open combat panel so player can engage immediately
          selectPanel("combat");
          setRefreshKey((k) => k + 1);
        },
      ),
      on(
        "mission:choice_required",
        (data: {
          missionId: string;
          choiceId: string;
          choiceKey?: string;
          title: string;
          body: string;
          options: { id: string; label: string; description: string }[];
          isPermanent: boolean;
          narrationKey?: string;
        }) => {
          const choiceNarrationUrl = data.choiceKey
            ? (getChoiceNarrationUrl(data.choiceKey) ?? undefined)
            : undefined;
          eventOverlay.enqueueEvent({
            category: data.isPermanent ? "player_choice" : "mission_choice",
            title: data.isPermanent ? "TURNING POINT" : "DECISION",
            subtitle: data.title,
            body: data.body,
            colorScheme: "cyan",
            narrationUrl: choiceNarrationUrl,
            duration: 0,
            priority: "blocking",
            actions: data.options.map((opt) => ({
              id: `choice:${data.missionId}:${data.choiceId}:${opt.id}`,
              label: opt.label,
              variant: "primary" as const,
            })),
            onAction: (actionId: string) => {
              const parts = actionId.split(":");
              if (parts[0] === "choice" && parts.length === 4) {
                const [, missionId, choiceId, optionId] = parts;
                submitStoryChoice(missionId, choiceId, optionId)
                  .then(() => {
                    game.refreshStatus();
                    setRefreshKey((k) => k + 1);
                  })
                  .catch((err) => {
                    console.warn("Story choice failed, trying faction:", err);
                    submitFactionChoice(missionId, choiceId, optionId)
                      .then(() => {
                        game.refreshStatus();
                        setRefreshKey((k) => k + 1);
                      })
                      .catch((e) =>
                        console.error("Choice submission failed:", e),
                      );
                  });
              }
            },
          });
        },
      ),
      on(
        "npc:rescue_merchant",
        (data: {
          missionId: string;
          missionTitle: string;
          commodity: string;
          quantity: number;
          pricePerUnit: number;
          sectorId: number;
          npcName: string;
          npcRace: string;
        }) => {
          const totalCost = data.quantity * data.pricePerUnit;
          const capCommodity =
            data.commodity.charAt(0).toUpperCase() + data.commodity.slice(1);
          setMerchantFlash(true);
          setTimeout(() => setMerchantFlash(false), 1300);
          eventOverlay.enqueueEvent({
            category: "npc_merchant",
            title: "A TRADER APPROACHES",
            subtitle: data.npcName,
            body: `"I hear you've been searching for ${capCommodity}. Fortunate that our paths crossed. I have ${data.quantity} units available at ${data.pricePerUnit} credits each. Total: ${totalCost} credits. Interested?"`,
            colorScheme: "cyan",
            duration: 0,
            priority: "blocking",
            portrait: {
              npcName: data.npcName,
              npcRace: data.npcRace,
            },
            actions: [
              {
                id: `rescue-buy:${data.missionId}`,
                label: `BUY ${data.quantity} ${capCommodity.toUpperCase()} (${totalCost} cr)`,
                variant: "primary",
              },
              { id: "rescue-decline", label: "NOT NOW", variant: "secondary" },
            ],
            onAction: (actionId: string) => {
              if (actionId.startsWith("rescue-buy:")) {
                const missionId = actionId.split(":")[1];
                rescueMerchantBuy(missionId)
                  .then(({ data: result }) => {
                    showToast(
                      `Purchased ${result.quantity} ${capCommodity} for ${result.cost} credits`,
                      "success",
                      4000,
                    );
                    game.refreshStatus();
                    setRefreshKey((k) => k + 1);
                  })
                  .catch((err) => {
                    showToast(
                      err.response?.data?.error || "Purchase failed",
                      "error",
                      4000,
                    );
                  });
              }
            },
          });
        },
      ),
      on(
        "npc:random_encounter",
        (data: {
          npcName: string;
          npcRace: string;
          encounterType: string;
          flash: string;
          sectorId: number;
          offering: {
            type: string;
            description: string;
            cost: number;
            commodity?: string;
            quantity?: number;
            factionId?: string;
            factionName?: string;
            fameAmount?: number;
          };
          tabletDrop: { name: string; rarity: string } | null;
        }) => {
          // Trigger flash based on encounter type
          triggerFlash(data.flash as "encounter" | "trade" | "event");

          // Build action label
          let buyLabel = `PAY ${data.offering.cost} CREDITS`;
          if (data.offering.type === "buy_item" && data.offering.commodity) {
            buyLabel = `BUY ${data.offering.quantity} ${data.offering.commodity.toUpperCase()} (${data.offering.cost} cr)`;
          } else if (
            data.offering.type === "faction_rep" &&
            data.offering.factionName
          ) {
            buyLabel = `DONATE ${data.offering.cost} cr (+${data.offering.fameAmount} Fame)`;
          }

          eventOverlay.enqueueEvent({
            category: "npc_merchant",
            title: "ENCOUNTER",
            subtitle: data.npcName,
            body: `"${data.offering.description}"`,
            colorScheme: data.flash === "trade" ? "green" : "cyan",
            duration: 0,
            priority: "interstitial",
            portrait: {
              npcName: data.npcName,
              npcRace: data.npcRace,
            },
            actions: [
              { id: "encounter-buy", label: buyLabel, variant: "primary" },
              {
                id: "encounter-decline",
                label: "DECLINE",
                variant: "secondary",
              },
            ],
            onAction: (actionId: string) => {
              if (actionId === "encounter-buy") {
                npcEncounterBuy(data.offering)
                  .then(() => {
                    if (data.offering.type === "faction_rep") {
                      showToast(
                        `+${data.offering.fameAmount} Fame with ${data.offering.factionName}`,
                        "achievement",
                        4000,
                      );
                    } else if (data.offering.type === "buy_item") {
                      showToast(
                        `Purchased ${data.offering.quantity} ${data.offering.commodity}`,
                        "success",
                        4000,
                      );
                    } else {
                      showToast("Transaction complete", "success", 4000);
                    }
                    game.refreshStatus();
                    setRefreshKey((k) => k + 1);
                  })
                  .catch((err) => {
                    showToast(
                      err.response?.data?.error || "Purchase failed",
                      "error",
                      4000,
                    );
                  });
              }
              // Show tablet drop if one happened
              if (data.tabletDrop) {
                showToast(
                  `Tablet Found: ${data.tabletDrop.name} (${data.tabletDrop.rarity})`,
                  "achievement",
                  5000,
                );
              }
            },
          });
        },
      ),
      on(
        "npc:tarri_intel",
        (data: {
          sectorId: number;
          npcName: string;
          npcRace: string;
          pricePerUnit: number;
          hasDiscoveredOutpost: boolean;
          offerType: "sell_commodity" | "sell_intel";
        }) => {
          triggerFlash("merchant");
          const isIntel = data.offerType === "sell_intel";
          const body = isIntel
            ? `"Looking for cyrillium, are we? I happen to know where the best veins are. Information like this doesn't come cheap — ${data.pricePerUnit} credits for the location of a seller. Take it or leave it."`
            : `"Ha! You've already found a few outposts. Smart. But I can save you a trip — I've got cyrillium right here. ${data.pricePerUnit} credits per unit. It's above market, but then again, you're not at market, are you?"`;

          eventOverlay.enqueueEvent({
            category: "npc_merchant",
            title: "A TAR'RI APPROACHES",
            subtitle: data.npcName,
            body,
            colorScheme: "yellow",
            duration: 0,
            priority: "blocking",
            portrait: {
              npcName: data.npcName,
              npcRace: data.npcRace,
            },
            actions: [
              {
                id: "tarri-buy",
                label: isIntel
                  ? `BUY INTEL (${data.pricePerUnit} cr)`
                  : `BUY CYRILLIUM (${data.pricePerUnit} cr/unit)`,
                variant: "primary",
              },
              {
                id: "tarri-decline",
                label: "NO THANKS",
                variant: "secondary",
              },
            ],
            onAction: (actionId: string) => {
              if (actionId === "tarri-buy") {
                tarriBuy(data.offerType, data.pricePerUnit)
                  .then(({ data: result }) => {
                    if (isIntel && result.intelSectorId) {
                      showToast(
                        `Intel acquired: Cyrillium seller in Sector ${result.intelSectorId}`,
                        "success",
                        6000,
                      );
                    } else if (result.quantity) {
                      showToast(
                        `Purchased ${result.quantity} Cyrillium for ${result.cost} credits`,
                        "success",
                        4000,
                      );
                    } else {
                      showToast("Transaction complete", "success", 4000);
                    }
                    game.refreshStatus();
                    setRefreshKey((k) => k + 1);
                  })
                  .catch((err) => {
                    showToast(
                      err.response?.data?.error || "Purchase failed",
                      "error",
                      4000,
                    );
                  });
              }
            },
          });
        },
      ),
      // Vedic Crystal NPC events (mission 14)
      on(
        "npc:vedic_crystal_emissary",
        (data: {
          sectorId: number;
          npcName: string;
          npcRace: string;
          crystalsGiven: number;
          hintSector: number | null;
        }) => {
          triggerFlash("encounter");
          const hint = data.hintSector
            ? `\n\nA nearby outpost in Sector ${data.hintSector} is known to trade in Vedic crystals.`
            : "";
          eventOverlay.enqueueEvent({
            category: "npc_merchant",
            title: "VEDIC EMISSARY",
            subtitle: data.npcName,
            body: `"Greetings, Muscarian. Valandor has instructed me to provide you with ${data.crystalsGiven} Vedic knowledge crystals. Each one contains the accumulated wisdom of a Vedic scholar. Treat them with reverence — and sell them wisely. The manner of your commerce will shape how my people view yours for generations."${hint}`,
            colorScheme: "cyan",
            duration: 0,
            priority: "blocking",
            portrait: {
              npcName: data.npcName,
              npcRace: data.npcRace,
            },
            actions: [
              {
                id: "vedic-accept",
                label: `ACCEPT ${data.crystalsGiven} VEDIC CRYSTALS`,
                variant: "primary",
              },
            ],
            onAction: () => {
              showToast(
                `Received ${data.crystalsGiven} Vedic Crystals`,
                "achievement",
                5000,
              );
              game.refreshStatus();
              setRefreshKey((k) => k + 1);
            },
          });
        },
      ),
      on(
        "npc:tarri_crystal_opinion",
        (data: { sectorId: number; npcName: string; npcRace: string }) => {
          triggerFlash("trade");
          eventOverlay.enqueueEvent({
            category: "npc_merchant",
            title: "A TAR'RI SCOFFS",
            subtitle: data.npcName,
            body: `"Ha! You're carrying Vedic crystals? Let me tell you something, friend — those things are some of the most valuable assets in the galaxy. The Vedic practically give them away because they don't understand economics. If you're lucky, you'll find outposts willing to buy and sell them. But don't come crying to me when you realize what you sold for pennies."`,
            colorScheme: "yellow",
            duration: 0,
            priority: "interstitial",
            portrait: {
              npcName: data.npcName,
              npcRace: data.npcRace,
            },
            actions: [
              {
                id: "tarri-dismiss",
                label: "NOTED",
                variant: "primary",
              },
            ],
          });
        },
      ),
      // Escort convoy events
      on(
        "escort:started",
        (data: {
          missionId: string;
          caravanSectorId: number;
          totalMoves: number;
        }) => {
          showToast(
            `Caravan deployed in Sector ${data.caravanSectorId} — keep up!`,
            "story",
            6000,
          );
        },
      ),
      on(
        "escort:caravan_moved",
        (data: {
          caravanSectorId: number;
          moveCount: number;
          totalMoves: number;
          playerInRange: boolean;
        }) => {
          showToast(
            `Caravan → Sector ${data.caravanSectorId} (${data.moveCount}/${data.totalMoves})`,
            data.playerInRange ? "success" : "warning",
            5000,
          );
        },
      ),
      on(
        "escort:ambush",
        (_data: { caravanSectorId: number; moveCount: number }) => {
          triggerFlash("combat");
          showToast(
            "AMBUSH! The caravan is under attack — defend it!",
            "combat",
            8000,
          );
        },
      ),
      on(
        "escort:resumed",
        (data: {
          caravanSectorId: number;
          moveCount: number;
          totalMoves: number;
        }) => {
          showToast(
            `Ambush cleared! Caravan resumes — Sector ${data.caravanSectorId}`,
            "success",
            5000,
          );
        },
      ),
      on("escort:completed", () => {
        showToast(
          "Caravan escorted safely! Mission complete.",
          "achievement",
          6000,
        );
        game.refreshStatus();
        setRefreshKey((k) => k + 1);
      }),
      on("escort:failed", (data: { missionId: string; message: string }) => {
        showToast(data.message, "error", 6000);
        game.refreshStatus();
        setRefreshKey((k) => k + 1);
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub?.());
    };
  }, [game.player?.id]);

  // Story act transitions
  useEffect(() => {
    if (!game.player) return;
    const isSP = game.player.gameMode === "singleplayer";
    const completed = isSP
      ? (game.player.spMissions?.completed ?? 0)
      : (game.player.missionsCompleted ?? 0);
    const prev = prevMissionsCompleted.current;
    prevMissionsCompleted.current = completed;
    if (prev === null || prev === completed) return;

    const actGates = isSP ? SP_ACT_GATES : MP_ACT_GATES;
    const actStarts = isSP ? SP_ACT_STARTS : MP_ACT_STARTS;

    for (const { gate, act } of actGates) {
      if (prev < gate && completed >= gate) {
        const interstitial = ACT_COMPLETIONS[act];
        if (interstitial) {
          eventOverlay.enqueueEvent({
            category: "story_act",
            priority: "blocking",
            title: interstitial.title,
            subtitle: interstitial.subtitle,
            body: interstitial.body,
            colorScheme: interstitial.colorScheme,
            duration: interstitial.duration,
            dismissable: true,
          });
        }
      }
    }

    for (const { start, act } of actStarts) {
      const nextGate = actGates.find((g) => g.act === act)?.gate ?? start + 19;
      if (prev < start && completed >= start && completed < nextGate) {
        const lsKey = `coho_act_opening_${act}`;
        if (localStorage.getItem(lsKey)) continue;
        localStorage.setItem(lsKey, "1");
        const interstitial = ACT_OPENINGS[act];
        if (interstitial) {
          eventOverlay.enqueueEvent({
            category: "story_act",
            priority: "blocking",
            title: interstitial.title,
            subtitle: interstitial.subtitle,
            body: interstitial.body,
            colorScheme: interstitial.colorScheme,
            duration: interstitial.duration,
            dismissable: true,
          });
        }
      }
    }

    lastStoryAction.current = Date.now();
  }, [game.player?.missionsCompleted, game.player?.spMissions?.completed]);

  // Detect SP mission completion
  useEffect(() => {
    if (game.player?.gameMode === "singleplayer" && game.player.spMissions) {
      const { completed, total } = game.player.spMissions;
      if (completed >= total && total > 0) {
        setShowSPComplete(true);
      }
    }
  }, [game.player?.spMissions?.completed]);

  // Show initial sector info on first load
  useEffect(() => {
    if (game.sector && game.lines.length === 0) {
      game.addLine("=== COSMIC HORIZON ===", "system");
      game.addLine("A persistent multiplayer space strategy game", "system");
      if (game.player && !game.player.tutorialCompleted) {
        game.addLine(
          "Follow the tutorial bar above to learn the basics.",
          "info",
        );
        game.addLine('Start by typing "look" to survey your sector.', "info");
        // Show tutorial welcome overlay with narration
        eventOverlay.enqueueEvent({
          category: "tutorial_welcome",
          title: "PILOT ORIENTATION",
          subtitle:
            "Welcome to the Cosmic Horizon training program, Commander.",
          body: "ARIA will walk you through navigation, trading, scanning, and planet colonization. Each step highlights exactly where to click. Takes about 5 minutes.\n\nYou can always access the Databank (D) for help later.",
          narrationUrl: TUTORIAL_WELCOME_NARRATION,
          actions: [
            { id: "begin", label: "BEGIN TRAINING", variant: "primary" },
            { id: "skip", label: "SKIP TUTORIAL", variant: "secondary" },
          ],
          onAction: (actionId: string) => {
            if (actionId === "skip") {
              audio.resume();
              game.skipTutorial();
            }
          },
        });
      } else {
        game.addLine(
          'Type "help" for commands or "look" to view your sector.',
          "info",
        );
      }
    }
  }, [game.sector]);

  // Music mood + ARIA triggers on game state changes
  useEffect(() => {
    const curSector = game.player?.currentSectorId;
    if (curSector && curSector !== prevSectorRef.current) {
      prevSectorRef.current = curSector;
      mood.onMove();
      aria.triggerMove();
    }
  }, [game.player?.currentSectorId]);

  useEffect(() => {
    const curDocked = game.player?.dockedAtOutpostId;
    if (curDocked && !prevDockedRef.current) {
      mood.onDock();
      if (game.sector?.hasStarMall && !hasSeenFirstTime("first_starmall")) {
        markFirstTimeSeen("first_starmall");
        const ft = FIRST_TIME_EVENTS.starmall;
        eventOverlay.enqueueEvent({
          category: "first_time",
          title: ft.title,
          subtitle: ft.subtitle,
          body: ft.body,
          colorScheme: ft.colorScheme,
          duration: ft.duration,
        });
      }
    }
    prevDockedRef.current = curDocked;
  }, [game.player?.dockedAtOutpostId]);

  // Clear auto-talk state when leaving crew panel
  useEffect(() => {
    if (activePanel !== "crew") {
      setAutoTalkNpcId(null);
      setCrewInitialTab(undefined);
    }
  }, [activePanel]);

  return {
    ambientScene,
    chatMessages,
    setChatMessages,
    refreshKey,
    setRefreshKey,
    combatFlash,
    merchantFlash,
    eventFlash,
    encounterFlash,
    tradeFlash,
    triggerFlash,
    combatShake,
    showPostTutorialScene,
    setShowPostTutorialScene,
    showSPComplete,
    setShowSPComplete,
    showSettings,
    setShowSettings,
    showArcade,
    setShowArcade,
    alliedPlayerIds,
    pendingAllianceIds,
    hasSyndicate,
    syndicateInfo,
    hasAlliance,
    crewInitialTab,
    setCrewInitialTab,
    autoTalkNpcId,
    setAutoTalkNpcId,
    map3D,
    setMap3D,
    commodityFilter,
    setCommodityFilter,
    refreshAlliances,
    refreshSyndicateStatus,
    lastListingRef,
    activePanelRef,
  };
}
