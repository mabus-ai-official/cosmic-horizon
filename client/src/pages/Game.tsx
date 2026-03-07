import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import StatusBar from "../components/StatusBar";
import MapPanel from "../components/MapPanel";
import AriaPanel from "../components/AriaPanel";
import TradeTable from "../components/TradeTable";
import TradeRoutesPanel from "../components/TradeRoutesPanel";
import TradeOffersPanel from "../components/TradeOffersPanel";
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
import ProfilePanel from "../components/ProfilePanel";
import TutorialOverlay from "../components/TutorialOverlay";
import TutorialWelcomeOverlay from "../components/TutorialWelcomeOverlay";
import IntroSequence, {
  INTRO_BEATS,
  POST_TUTORIAL_BEATS,
} from "../components/IntroSequence";
import PixelScene from "../components/PixelScene";
import SceneViewport from "../components/SceneViewport";
import ActivityBar from "../components/ActivityBar";
import PixelSprite from "../components/PixelSprite";
import ContextPanel from "../components/ContextPanel";
import SectorMap from "../components/SectorMap";
import SectorMap3D from "../components/SectorMap3D";
import NotificationLog from "../components/NotificationLog";
import ToastManager from "../components/ToastManager";
import DailyMissions from "../components/DailyMissions";
import DailyMissionsOverlay from "../components/DailyMissionsOverlay";
import FloatingNumbers from "../components/FloatingNumbers";
import LevelUpOverlay from "../components/LevelUpOverlay";
import { useToast } from "../hooks/useToast";
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
import { useActivePanel } from "../hooks/useActivePanel";
import { handleCommand } from "../services/commands";
import { PANELS } from "../types/panels";
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
  const { activePanel, selectPanel, badges, incrementBadge } =
    useActivePanel("nav");
  const { toasts, showToast, dismissToast } = useToast();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPostTutorialScene, setShowPostTutorialScene] = useState(false);
  const [combatFlash, setCombatFlash] = useState(false);
  const [combatShake, setCombatShake] = useState(false);
  const [map3D, setMap3D] = useState(true);
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
      lastSectorRef.current = game.player.currentSectorId;
      setChatMessages([]);
    }
  }, [game.player?.currentSectorId]);

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
      on("energy:update", (data: { energy: number; maxEnergy: number }) => {
        game.setPlayer((prev) =>
          prev
            ? { ...prev, energy: data.energy, maxEnergy: data.maxEnergy }
            : null,
        );
        if (data.energy <= data.maxEnergy * 0.15) {
          showToast(
            `Low energy: ${data.energy}/${data.maxEnergy}`,
            "warning",
            5000,
          );
        }
      }),
      on("player:entered", (data: { username: string; sectorId: number }) => {
        game.addLine(`${data.username} has entered the sector`, "warning");
        game.refreshSector();
        if (activePanelRef.current !== "crew") incrementBadge("crew");
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
          setTimeout(() => setCombatFlash(false), 300);
          setTimeout(() => setCombatShake(false), 400);
          game.enqueueScene(buildCombatScene("scout", data.damage));
        },
      ),
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
    ];

    return () => {
      unsubs.forEach((unsub) => unsub?.());
    };
  }, [game.player?.id]);

  const onCommand = useCallback(
    (input: string) => {
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

  const activeOutpost = game.player?.dockedAtOutpostId ?? null;

  const handleActionButton = useCallback(
    (cmd: string) => {
      onCommand(cmd);
    },
    [onCommand],
  );

  const handleDock = useCallback(async () => {
    await game.doDock();
    selectPanel("trade");
  }, [game.doDock, selectPanel]);

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
            onMoveToSector={game.doMove}
            onWarpTo={game.doWarpTo}
            onCommand={handleActionButton}
            onNPCClick={handleNPCClick}
            onAlertClick={(panel) => selectPanel(panel as any)}
            isDocked={!!game.player?.dockedAtOutpostId}
            isLanded={!!game.player?.landedAtPlanetId}
            hasPlanets={(game.sector?.planets?.length ?? 0) > 0}
            onDock={handleDock}
            onUndock={game.doUndock}
            onLandClick={() => selectPanel("planets")}
            onLiftoff={game.doLiftoff}
            exploredSectorIds={game.mapData?.sectors?.map((s) => s.id)}
            alliedPlayerIds={alliedPlayerIds}
            bare
          />
        );
      case "aria":
        return <AriaPanel bare />;
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
              onBuy={game.doBuy}
              onSell={game.doSell}
              credits={game.player?.credits ?? 0}
              energy={game.player?.energy ?? 0}
              maxEnergy={game.player?.maxEnergy ?? 100}
              onAction={() => {
                game.refreshStatus();
                setRefreshKey((k) => k + 1);
              }}
              bare
            />
          );
        }
        return (
          <>
            <TradeTable
              outpostId={activeOutpost}
              onBuy={game.doBuy}
              onSell={game.doSell}
              bare
            />
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
            onFire={game.doFire}
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
            onFire={game.doFire}
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
          <>
            <DailyMissions
              refreshKey={refreshKey}
              onClaim={() => {
                game.refreshStatus();
                setRefreshKey((k) => k + 1);
              }}
            />
            <ActiveMissionsPanel
              refreshKey={refreshKey}
              atStarMall={!!activeOutpost && !!game.sector?.hasStarMall}
              onAction={() => {
                game.refreshStatus();
                setRefreshKey((k) => k + 1);
              }}
              bare
            />
          </>
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
            }}
            onCommand={handleActionButton}
            onLand={game.doLand}
            onLiftoff={game.doLiftoff}
            onWarpTo={game.doWarpTo}
            landedAtPlanetId={game.player?.landedAtPlanetId ?? null}
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
      <ToastManager toasts={toasts} onDismiss={dismissToast} />
      <LevelUpOverlay
        level={game.player?.level ?? 0}
        rank={game.player?.rank ?? ""}
        onLevelUp={(lvl, rnk) => {
          game.addLine(
            `LEVEL UP! You are now level ${lvl} — ${rnk}`,
            "success",
          );
          showToast(`Level ${lvl} — ${rnk}!`, "success", 8000);
        }}
      />
      <DailyMissionsOverlay
        onOpenMissions={() => selectPanel("missions")}
        onToastReminder={(msg) => showToast(msg, "system", 6000)}
      />
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
        onLogout={onLogout}
      />
      <div className="game-main">
        <ActivityBar
          activePanel={activePanel}
          onSelect={selectPanel}
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
            {map3D ? (
              <SectorMap3D
                mapData={game.mapData}
                currentSectorId={game.player?.currentSectorId ?? null}
                adjacentSectorIds={
                  game.sector?.adjacentSectors?.map((a) => a.sectorId) || []
                }
                onMoveToSector={game.doMove}
              />
            ) : (
              <SectorMap
                mapData={game.mapData}
                currentSectorId={game.player?.currentSectorId ?? null}
                adjacentSectorIds={
                  game.sector?.adjacentSectors?.map((a) => a.sectorId) || []
                }
                onMoveToSector={game.doMove}
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
              <SceneViewport
                actionScene={game.inlineScene}
                ambientScene={ambientScene}
                onActionComplete={game.dequeueScene}
                sectorId={game.player?.currentSectorId}
                shipType={game.player?.currentShip?.shipTypeId}
                shake={combatShake}
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
