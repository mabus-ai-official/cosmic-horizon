import { useState, useCallback, useRef, useEffect } from "react";
import * as api from "../services/api";
import type { MapData } from "../components/SectorMap";
import type { SceneDefinition } from "../config/scene-types";
import { buildWarpScene } from "../config/scenes/warp-scene";
import { buildDockingScene } from "../config/scenes/docking-scene";
import { buildUndockScene } from "../config/scenes/undock-scene";
import { buildCombatScene } from "../config/scenes/combat-scene";
import { buildFleeScene } from "../config/scenes/flee-scene";
import { buildTradeScene } from "../config/scenes/trade-scene";
import { buildNPCEncounterScene } from "../config/scenes/npc-scene";

export interface PlayerState {
  id: string;
  username: string;
  race: string | null;
  gameMode: string;
  energy: number;
  maxEnergy: number;
  credits: number;
  currentSectorId: number;
  tutorialStep: number;
  tutorialCompleted: boolean;
  hasSeenIntro: boolean;
  hasSeenPostTutorial: boolean;
  hasNamingAuthority: boolean;
  hasTransporter: boolean;
  walletAddress: string | null;
  dockedAtOutpostId: string | null;
  landedAtPlanetId: string | null;
  spMissions?: { completed: number; total: number };
  currentShip: {
    id: string;
    shipTypeId: string;
    weaponEnergy: number;
    engineEnergy: number;
    hullHp: number;
    maxHullHp: number;
    cargoHolds: number;
    maxCargoHolds: number;
    cyrilliumCargo: number;
    foodCargo: number;
    techCargo: number;
    colonistsCargo: number;
    colonistsByRace?: { race: string; count: number }[];
  } | null;
}

export interface SectorState {
  sectorId: number;
  type: string;
  regionId: number;
  hasStarMall: boolean;
  spMallLocked: boolean;
  adjacentSectors: { sectorId: number; oneWay: boolean }[];
  players: { id: string; username: string }[];
  outposts: { id: string; name: string }[];
  planets: {
    id: string;
    name: string;
    planetClass: string;
    ownerId: string | null;
    upgradeLevel: number;
  }[];
  deployables: { id: string; type: string; ownerId: string }[];
  events: { id: string; eventType: string }[];
  warpGates: {
    id: string;
    destinationSectorId: number;
    tollAmount: number;
    syndicateFree: boolean;
    syndicateId: string;
  }[];
  npcs?: {
    id: string;
    name: string;
    title: string;
    race: string;
    encountered: boolean;
  }[];
}

export interface TerminalLine {
  id: number;
  text: string;
  type:
    | "info"
    | "success"
    | "error"
    | "warning"
    | "system"
    | "combat"
    | "trade"
    | "npc"
    | "ai";
}

let lineIdCounter = 0;

export function useGameState() {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [sector, setSector] = useState<SectorState | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [sceneQueue, setSceneQueue] = useState<SceneDefinition[]>([]);
  const [combatAnimation, setCombatAnimation] = useState<{
    attackerShipType: string;
    damage: number;
  } | null>(null);

  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // Track action counts for multi-count tutorial steps (e.g., step 4 requires 2 moves)
  const tutorialActionCount = useRef<Record<string, number>>({});

  const MAX_LINES = 200;

  const addLine = useCallback(
    (text: string, type: TerminalLine["type"] = "info") => {
      setLines((prev) => {
        const next = [...prev, { id: lineIdCounter++, text, type }];
        return next.length > MAX_LINES
          ? next.slice(next.length - MAX_LINES)
          : next;
      });
    },
    [],
  );

  const clearLines = useCallback(() => {
    setLines([]);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const { data } = await api.getStatus();
      setPlayer(data);
    } catch (err: any) {
      console.error(
        "[refreshStatus] failed:",
        err.response?.status,
        err.response?.data || err.message,
      );
    }
  }, []);

  const refreshSector = useCallback(async () => {
    try {
      const { data } = await api.getSector();
      setSector(data);
    } catch (err: any) {
      console.error(
        "[refreshSector] failed:",
        err.response?.status,
        err.response?.data || err.message,
      );
    }
  }, []);

  const refreshMap = useCallback(async () => {
    try {
      const { data } = await api.getMap();
      setMapData(data);
    } catch (err: any) {
      console.error(
        "[refreshMap] failed:",
        err.response?.status,
        err.response?.data || err.message,
      );
    }
  }, []);

  const advanceTutorial = useCallback(async (action: string) => {
    // Only attempt if player has an active tutorial
    setPlayer((prev) => {
      if (!prev || prev.tutorialCompleted) return prev;

      // Increment action count
      const counts = tutorialActionCount.current;
      counts[action] = (counts[action] || 0) + 1;

      // Fire and forget the API call
      api
        .advanceTutorial(action, counts[action])
        .then(({ data }) => {
          if (data.advanced) {
            // Reset action counts for the next step
            tutorialActionCount.current = {};

            setPlayer((p) =>
              p
                ? {
                    ...p,
                    tutorialStep: data.currentStep,
                    tutorialCompleted: !!data.completed,
                    credits:
                      data.newCredits ??
                      (data.reward ? p.credits + data.reward : p.credits),
                    currentSectorId: data.newSectorId ?? p.currentSectorId,
                  }
                : null,
            );

            if (data.completed) {
              setLines((l) => [
                ...l,
                {
                  id: lineIdCounter++,
                  text: "TUTORIAL COMPLETE! You earned 5,000 credits.",
                  type: "success",
                },
                {
                  id: lineIdCounter++,
                  text: "Your ship has been placed at a Star Mall. The galaxy is yours to explore, pilot.",
                  type: "system",
                },
              ]);
              // Refresh sector and status to load the real game state
              api
                .getSector()
                .then(({ data: sectorData }) => setSector(sectorData))
                .catch(() => {});
              api
                .getStatus()
                .then(({ data: statusData }) => setPlayer(statusData))
                .catch(() => {});
            } else if (data.nextStep) {
              setLines((l) => [
                ...l,
                {
                  id: lineIdCounter++,
                  text: `[Tutorial ${data.currentStep}/${8}] ${data.nextStep.title}`,
                  type: "system",
                },
                {
                  id: lineIdCounter++,
                  text: data.nextStep.description,
                  type: "info",
                },
              ]);
            }
          }
        })
        .catch(() => {
          /* tutorial advance failed silently */
        });

      return prev;
    });
  }, []);

  const refreshTutorial = useCallback(async () => {
    try {
      const { data } = await api.getTutorialStatus();
      setPlayer((prev) =>
        prev
          ? {
              ...prev,
              tutorialStep: data.currentStep,
              tutorialCompleted: data.completed,
            }
          : null,
      );
      return data;
    } catch (err: any) {
      console.error(
        "[refreshTutorial] failed:",
        err.response?.status,
        err.response?.data || err.message,
      );
      return null;
    }
  }, []);

  const markIntroSeen = useCallback(async () => {
    try {
      await api.markIntroSeen();
      setPlayer((prev) => (prev ? { ...prev, hasSeenIntro: true } : null));
    } catch {
      /* ignore */
    }
  }, []);

  const markPostTutorialSeen = useCallback(async () => {
    try {
      await api.markPostTutorialSeen();
      setPlayer((prev) =>
        prev ? { ...prev, hasSeenPostTutorial: true } : null,
      );
      // Show welcome message with getting-started guidance
      addLine(
        "Welcome to the galaxy, pilot! Here are some suggested next steps:",
        "system",
      );
      addLine("  1. Type 'map' to see your explored sectors", "info");
      addLine("  2. Explore nearby sectors to find a Star Mall", "info");
      addLine("  3. Type 'tips' anytime for contextual guidance", "info");
      addLine("  4. Type 'help' for a list of command categories", "info");
      addLine("  5. Check 'missions' to see your starter missions", "success");
    } catch {
      /* ignore */
    }
  }, [addLine]);

  const skipTutorial = useCallback(async () => {
    try {
      const { data } = await api.skipTutorial();
      setPlayer((prev) =>
        prev
          ? {
              ...prev,
              tutorialCompleted: true,
              tutorialStep: 8,
              currentSectorId: data.newSectorId ?? prev.currentSectorId,
              credits: data.newCredits ?? prev.credits,
            }
          : null,
      );
      addLine("Tutorial skipped.", "system");
      addLine(
        "Your ship has been placed at a Star Mall. The galaxy is yours to explore, pilot.",
        "system",
      );
      await refreshSector();
      await refreshStatus();
    } catch {
      addLine("Failed to skip tutorial", "error");
    }
  }, [addLine, refreshSector, refreshStatus]);

  const enqueueScene = useCallback((scene: SceneDefinition) => {
    setSceneQueue((prev) => [...prev, scene]);
  }, []);

  const dequeueScene = useCallback(() => {
    setSceneQueue((prev) => prev.slice(1));
  }, []);

  const clearCombatAnimation = useCallback(() => {
    setCombatAnimation(null);
  }, []);

  const doLogin = useCallback(
    async (username: string, password: string) => {
      const { data } = await api.login(username, password);
      setPlayer(data.player);
      setIsLoggedIn(true);
      addLine(`Welcome back, ${data.player.username}!`, "system");
      await refreshSector();
      return data.player;
    },
    [addLine, refreshSector],
  );

  const doRegister = useCallback(
    async (username: string, email: string, password: string, race: string) => {
      const { data } = await api.register(username, email, password, race);
      setPlayer(data.player);
      setIsLoggedIn(true);
      addLine(`Welcome to Cosmic Horizon, ${data.player.username}!`, "system");
      addLine(
        `You are a ${data.player.race ? data.player.race.charAt(0).toUpperCase() + data.player.race.slice(1) : "pilot"} stationed at a Star Mall.`,
        "system",
      );
      addLine('Type "help" for a list of commands.', "info");
      await refreshSector();
      return data.player;
    },
    [addLine, refreshSector],
  );

  const doLogout = useCallback(async () => {
    await api.logout();
    setPlayer(null);
    setSector(null);
    setMapData(null);
    setIsLoggedIn(false);
    setLines([]);
    tutorialActionCount.current = {};
  }, []);

  const doMove = useCallback(
    async (sectorId: number) => {
      if (playerRef.current?.dockedAtOutpostId) {
        addLine("You must undock before traveling", "error");
        return;
      }
      if (playerRef.current?.landedAtPlanetId) {
        addLine("You must liftoff before traveling", "error");
        return;
      }
      try {
        const { data } = await api.moveTo(sectorId);
        setPlayer((prev) =>
          prev
            ? {
                ...prev,
                energy: data.energy,
                currentSectorId: data.sectorId,
                dockedAtOutpostId: null,
                landedAtPlanetId: null,
              }
            : null,
        );

        // Enqueue warp animation
        setSceneQueue((_prev) => {
          const shipTypeId = player?.currentShip?.shipTypeId ?? "scout";
          const scenes = [buildWarpScene(shipTypeId)];
          if (data.outposts.length > 0) {
            scenes.push(buildDockingScene(shipTypeId, data.outposts[0].name));
          }
          return scenes;
        });

        addLine(`Warping to sector ${data.sectorId}...`, "info");
        addLine(
          `Arrived in sector ${data.sectorId} [${data.sectorType}]`,
          "success",
        );
        if (data.meteorDamage > 0) {
          addLine(
            `Meteor strike! Hull took ${data.meteorDamage} damage on approach.`,
            "warning",
          );
        }
        if (data.players.length > 0) {
          addLine(
            `Players here: ${data.players.map((p: any) => p.username).join(", ")}`,
            "warning",
          );
        }
        if (data.outposts.length > 0) {
          addLine(
            `Outposts: ${data.outposts.map((o: any) => o.name).join(", ")}`,
            "info",
          );
        }
        if (data.planets.length > 0) {
          addLine(
            `Planets: ${data.planets.map((p: any) => p.name).join(", ")}`,
            "info",
          );
        }
        if (data.npcs?.length > 0) {
          addLine(
            `NPCs: ${data.npcs.map((n: any) => n.name).join(", ")}`,
            "info",
          );
        }
        if (data.npcEncounters?.length > 0) {
          const enc = data.npcEncounters[0];
          addLine(
            `You notice ${enc.name}${enc.title ? `, ${enc.title},` : ""} nearby...`,
            "info",
          );
          const encounterScene = buildNPCEncounterScene({
            name: enc.name,
            title: enc.title,
            race: enc.race,
            spriteConfig: enc.spriteConfig,
            sceneHint: enc.firstEncounter?.sceneHint,
          });
          setSceneQueue((prev) => [...prev, encounterScene]);
          api.markNPCEncountered(enc.id).catch(() => {});
        }
        await refreshSector();
        await refreshStatus();
        await refreshMap();
        advanceTutorial("move");
      } catch (err: any) {
        addLine(err.response?.data?.error || "Move failed", "error");
      }
    },
    [
      addLine,
      refreshSector,
      refreshStatus,
      refreshMap,
      advanceTutorial,
      player?.currentShip?.shipTypeId,
    ],
  );

  const doWarpTo = useCallback(
    async (sectorId: number) => {
      if (playerRef.current?.dockedAtOutpostId) {
        addLine("You must undock before traveling", "error");
        return;
      }
      if (playerRef.current?.landedAtPlanetId) {
        addLine("You must liftoff before traveling", "error");
        return;
      }
      try {
        const { data } = await api.warpTo(sectorId);
        setPlayer((prev) =>
          prev
            ? {
                ...prev,
                energy: data.energy,
                currentSectorId: data.sectorId,
                dockedAtOutpostId: null,
                landedAtPlanetId: null,
              }
            : null,
        );

        // Enqueue warp animation
        setSceneQueue((_prev) => {
          const shipTypeId = player?.currentShip?.shipTypeId ?? "scout";
          const scenes = [buildWarpScene(shipTypeId)];
          if (data.outposts.length > 0) {
            scenes.push(buildDockingScene(shipTypeId, data.outposts[0].name));
          }
          return scenes;
        });

        addLine(
          `Warping to sector ${data.sectorId} (${data.hops} hops, ${data.energyCost} energy)...`,
          "info",
        );
        if (data.path.length > 2) {
          addLine(`Route: ${data.path.join(" > ")}`, "system");
        }
        addLine(
          `Arrived in sector ${data.sectorId} [${data.sectorType}]`,
          "success",
        );
        if (data.newSectorsDiscovered > 0) {
          addLine(
            `Discovered ${data.newSectorsDiscovered} new sector${data.newSectorsDiscovered > 1 ? "s" : ""} along the way`,
            "success",
          );
        }
        if (data.players.length > 0) {
          addLine(
            `Players here: ${data.players.map((p: any) => p.username).join(", ")}`,
            "warning",
          );
        }
        if (data.outposts.length > 0) {
          addLine(
            `Outposts: ${data.outposts.map((o: any) => o.name).join(", ")}`,
            "info",
          );
        }
        if (data.planets.length > 0) {
          addLine(
            `Planets: ${data.planets.map((p: any) => p.name).join(", ")}`,
            "info",
          );
        }
        if (data.npcs?.length > 0) {
          addLine(
            `NPCs: ${data.npcs.map((n: any) => n.name).join(", ")}`,
            "info",
          );
        }
        await refreshSector();
        await refreshStatus();
        await refreshMap();
      } catch (err: any) {
        const errData = err.response?.data;
        if (errData?.hops) {
          addLine(errData.error, "error");
          if (errData.affordable > 0) {
            addLine(
              `You can afford ${errData.affordable} of ${errData.hops} hops`,
              "warning",
            );
          }
        } else {
          addLine(errData?.error || "Warp failed", "error");
        }
      }
    },
    [
      addLine,
      refreshSector,
      refreshStatus,
      refreshMap,
      player?.currentShip?.shipTypeId,
    ],
  );

  const doBuy = useCallback(
    async (outpostId: string, commodity: string, quantity: number) => {
      try {
        const { data } = await api.buyFromOutpost(
          outpostId,
          commodity,
          quantity,
        );
        setPlayer((prev) =>
          prev
            ? { ...prev, credits: data.newCredits, energy: data.energy }
            : null,
        );
        enqueueScene(
          buildTradeScene(
            player?.currentShip?.shipTypeId ?? "scout",
            commodity,
            true,
          ),
        );
        addLine(
          `Bought ${data.quantity} ${commodity} at ${data.pricePerUnit} cr/unit (total: ${data.totalCost} cr)`,
          "trade",
        );
        if (data.message) addLine(data.message, "npc");
        await refreshStatus();
        advanceTutorial("buy");
      } catch (err: any) {
        addLine(err.response?.data?.error || "Purchase failed", "error");
      }
    },
    [
      addLine,
      refreshStatus,
      advanceTutorial,
      enqueueScene,
      player?.currentShip?.shipTypeId,
    ],
  );

  const doSell = useCallback(
    async (outpostId: string, commodity: string, quantity: number) => {
      try {
        const { data } = await api.sellToOutpost(
          outpostId,
          commodity,
          quantity,
        );
        setPlayer((prev) =>
          prev
            ? { ...prev, credits: data.newCredits, energy: data.energy }
            : null,
        );
        enqueueScene(
          buildTradeScene(
            player?.currentShip?.shipTypeId ?? "scout",
            commodity,
            false,
          ),
        );
        addLine(
          `Sold ${data.quantity} ${commodity} at ${data.pricePerUnit} cr/unit (total: ${data.totalCost} cr)`,
          "trade",
        );
        if (data.message) addLine(data.message, "npc");
        await refreshStatus();
        advanceTutorial("sell");
      } catch (err: any) {
        addLine(err.response?.data?.error || "Sale failed", "error");
      }
    },
    [
      addLine,
      refreshStatus,
      advanceTutorial,
      enqueueScene,
      player?.currentShip?.shipTypeId,
    ],
  );

  const doFire = useCallback(
    async (targetPlayerId: string, energy: number) => {
      try {
        const { data } = await api.fire(targetPlayerId, energy);
        setCombatAnimation({
          attackerShipType: player?.currentShip?.shipTypeId ?? "scout",
          damage: data.damageDealt,
        });
        enqueueScene(
          buildCombatScene(
            player?.currentShip?.shipTypeId ?? "scout",
            data.damageDealt,
          ),
        );
        addLine(
          `Fired! Dealt ${data.damageDealt} damage (${data.attackerEnergySpent} energy spent)`,
          "combat",
        );
        if (data.message) addLine(data.message, "npc");
        if (data.defenderDestroyed) {
          addLine("Target destroyed!", "success");
          if (data.killMessage) addLine(data.killMessage, "npc");
        }
        setPlayer((prev) => (prev ? { ...prev, energy: data.energy } : null));
        await refreshStatus();
      } catch (err: any) {
        addLine(err.response?.data?.error || "Attack failed", "error");
      }
    },
    [addLine, refreshStatus, enqueueScene, player?.currentShip?.shipTypeId],
  );

  const doDock = useCallback(async () => {
    try {
      const { data } = await api.dock();
      setPlayer((prev) =>
        prev ? { ...prev, dockedAtOutpostId: data.outpostId } : null,
      );
      const shipTypeId = player?.currentShip?.shipTypeId ?? "scout";
      enqueueScene(buildDockingScene(shipTypeId, data.name));
      addLine(`Docked at ${data.name}`, "success");
      if (data.message) addLine(data.message, "npc");
      if (sector?.hasStarMall) {
        addLine('Star Mall available — type "mall" for services', "info");
      } else {
        addLine('Use "buy/sell <commodity> <qty>" to trade', "info");
      }

      advanceTutorial("dock");
    } catch (err: any) {
      addLine(err.response?.data?.error || "Dock failed", "error");
    }
  }, [
    addLine,
    advanceTutorial,
    enqueueScene,
    player?.currentShip?.shipTypeId,
    sector?.hasStarMall,
  ]);

  const doUndock = useCallback(async () => {
    try {
      const { data } = await api.undock();
      setPlayer((prev) => (prev ? { ...prev, dockedAtOutpostId: null } : null));
      const shipTypeId = player?.currentShip?.shipTypeId ?? "scout";
      enqueueScene(buildUndockScene(shipTypeId));
      addLine("Undocked from outpost", "info");
      if (data.message) addLine(data.message, "npc");
    } catch (err: any) {
      addLine(err.response?.data?.error || "Undock failed", "error");
    }
  }, [addLine, enqueueScene, player?.currentShip?.shipTypeId]);

  const doLand = useCallback(
    async (planetId: string) => {
      if (playerRef.current?.landedAtPlanetId) {
        addLine("You must liftoff before landing on another planet", "error");
        return;
      }
      try {
        const { data } = await api.landOnPlanet(planetId);
        setPlayer((prev) =>
          prev
            ? {
                ...prev,
                landedAtPlanetId: data.planetId,
                dockedAtOutpostId: null,
              }
            : null,
        );
        addLine(`Landed on ${data.name} [${data.className}]`, "success");
        if (data.message) addLine(data.message, "npc");
      } catch (err: any) {
        addLine(err.response?.data?.error || "Landing failed", "error");
      }
    },
    [addLine],
  );

  const doLiftoff = useCallback(async () => {
    try {
      const { data } = await api.liftoff();
      setPlayer((prev) => (prev ? { ...prev, landedAtPlanetId: null } : null));
      addLine("Lifted off from planet", "info");
      if (data.message) addLine(data.message, "npc");
    } catch (err: any) {
      addLine(err.response?.data?.error || "Liftoff failed", "error");
    }
  }, [addLine]);

  const doFlee = useCallback(async () => {
    try {
      const { data } = await api.flee();
      if (data.success) {
        const shipTypeId = player?.currentShip?.shipTypeId ?? "scout";
        enqueueScene(buildFleeScene(shipTypeId));
        addLine("You escaped!", "success");
        if (data.message) addLine(data.message, "npc");
        await refreshSector();
        await refreshStatus();
      } else {
        addLine(
          `Flee failed! (${Math.round(data.fleeChance * 100)}% chance)`,
          "error",
        );
        if (data.message) addLine(data.message, "npc");
      }
    } catch (err: any) {
      addLine(err.response?.data?.error || "Flee failed", "error");
    }
  }, [
    addLine,
    refreshSector,
    refreshStatus,
    enqueueScene,
    player?.currentShip?.shipTypeId,
  ]);

  return {
    player,
    sector,
    lines,
    isLoggedIn,
    mapData,
    addLine,
    clearLines,
    refreshStatus,
    refreshSector,
    refreshMap,
    doLogin,
    doRegister,
    doLogout,
    doMove,
    doWarpTo,
    doBuy,
    doSell,
    doFire,
    doFlee,
    doDock,
    doUndock,
    doLand,
    doLiftoff,
    setPlayer,
    setSector,
    advanceTutorial,
    refreshTutorial,
    skipTutorial,
    markIntroSeen,
    markPostTutorialSeen,
    // Scene animations
    inlineScene: sceneQueue[0] ?? null,
    enqueueScene,
    dequeueScene,
    combatAnimation,
    clearCombatAnimation,
  };
}
