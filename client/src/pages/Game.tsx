import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import StatusBar from "../components/StatusBar";
import MapPanel from "../components/MapPanel";
import TradeTable from "../components/TradeTable";
import TradeRoutesPanel from "../components/TradeRoutesPanel";
import TradeOffersPanel from "../components/TradeOffersPanel";
import TradeComputerPanel from "../components/TradeComputerPanel";
import MallPanel from "../components/MallPanel";
import CombatGroupPanel from "../components/CombatGroupPanel";
import ActiveMissionsPanel from "../components/ActiveMissionsPanel";
import ExplorePanel from "../components/ExplorePanel";
import PlanetsPanel from "../components/PlanetsPanel";
import CrewGroupPanel from "../components/CrewGroupPanel";
import GearGroupPanel from "../components/GearGroupPanel";
import InventoryResourcePanel from "../components/InventoryResourcePanel";
import CommsGroupPanel from "../components/CommsGroupPanel";
import SyndicateGroupPanel from "../components/SyndicateGroupPanel";
import WalletPanel from "../components/WalletPanel";
import ActionsPanel from "../components/ActionsPanel";
import NotesPanel from "../components/NotesPanel";
import IntelLogPanel from "../components/IntelLogPanel";
import TradeHistoryPanel from "../components/TradeHistoryPanel";
import ProfilePanel from "../components/ProfilePanel";
import CodexPanel from "../components/CodexPanel";
import TutorialOverlay from "../components/TutorialOverlay";
import TutorialWelcomeOverlay from "../components/TutorialWelcomeOverlay";
import IntroSequence, {
  INTRO_BEATS,
  POST_TUTORIAL_BEATS,
} from "../components/IntroSequence";
import PixelScene from "../components/PixelScene";
import SectorViewport from "../components/viewport/SectorViewport";
import ActivityBar from "../components/ActivityBar";
import PixelSprite from "../components/PixelSprite";
import ContextPanel from "../components/ContextPanel";
import SectorMap, { type CommodityFilter } from "../components/SectorMap";
import SectorMap3D from "../components/SectorMap3D";
import NotificationLog from "../components/NotificationLog";
import ToastManager from "../components/ToastManager";
import FloatingNumbers from "../components/FloatingNumbers";
import EventOverlay from "../components/EventOverlay";
import { useToast } from "../hooks/useToast";
import { useEventOverlay } from "../hooks/useEventOverlay";
import { getDailyMissions, getStoryRecap } from "../services/api";
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
  type ChatMessage,
  type ChatChannel,
} from "../components/SectorChatPanel";
import { POST_TUTORIAL_SCENE } from "../config/scenes/post-tutorial-scene";
import {
  buildIdleSpaceScene,
  buildIdleOutpostScene,
  buildIdleDockedScene,
} from "../config/scenes/ambient-scenes";
import { buildCombatScene } from "../config/scenes/combat-scene";
import { buildDestroyedScene } from "../config/scenes/destroyed-scene";
import { buildMallInteriorScene } from "../config/scenes/mall-interior-scene";
import { useGameState } from "../hooks/useGameState";
import { useSocket } from "../hooks/useSocket";
import { useAudio } from "../hooks/useAudio";
import { useAria } from "../hooks/useAria";
import { useActivePanel } from "../hooks/useActivePanel";
import { useMusicMood } from "../config/music-moods";
import { handleCommand } from "../services/commands";
import { PANELS } from "../types/panels";
import AriaComment from "../components/AriaComment";
import SettingsPanel from "../components/SettingsPanel";
import {
  getAlliances,
  getSyndicate,
  getPendingAlliances,
} from "../services/api";

let chatIdCounter = 0;

interface GameProps {
  onLogout?: () => void;
}

export default function Game({ onLogout }: GameProps) {
  const game = useGameState();
  const { on, emit } = useSocket(game.player?.id ?? null);
  const audio = useAudio();
  const aria = useAria();
  const mood = useMusicMood();
  const { activePanel, selectPanel, badges, incrementBadge } =
    useActivePanel("nav");
  const { toasts, showToast, dismissToast } = useToast();
  const eventOverlay = useEventOverlay(showToast as any);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPostTutorialScene, setShowPostTutorialScene] = useState(false);
  const [combatFlash, setCombatFlash] = useState(false);
  const [combatShake, setCombatShake] = useState(false);
  const [map3D, setMap3D] = useState(true);
  const [commodityFilter, setCommodityFilter] = useState<CommodityFilter>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSPComplete, setShowSPComplete] = useState(false);
  const [alliedPlayerIds, setAlliedPlayerIds] = useState<string[]>([]);
  const [pendingAllianceIds, setPendingAllianceIds] = useState<
    { fromId: string; fromName: string }[]
  >([]);
  const [hasSyndicate, setHasSyndicate] = useState(false);
  const [hasAlliance, setHasAlliance] = useState(false);
  const [crewInitialTab, setCrewInitialTab] = useState<
    "players" | "npcs" | "contacts" | undefined
  >(undefined);
  const [autoTalkNpcId, setAutoTalkNpcId] = useState<string | null>(null);
  const lastSectorRef = useRef<number | null>(null);
  const lastListingRef = useRef<{ id: string; label: string }[] | null>(null);
  const activePanelRef = useRef(activePanel);
  activePanelRef.current = activePanel;

  // ARIA integration: trigger milestone comment when significant overlays appear
  const ARIA_MILESTONE_CATEGORIES = new Set([
    "level_up",
    "story_act",
    "faction_rankup",
    "first_time",
    "mission_complete",
  ]);
  useEffect(() => {
    if (
      eventOverlay.currentEvent &&
      ARIA_MILESTONE_CATEGORIES.has(eventOverlay.currentEvent.category)
    ) {
      aria.triggerMilestone();
    }
  }, [eventOverlay.currentEvent?.id]);

  const ambientScene = useMemo(() => {
    const ctx = {
      shipTypeId: game.player?.currentShip?.shipTypeId ?? "scout",
      sectorType: game.sector?.type,
      planetClasses: game.sector?.planets?.map((p) => p.planetClass) ?? [],
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

  // Resource event overlay when entering a new sector with events
  const prevResourceSectorRef = useRef<number | null>(null);
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
      const evList = events.map((e) => {
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
            (e) =>
              EVENT_INFO[e.eventType]?.description ??
              "Something unusual has been detected.",
          )
          .join(" "),
        actions: [
          { id: "investigate", label: "INVESTIGATE", variant: "primary" },
        ],
        onAction: (actionId) => {
          if (actionId === "investigate") selectPanel("explore");
        },
      });
    }
    if (sectorId) {
      prevResourceSectorRef.current = sectorId;
    }
  }, [game.sector?.sectorId, game.sector?.events]);

  // Level-up detection → event overlay
  const prevLevelRef = useRef(game.player?.level ?? 0);
  useEffect(() => {
    const level = game.player?.level ?? 0;
    const rank = game.player?.rank ?? "";
    if (prevLevelRef.current > 0 && level > prevLevelRef.current) {
      audio.sfx("level_up");
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

  // Daily missions overlay (first visit per day) / toast reminder
  const dailyFetched = useRef(false);
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
            onAction: (actionId) => {
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

  // Idle story nudge system — toast story hints after 30min without story progress
  const storyNudgeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStoryAction = useRef(Date.now());
  const lastNudge = useRef(0);
  useEffect(() => {
    if (!game.player) return;
    // Reset story action timestamp when missions panel is visited
    lastStoryAction.current = Date.now();

    const IDLE_THRESHOLD = 30 * 60 * 1000; // 30 minutes
    const NUDGE_COOLDOWN = 15 * 60 * 1000; // 15 minutes between nudges

    storyNudgeTimer.current = setInterval(() => {
      const now = Date.now();
      const idle = now - lastStoryAction.current;
      const sinceLast = now - lastNudge.current;
      if (idle < IDLE_THRESHOLD || sinceLast < NUDGE_COOLDOWN) return;
      // Don't nudge during combat (tension mood = combat active)
      if (mood.currentMood === "tension") return;

      // Derive act from mission progress
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
    }, 60_000); // Check every minute

    return () => {
      if (storyNudgeTimer.current) clearInterval(storyNudgeTimer.current);
    };
  }, [game.player?.id]);

  // Reset story idle timer when player visits missions panel or completes a mission
  useEffect(() => {
    if (activePanel === "missions" || activePanel === "crew") {
      lastStoryAction.current = Date.now();
    }
  }, [activePanel]);

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
      .then(() => setHasSyndicate(true))
      .catch(() => setHasSyndicate(false));
  }, []);

  useEffect(() => {
    game.refreshStatus();
    game.refreshSector();
    game.refreshTutorial();
    game.refreshMap();
    refreshAlliances();
    refreshSyndicateStatus();
    // Story recap toast on login
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

  // Switch audio track based on game context
  useEffect(() => {
    if (!game.player) return;

    if (!game.player.hasSeenIntro) {
      audio.play("intro");
    } else if (
      game.player.tutorialCompleted &&
      !game.player.hasSeenPostTutorial
    ) {
      audio.play("post-tutorial");
    } else if (game.sector?.outposts?.length) {
      // At a sector with an outpost — could be star mall
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

  // Sync mood engine → audio system (track filtering + silence volume)
  useEffect(() => {
    const moodTracks = mood.getMoodTracks();
    audio.setMoodTracks(moodTracks.length > 0 ? moodTracks : null);
  }, [mood.currentMood]);

  useEffect(() => {
    audio.setVolumeMultiplier(mood.silenceState.volumeMultiplier);
  }, [mood.silenceState.volumeMultiplier]);

  // Multi-session sync: debounced refresh on sync:* events
  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    if (!game.player) return;

    function debouncedSync(key: string, fn: () => void) {
      if (syncTimers.current[key]) clearTimeout(syncTimers.current[key]);
      syncTimers.current[key] = setTimeout(fn, 300);
    }

    const syncUnsubs = [
      on("sync:status", () => debouncedSync("status", game.refreshStatus)),
      on("sync:sector", () => debouncedSync("sector", game.refreshSector)),
      on("sync:map", () => debouncedSync("map", game.refreshMap)),
      on("sync:full", () => {
        debouncedSync("status", game.refreshStatus);
        debouncedSync("sector", game.refreshSector);
        debouncedSync("map", game.refreshMap);
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
  ]);

  // Listen for WebSocket events
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
          game.setPlayer((prev) => {
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
          audio.sfx("hit");
          game.refreshStatus();
          if (activePanelRef.current !== "combat") incrementBadge("combat");
          setCombatFlash(true);
          setCombatShake(true);
          setTimeout(() => setCombatFlash(false), 300);
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
      on("combat:destroyed", (data: { destroyerName: string }) => {
        audio.sfx("explosion");
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
          // Skip own messages — already echoed locally by handleChatSend / chat command
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
        }) => {
          audio.sfx("success");
          if (data.isStory) {
            eventOverlay.enqueueEvent({
              category: "story_mission",
              title: "STORY QUEST COMPLETE",
              subtitle: data.title,
              body: "Claim your reward in the Story tab.",
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
      on(
        "story:act_complete",
        (data: { act: number; actTitle: string; actSummary: string }) => {
          eventOverlay.enqueueEvent({
            category: "story_act",
            title: `ACT ${data.act} COMPLETE`,
            subtitle: data.actTitle,
            body: data.actSummary,
            colorScheme: "yellow",
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
        (data: { codexTitle: string; codexContent: string }) => {
          eventOverlay.enqueueEvent({
            category: "lore_reveal",
            title: "CODEX ENTRY UNLOCKED",
            subtitle: data.codexTitle,
            body: data.codexContent,
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
    ];

    return () => {
      unsubs.forEach((unsub) => unsub?.());
    };
  }, [game.player?.id]);

  const onCommand = useCallback(
    (input: string) => {
      aria.resetIdleTimer();
      handleCommand(input, {
        addLine: game.addLine,
        clearLines: game.clearLines,
        player: game.player,
        sector: game.sector,
        doMove: game.doMove,
        doWarpTo: game.doWarpTo,
        doBuy: game.doBuy,
        doSell: game.doSell,
        doFire: game.doFire,
        doFlee: game.doFlee,
        doDock: game.doDock,
        doUndock: game.doUndock,
        refreshStatus: game.refreshStatus,
        refreshSector: game.refreshSector,
        emit,
        advanceTutorial: game.advanceTutorial,
        enqueueScene: game.enqueueScene,
        setLastListing: (items: { id: string; label: string }[]) => {
          lastListingRef.current = items;
        },
        getLastListing: () => lastListingRef.current,
      });
    },
    [game, emit],
  );

  // Story act transitions — detect when mission progress crosses act boundaries
  // SP: 20 missions, acts at 5/10/15/20
  // MP: ~80 missions, acts at 20/40/60/80
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

  const prevMissionsCompleted = useRef<number | null>(null);
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

    // Check if an act was just completed
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

    // Check if a new act is starting
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

    // Reset story idle timer on mission completion
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
      } else {
        game.addLine(
          'Type "help" for commands or "look" to view your sector.',
          "info",
        );
      }
    }
  }, [game.sector]);

  // --- Music mood + ARIA triggers based on game state changes ---
  const prevSectorRef = useRef(game.player?.currentSectorId);
  const prevDockedRef = useRef(game.player?.dockedAtOutpostId);

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
      // First star mall visit
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

  const activeOutpost = game.player?.dockedAtOutpostId ?? null;

  const handleActionButton = useCallback(
    (cmd: string) => {
      onCommand(cmd);
    },
    [onCommand],
  );

  const handleMove = useCallback(
    (sectorId: number) => {
      audio.sfx("warp");
      game.doMove(sectorId);
    },
    [game.doMove],
  );

  const handleUndock = useCallback(() => {
    audio.sfx("undock");
    game.doUndock();
  }, [game.doUndock]);

  const handleLiftoff = useCallback(() => {
    audio.sfx("thruster");
    game.doLiftoff();
  }, [game.doLiftoff]);

  const handleFire = useCallback(
    (targetId: string, energy: number) => {
      audio.sfx("laser_fire");
      game.doFire(targetId, energy);
    },
    [game.doFire],
  );

  const handleBuy = useCallback(
    (outpostId: string, commodity: string, qty: number) => {
      audio.sfx("trade");
      return game.doBuy(outpostId, commodity, qty);
    },
    [game.doBuy],
  );

  const handleSell = useCallback(
    (outpostId: string, commodity: string, qty: number) => {
      audio.sfx("trade");
      return game.doSell(outpostId, commodity, qty);
    },
    [game.doSell],
  );

  const handleSelectPanel = useCallback(
    (id: any) => {
      audio.sfx("click");
      selectPanel(id);
    },
    [selectPanel],
  );

  const handleDock = useCallback(async () => {
    audio.sfx("dock");
    await game.doDock();
    selectPanel("trade");
    aria.triggerDock();
    if (!hasSeenFirstTime("first_dock")) {
      markFirstTimeSeen("first_dock");
      const ft = FIRST_TIME_EVENTS.dock;
      eventOverlay.enqueueEvent({
        category: "first_time",
        title: ft.title,
        subtitle: ft.subtitle,
        body: ft.body,
        colorScheme: ft.colorScheme,
        duration: ft.duration,
      });
    }
  }, [game.doDock, selectPanel, aria.triggerDock]);

  const handleNPCClick = useCallback(
    (npcId: string) => {
      setCrewInitialTab("npcs");
      setAutoTalkNpcId(npcId || null);
      selectPanel("crew");
    },
    [selectPanel],
  );

  // Clear auto-talk state when leaving crew panel
  useEffect(() => {
    if (activePanel !== "crew") {
      setAutoTalkNpcId(null);
      setCrewInitialTab(undefined);
    }
  }, [activePanel]);

  function renderActivePanel() {
    switch (activePanel) {
      case "nav":
        return (
          <MapPanel
            sector={game.sector}
            onMoveToSector={handleMove}
            onWarpTo={game.doWarpTo}
            onCommand={handleActionButton}
            onNPCClick={handleNPCClick}
            onAlertClick={(panel) => selectPanel(panel as any)}
            isDocked={!!game.player?.dockedAtOutpostId}
            isLanded={!!game.player?.landedAtPlanetId}
            hasPlanets={(game.sector?.planets?.length ?? 0) > 0}
            onDock={handleDock}
            onUndock={handleUndock}
            onLandClick={() => selectPanel("planets")}
            onLiftoff={handleLiftoff}
            exploredSectorIds={game.mapData?.sectors?.map((s) => s.id)}
            alliedPlayerIds={alliedPlayerIds}
            bare
          />
        );
      case "explore":
        return (
          <ExplorePanel
            refreshKey={refreshKey}
            bare
            sectorId={game.player?.currentSectorId}
            playerName={game.player?.username}
            hasNamingAuthority={game.player?.hasNamingAuthority}
            onAddLine={game.addLine}
            onRefreshStatus={game.refreshStatus}
          />
        );
      case "trade": {
        const atStarMall = !!activeOutpost && !!game.sector?.hasStarMall;
        if (atStarMall) {
          return (
            <MallPanel
              outpostId={activeOutpost}
              onBuy={handleBuy}
              onSell={handleSell}
              credits={game.player?.credits ?? 0}
              energy={game.player?.energy ?? 0}
              maxEnergy={game.player?.maxEnergy ?? 100}
              onAction={() => {
                audio.sfx("confirm");
                game.refreshStatus();
                setRefreshKey((k) => k + 1);
                aria.triggerTrade();
                if (!hasSeenFirstTime("first_trade")) {
                  markFirstTimeSeen("first_trade");
                  const ft = FIRST_TIME_EVENTS.trade;
                  eventOverlay.enqueueEvent({
                    category: "first_time",
                    title: ft.title,
                    subtitle: ft.subtitle,
                    body: ft.body,
                    colorScheme: ft.colorScheme,
                    duration: ft.duration,
                  });
                }
              }}
              bare
            />
          );
        }
        return (
          <>
            {activeOutpost ? (
              <TradeTable
                outpostId={activeOutpost}
                onBuy={handleBuy}
                onSell={handleSell}
                bare
              />
            ) : (
              <TradeComputerPanel bare />
            )}
            <TradeRoutesPanel
              refreshKey={refreshKey}
              onCommand={handleActionButton}
              bare
            />
            <TradeOffersPanel
              refreshKey={refreshKey}
              onAction={() => {
                game.refreshStatus();
                setRefreshKey((k) => k + 1);
                aria.triggerTrade();
                if (!hasSeenFirstTime("first_trade")) {
                  markFirstTimeSeen("first_trade");
                  const ft = FIRST_TIME_EVENTS.trade;
                  eventOverlay.enqueueEvent({
                    category: "first_time",
                    title: ft.title,
                    subtitle: ft.subtitle,
                    body: ft.body,
                    colorScheme: ft.colorScheme,
                    duration: ft.duration,
                  });
                }
              }}
              bare
            />
          </>
        );
      }
      case "combat":
        return (
          <CombatGroupPanel
            sector={game.sector}
            onFire={handleFire}
            onFlee={game.doFlee}
            weaponEnergy={game.player?.currentShip?.weaponEnergy ?? 0}
            combatAnimation={game.combatAnimation}
            onCombatAnimationDone={game.clearCombatAnimation}
            playerName={game.player?.username}
            refreshKey={refreshKey}
            bare
          />
        );
      case "crew":
        return (
          <CrewGroupPanel
            sector={game.sector}
            onFire={handleFire}
            refreshKey={refreshKey}
            onCommand={handleActionButton}
            alliedPlayerIds={alliedPlayerIds}
            pendingAllianceIds={pendingAllianceIds}
            onAllianceChange={refreshAlliances}
            initialTab={crewInitialTab}
            autoTalkNpcId={autoTalkNpcId}
            bare
          />
        );
      case "missions":
        return (
          <ActiveMissionsPanel
            refreshKey={refreshKey}
            atStarMall={!!activeOutpost && !!game.sector?.hasStarMall}
            onAction={() => {
              game.refreshStatus();
              setRefreshKey((k) => k + 1);
            }}
            onStoryEvent={(data) => {
              audio.sfx("quest");
              if (data.type === "journey_begin") {
                eventOverlay.enqueueEvent({
                  category: "story_accept",
                  title: data.title,
                  subtitle: data.subtitle,
                  body: data.body,
                  colorScheme: "yellow",
                  duration: 0,
                  priority: "blocking",
                  actions: [
                    {
                      id: "begin",
                      label: "BEGIN YOUR JOURNEY",
                      variant: "primary",
                    },
                  ],
                });
              } else if (data.type === "act_begin") {
                eventOverlay.enqueueEvent({
                  category: "story_accept",
                  title: data.title,
                  subtitle: data.subtitle,
                  body: data.body,
                  colorScheme: "cyan",
                  duration: 0,
                  priority: "blocking",
                  actions: [
                    {
                      id: "continue",
                      label: "CONTINUE THE SAGA",
                      variant: "primary",
                    },
                  ],
                });
              } else {
                eventOverlay.enqueueEvent({
                  category: "story_accept",
                  title: data.title,
                  subtitle: data.subtitle,
                  body: data.body,
                  colorScheme: "green",
                  duration: 5000,
                  priority: "interstitial",
                  dismissable: true,
                });
              }
            }}
            bare
          />
        );
      case "planets":
        return (
          <PlanetsPanel
            refreshKey={refreshKey}
            currentSectorId={game.player?.currentSectorId ?? null}
            hasNamingAuthority={game.player?.hasNamingAuthority}
            hasTransporter={game.player?.hasTransporter}
            playerRace={game.player?.race ?? null}
            shipFoodCargo={game.player?.currentShip?.foodCargo ?? 0}
            colonistsByRace={game.player?.currentShip?.colonistsByRace}
            onAction={() => {
              game.refreshStatus();
              game.refreshSector();
              setRefreshKey((k) => k + 1);
              if (!hasSeenFirstTime("first_planet")) {
                markFirstTimeSeen("first_planet");
                const ft = FIRST_TIME_EVENTS.planet_claim;
                eventOverlay.enqueueEvent({
                  category: "first_time",
                  title: ft.title,
                  subtitle: ft.subtitle,
                  body: ft.body,
                  colorScheme: ft.colorScheme,
                  duration: ft.duration,
                });
              }
            }}
            onCommand={handleActionButton}
            onAdvanceTutorial={game.advanceTutorial}
            onLand={game.doLand}
            onLiftoff={handleLiftoff}
            onWarpTo={game.doWarpTo}
            landedAtPlanetId={game.player?.landedAtPlanetId ?? null}
            onSfx={audio.sfx}
            bare
          />
        );
      case "gear":
        return (
          <GearGroupPanel
            refreshKey={refreshKey}
            onItemUsed={handleItemUsed}
            atStarMall={!!activeOutpost && !!game.sector?.hasStarMall}
            onCommand={handleActionButton}
            bare
          />
        );
      case "inventory":
        return (
          <InventoryResourcePanel
            refreshKey={refreshKey}
            onAddLine={game.addLine}
            onRefreshStatus={game.refreshStatus}
          />
        );
      case "comms":
        return (
          <CommsGroupPanel
            messages={chatMessages}
            onSend={handleChatSend}
            refreshKey={refreshKey}
            onAction={() => setRefreshKey((k) => k + 1)}
            hasSyndicate={hasSyndicate}
            hasAlliance={hasAlliance}
            alliedPlayerIds={alliedPlayerIds}
            onAllianceChange={refreshAlliances}
            bare
          />
        );
      case "syndicate":
        return (
          <SyndicateGroupPanel
            refreshKey={refreshKey}
            onCommand={handleActionButton}
            bare
          />
        );
      case "wallet":
        return <WalletPanel bare />;
      case "actions":
        return (
          <ActionsPanel
            onCommand={handleActionButton}
            onClearLog={game.clearLines}
            bare
          />
        );
      case "notes":
        return <NotesPanel refreshKey={refreshKey} bare />;
      case "intel":
        return <IntelLogPanel refreshKey={refreshKey} bare />;
      case "trade-history":
        return <TradeHistoryPanel refreshKey={refreshKey} bare />;
      case "codex":
        return <CodexPanel refreshKey={refreshKey} bare />;
      case "profile":
        return <ProfilePanel refreshKey={refreshKey} bare />;
    }
  }

  const handleChatSend = useCallback(
    (message: string, channel: ChatChannel = "sector") => {
      const name = game.player?.username || "You";
      if (channel === "sector") {
        game.addLine(`[${name}] ${message}`, "info");
      }
      setChatMessages((prev) => [
        ...prev.slice(-99),
        {
          id: chatIdCounter++,
          senderName: name,
          message,
          isOwn: true,
          channel,
        },
      ]);
      if (channel === "sector") {
        emit("chat:sector", { message });
      } else if (channel === "syndicate") {
        emit("chat:syndicate", { message });
      } else if (channel === "alliance") {
        emit("chat:alliance", { message });
      }
    },
    [game.player?.username, game.addLine, emit],
  );

  const handleItemUsed = useCallback(() => {
    game.refreshStatus();
    setRefreshKey((k) => k + 1);
  }, [game.refreshStatus]);

  const handleTrackRequest = useCallback(
    (trackId: string) => {
      audio.play(trackId);
    },
    [audio.play],
  );

  // Show intro lore sequence on first login (before tutorial)
  if (game.player && !game.player.hasSeenIntro) {
    return (
      <IntroSequence
        beats={INTRO_BEATS}
        onComplete={game.markIntroSeen}
        title="THE AGARICALIS SAGA"
        trackId="intro"
        onTrackRequest={handleTrackRequest}
        onAudioResume={audio.resume}
      />
    );
  }

  // Show post-tutorial lore sequence after tutorial completion
  if (
    game.player &&
    game.player.tutorialCompleted &&
    !game.player.hasSeenPostTutorial
  ) {
    if (showPostTutorialScene) {
      return (
        <PixelScene
          scene={POST_TUTORIAL_SCENE}
          renderMode="fullscreen"
          onComplete={game.markPostTutorialSeen}
          onSkip={game.markPostTutorialSeen}
        />
      );
    }
    return (
      <IntroSequence
        beats={POST_TUTORIAL_BEATS}
        onComplete={() => setShowPostTutorialScene(true)}
        title="THE FRONTIER AWAITS"
        buttonLabel="BEGIN YOUR JOURNEY"
        trackId="post-tutorial"
        onTrackRequest={handleTrackRequest}
        onAudioResume={audio.resume}
      />
    );
  }

  return (
    <div className="game-layout">
      <AriaComment
        comment={aria.comment}
        visible={aria.showComment}
        onDismiss={aria.dismissComment}
      />
      <ToastManager toasts={toasts} onDismiss={dismissToast} />
      {eventOverlay.currentEvent && (
        <EventOverlay
          event={eventOverlay.currentEvent}
          onDismiss={eventOverlay.dismissCurrent}
          onAction={eventOverlay.handleAction}
        />
      )}
      {showSPComplete && (
        <div
          className="sp-complete-modal"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#1a1a2e",
              border: "1px solid #00ff88",
              borderRadius: "8px",
              padding: "32px",
              maxWidth: "480px",
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "#00ff88", marginBottom: "16px" }}>
              FRONTIER CONQUERED
            </h2>
            <p style={{ color: "#ccc", marginBottom: "16px" }}>
              You have completed all 20 single player missions! The multiplayer
              frontier awaits — join other pilots in the shared universe.
            </p>
            <p
              style={{
                color: "#888",
                fontSize: "0.85rem",
                marginBottom: "24px",
              }}
            >
              Your level, XP, credits, ships, and upgrades will carry over. Your
              single player planets and sectors will be removed.
            </p>
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                className="btn btn-secondary"
                onClick={() => setShowSPComplete(false)}
              >
                STAY IN SP
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowSPComplete(false);
                  onCommand("profile transition");
                }}
              >
                GO MULTIPLAYER
              </button>
            </div>
          </div>
        </div>
      )}
      {showSettings && (
        <div
          className="settings-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
        >
          <div className="settings-overlay__content">
            <button
              className="settings-overlay__close"
              onClick={() => setShowSettings(false)}
            >
              X
            </button>
            <SettingsPanel
              playerRace={game.player?.race ?? undefined}
              playerUsername={game.player?.username ?? undefined}
              gameMode={game.player?.gameMode ?? undefined}
              volume={audio.volume}
              onVolumeChange={audio.setVolume}
              sfxVolume={audio.sfxVolume}
              onSfxVolumeChange={audio.setSfxVolume}
              map3D={map3D}
              onToggleMap3D={() => setMap3D((v) => !v)}
              onLogout={onLogout ?? (() => {})}
              onRefresh={() => {
                game.refreshStatus();
                game.refreshSector();
                game.refreshMap();
              }}
            />
          </div>
        </div>
      )}
      <TutorialWelcomeOverlay
        tutorialCompleted={game.player?.tutorialCompleted ?? true}
        onPlay={() => {}}
        onSkip={game.skipTutorial}
      />
      <TutorialOverlay
        tutorialStep={game.player?.tutorialStep ?? 0}
        tutorialCompleted={game.player?.tutorialCompleted ?? true}
        onSkip={game.skipTutorial}
        onSelectPanel={(id) => selectPanel(id as any)}
        onAdvanceTutorial={game.advanceTutorial}
        activePanel={activePanel}
      />
      <StatusBar
        player={game.player}
        muted={audio.muted}
        paused={audio.paused}
        onToggleMute={audio.toggleMute}
        onTogglePause={audio.togglePause}
        onSkipTrack={audio.skip}
        onPrevTrack={audio.previous}
        canSkipTrack={audio.canSkip}
        canPrevTrack={audio.canPrevious}
        currentTrackId={audio.currentTrackId}
        onSettings={() => setShowSettings((v) => !v)}
        onLogout={onLogout}
      />
      <div className="game-main">
        <ActivityBar
          activePanel={activePanel}
          onSelect={handleSelectPanel}
          badges={badges}
        />
        <div className="game-center">
          <div
            className={`game-map-area${combatFlash ? " terminal--combat-flash" : ""}`}
          >
            {/* Map toggle */}
            <button
              className="map-toggle-btn"
              onClick={() => setMap3D((v) => !v)}
              title={map3D ? "Switch to 2D map" : "Switch to 3D map"}
            >
              {map3D ? "2D" : "3D"}
            </button>
            {!map3D && (
              <div className="map-commodity-filters">
                {(
                  [
                    ["buys_cyr", "Sell Cyr", "var(--cyan)"],
                    ["sells_cyr", "Buy Cyr", "var(--cyan)"],
                    ["buys_food", "Sell Food", "var(--green)"],
                    ["sells_food", "Buy Food", "var(--green)"],
                    ["buys_tech", "Sell Tech", "var(--purple)"],
                    ["sells_tech", "Buy Tech", "var(--purple)"],
                    ["sells_fuel", "Fuel", "var(--yellow)"],
                  ] as [CommodityFilter, string, string][]
                ).map(([key, label, color]) => (
                  <button
                    key={key}
                    className={`map-filter-btn${commodityFilter === key ? " map-filter-btn--active" : ""}`}
                    style={{
                      borderColor: commodityFilter === key ? color : undefined,
                      color: commodityFilter === key ? color : undefined,
                    }}
                    onClick={() =>
                      setCommodityFilter(commodityFilter === key ? null : key)
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {map3D ? (
              <SectorMap3D
                mapData={game.mapData}
                currentSectorId={game.player?.currentSectorId ?? null}
                adjacentSectorIds={
                  game.sector?.adjacentSectors?.map((a) => a.sectorId) || []
                }
                onMoveToSector={handleMove}
              />
            ) : (
              <SectorMap
                mapData={game.mapData}
                currentSectorId={game.player?.currentSectorId ?? null}
                adjacentSectorIds={
                  game.sector?.adjacentSectors?.map((a) => a.sectorId) || []
                }
                onMoveToSector={handleMove}
                commodityFilter={commodityFilter}
              />
            )}
          </div>
          <div className="game-panel-area">
            <div className="game-panel-content">
              <div className="panel-area-header">
                <PixelSprite
                  spriteKey={
                    PANELS.find((p) => p.id === activePanel)?.spriteKey ??
                    "icon_nav"
                  }
                  size={14}
                />
                {PANELS.find((p) => p.id === activePanel)?.label}
              </div>
              {renderActivePanel()}
            </div>
            <div className="game-viewport-wrapper">
              <div className="panel-area-header">BRIDGE VIEW</div>
              <SectorViewport
                actionScene={game.inlineScene}
                ambientScene={ambientScene}
                onActionComplete={game.dequeueScene}
                sectorId={game.player?.currentSectorId}
                shipType={game.player?.currentShip?.shipTypeId}
                shake={combatShake}
                isDocked={!!game.player?.dockedAtOutpostId}
                sectorType={game.sector?.type}
                sector={game.sector}
                playerId={game.player?.id ?? ""}
              />
              <FloatingNumbers
                xp={game.player?.xp ?? 0}
                credits={game.player?.credits ?? 0}
              />
            </div>
          </div>
          <NotificationLog lines={game.lines} onClear={game.clearLines} />
        </div>
        <ContextPanel
          player={game.player}
          chatMessages={chatMessages}
          onChatSend={handleChatSend}
          onCommand={onCommand}
          hasSyndicate={hasSyndicate}
          hasAlliance={hasAlliance}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
