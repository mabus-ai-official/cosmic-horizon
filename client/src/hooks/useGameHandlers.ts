/**
 * useGameHandlers — all useCallback handlers extracted from Game.tsx.
 * Returns a flat object of handler functions used by the game UI.
 */
import { useCallback } from "react";
import { handleCommand } from "../services/commands";
import {
  hasSeenFirstTime,
  markFirstTimeSeen,
  FIRST_TIME_EVENTS,
} from "../config/first-time-events";
import type { ChatMessage, ChatChannel } from "../components/SectorChatPanel";

let chatIdCounter = 0;

interface UseGameHandlersParams {
  game: any;
  emit: (event: string, data: any) => void;
  aria: any;
  audio: any;
  selectPanel: (id: any) => void;
  selectGroup: (id: any) => void;
  selectTab: (id: any) => void;
  eventOverlay: any;
  lastListingRef: React.MutableRefObject<
    { id: string; label: string }[] | null
  >;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  setShowArcade: React.Dispatch<React.SetStateAction<boolean>>;
  setCrewInitialTab: React.Dispatch<
    React.SetStateAction<"players" | "npcs" | "contacts" | undefined>
  >;
  setAutoTalkNpcId: React.Dispatch<React.SetStateAction<string | null>>;
  refreshAlliances: () => void;
  refreshSyndicateStatus: () => void;
}

export function useGameHandlers({
  game,
  emit,
  aria,
  audio,
  selectPanel,
  selectGroup,
  selectTab,
  eventOverlay,
  lastListingRef,
  setChatMessages,
  setRefreshKey,
  setShowArcade,
  setCrewInitialTab,
  setAutoTalkNpcId,
  refreshAlliances,
  refreshSyndicateStatus,
}: UseGameHandlersParams) {
  const onCommand = useCallback(
    (input: string) => {
      aria.resetIdleTimer();
      const lower = input.trim().toLowerCase();
      if (lower === "arcade" || lower === "play") {
        setShowArcade(true);
        return;
      }
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

  const handleActionButton = useCallback(
    (cmd: string) => {
      onCommand(cmd);
    },
    [onCommand],
  );

  const handleMove = useCallback(
    (sectorId: number) => {
      game.doMove(sectorId);
    },
    [game.doMove],
  );

  const handleUndock = useCallback(() => {
    game.doUndock();
  }, [game.doUndock]);

  const handleLiftoff = useCallback(() => {
    game.doLiftoff();
  }, [game.doLiftoff]);

  const handleFire = useCallback(
    (targetId: string, energy: number) => {
      game.doFire(targetId, energy);
    },
    [game.doFire],
  );

  const handleBuy = useCallback(
    (outpostId: string, commodity: string, qty: number) => {
      return game.doBuy(outpostId, commodity, qty);
    },
    [game.doBuy],
  );

  const handleSell = useCallback(
    (outpostId: string, commodity: string, qty: number) => {
      return game.doSell(outpostId, commodity, qty);
    },
    [game.doSell],
  );

  const handleSelectGroup = useCallback(
    (id: any) => {
      selectGroup(id);
    },
    [selectGroup],
  );

  const handleSelectTab = useCallback(
    (id: any) => {
      selectTab(id);
    },
    [selectTab],
  );

  const handleDock = useCallback(async () => {
    await game.doDock();
    selectTab("trade");
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
  }, [game.doDock, selectTab, aria.triggerDock]);

  const handleNPCClick = useCallback(
    (npcId: string) => {
      setCrewInitialTab("npcs");
      setAutoTalkNpcId(npcId || null);
      selectPanel("crew");
    },
    [selectPanel],
  );

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
      } else if (channel === "galaxy") {
        emit("chat:galaxy", { message });
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

  return {
    onCommand,
    handleActionButton,
    handleMove,
    handleUndock,
    handleLiftoff,
    handleFire,
    handleBuy,
    handleSell,
    handleSelectGroup,
    handleSelectTab,
    handleDock,
    handleNPCClick,
    handleChatSend,
    handleItemUsed,
    handleTrackRequest,
    refreshAlliances,
    refreshSyndicateStatus,
  };
}
