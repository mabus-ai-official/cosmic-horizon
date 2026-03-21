/**
 * Game — main game component shell.
 * State ownership lives here; effects, handlers, and sub-components are extracted.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import StatusBar from "../components/StatusBar";
import IntroSequence, {
  INTRO_BEATS,
  POST_TUTORIAL_BEATS,
} from "../components/IntroSequence";
import PixelScene from "../components/PixelScene";
import ActivityBar from "../components/ActivityBar";
import ContextPanel from "../components/ContextPanel";
import NotificationLog from "../components/NotificationLog";
import PanelRouter from "../components/PanelRouter";
import ModalLayer from "../components/ModalLayer";
import StarmallModal from "../components/StarmallModal";
import PanelModal from "../components/PanelModal";
import CommScreen from "../components/CommScreen";
import CombatV2Modal from "../components/CombatV2Modal";
import PlanetExplorerModal from "../planet-explorer/components/PlanetExplorerModal";
import type { CommMessage } from "../components/CommScreen";
import MapArea from "../components/MapArea";
import SectorMap, { type CommodityFilter } from "../components/SectorMap";
import { useToast } from "../hooks/useToast";
import { useEventOverlay } from "../hooks/useEventOverlay";
import { POST_TUTORIAL_SCENE } from "../config/scenes/post-tutorial-scene";
import { useGameState } from "../hooks/useGameState";
import { useSocket } from "../hooks/useSocket";
import { useAudio } from "../hooks/useAudio";
import { useAria } from "../hooks/useAria";
import { useActivePanel } from "../hooks/useActivePanel";
import { useMusicMood } from "../config/music-moods";
import { PANELS, PANEL_GROUPS, type PanelId } from "../types/panels";
import { useGameEffects } from "../hooks/useGameEffects";
import { useGameHandlers } from "../hooks/useGameHandlers";
import { useKeybindings } from "../hooks/useKeybindings";
import { useNarration } from "../hooks/useNarration";
import { useDrunkEffect } from "../hooks/useDrunkEffect";
import {
  INTRO_NARRATION,
  POST_TUTORIAL_NARRATION,
} from "../config/narration-manifest";

interface GameProps {
  onLogout?: () => void;
}

export default function Game({ onLogout }: GameProps) {
  const [panelMinimized, setPanelMinimized] = useState(true);
  const [show2DMap, setShow2DMap] = useState(false);
  const [modalPanel, setModalPanel] = useState<PanelId | null>(null);
  const [showCombatV2, setShowCombatV2] = useState(false);
  const [planetExplorer, setPlanetExplorer] = useState<{
    planetId: string;
    planetName: string;
  } | null>(null);
  const [commMessage, setCommMessage] = useState<CommMessage | null>(null);
  const commIdRef = useRef(0);
  const setCrewInitialTabRef = useRef<
    (tab: "players" | "npcs" | "contacts" | undefined) => void
  >(() => {});

  // Panels that open as modals instead of side panels
  const MODAL_PANELS: Set<PanelId> = new Set([
    "trade",
    "missions",
    "profile",
    "gear",
    "wallet",
    "planets",
    "trade-offers",
    "trade-routes",
    "trade-history",
    "comms",
    "crew",
    "factions",
    "syndicate",
    "actions",
    "intel",
    "codex",
  ]);
  const game = useGameState();
  const { on, emit } = useSocket(game.player?.id ?? null);
  const audio = useAudio();
  const aria = useAria();
  const mood = useMusicMood();
  const {
    activePanel,
    activeGroup,
    selectPanel: rawSelectPanel,
    selectGroup,
    selectTab,
    badges,
    incrementBadge,
    clearBadge,
    groupBadge,
  } = useActivePanel("nav");

  // Wrap selectPanel so it also unminimizes the panel card
  const selectPanel = useCallback(
    (id: PanelId) => {
      rawSelectPanel(id);
      setPanelMinimized(false);
    },
    [rawSelectPanel],
  );

  // Check if a tab should open as a modal
  const isModalTab = useCallback(
    (id: PanelId) => {
      if (MODAL_PANELS.has(id)) return true;
      // Starmall is conditional — only modal when docked at starmall
      if (
        id === "trade" &&
        game.player?.dockedAtOutpostId &&
        game.sector?.hasStarMall
      )
        return true;
      return false;
    },
    [game.player?.dockedAtOutpostId, game.sector?.hasStarMall],
  );

  // Wrap selectGroup: just expand the group, never auto-open a modal
  const wrappedSelectGroup = useCallback(
    (id: any) => {
      selectGroup(id);
    },
    [selectGroup],
  );

  // Wrap selectTab: open modal for modal panels, normal panel otherwise
  // Supports "panel:subtab" hints (e.g., "crew:npcs")
  const wrappedSelectTab = useCallback(
    (id: PanelId | string) => {
      let panelId = id as PanelId;
      let subTab: string | undefined;
      if (typeof id === "string" && id.includes(":")) {
        const [p, s] = id.split(":");
        panelId = p as PanelId;
        subTab = s;
      }
      if (isModalTab(panelId)) {
        if (panelId === "crew" && subTab) {
          setCrewInitialTabRef.current(
            subTab as "players" | "npcs" | "contacts",
          );
        }
        setModalPanel(panelId);
        return;
      }
      setModalPanel(null);
      selectTab(panelId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectTab, isModalTab],
  );

  const { toasts, showToast, dismissToast } = useToast();
  const {
    bindings,
    rebind,
    resetAll: resetAllKeybinds,
    resetOne: resetKeybind,
    keyToGroup,
    getConflicts,
  } = useKeybindings();
  const eventOverlay = useEventOverlay(showToast as any);
  const narration = useNarration(audio.setNarrationDuck);
  const drunk = useDrunkEffect();

  // All side effects: socket listeners, audio sync, story progression, etc.
  const effects = useGameEffects({
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
    narration,
  });

  // Keep ref in sync so wrappedSelectTab can call it
  setCrewInitialTabRef.current = effects.setCrewInitialTab;

  // Bridge ARIA comments into the comm screen (skip during active combat — combat uses comm for battle scenes)
  useEffect(() => {
    if (aria.comment && aria.showComment && !showCombatV2) {
      commIdRef.current++;
      setCommMessage({
        id: commIdRef.current,
        sender: "ARIA",
        text: aria.comment,
        duration: 8000,
      });
    }
  }, [aria.comment, aria.showComment, showCombatV2]);

  // Close mission modal when an event overlay appears (accept, complete, choice, etc.)
  useEffect(() => {
    if (eventOverlay.currentEvent && modalPanel === "missions") {
      setModalPanel(null);
    }
  }, [eventOverlay.currentEvent, modalPanel]);

  // Register global callback for combat V2 session start (from useGameEffects socket listener)
  useEffect(() => {
    (window as any).__openCombatV2 = () => setShowCombatV2(true);
    return () => {
      delete (window as any).__openCombatV2;
    };
  }, []);

  // Check for active combat session on page load (reconnect after refresh)
  useEffect(() => {
    if (!game.player?.id) return;
    import("../services/api").then((api) => {
      api
        .combatV2GetState()
        .then(({ data }) => {
          if (data.inCombat) {
            setShowCombatV2(true);
          }
        })
        .catch(() => {});
    });
  }, [game.player?.id]);

  const dismissComm = useCallback(() => {
    setCommMessage(null);
    aria.dismissComment();
  }, [aria.dismissComment]);

  // All useCallback handlers for user interactions
  const handlers = useGameHandlers({
    game,
    emit,
    aria,
    audio,
    selectPanel,
    selectGroup,
    selectTab: wrappedSelectTab,
    eventOverlay,
    lastListingRef: effects.lastListingRef,
    setChatMessages: effects.setChatMessages,
    setRefreshKey: effects.setRefreshKey,
    setShowArcade: effects.setShowArcade,
    setCrewInitialTab: effects.setCrewInitialTab,
    setAutoTalkNpcId: effects.setAutoTalkNpcId,
    refreshAlliances: effects.refreshAlliances,
    refreshSyndicateStatus: effects.refreshSyndicateStatus,
  });

  const activeOutpost = game.player?.dockedAtOutpostId ?? null;
  const atStarMall = !!activeOutpost && !!game.sector?.hasStarMall;

  // Dynamic panel label: "STARMALL" when docked at starmall, "OUTPOST" when docked at outpost
  const getPanelLabel = (panelId: string) => {
    if (panelId === "trade") {
      if (atStarMall) return "STARMALL";
      if (activeOutpost) return "OUTPOST";
      return "MARKET";
    }
    return PANELS.find((p) => p.id === panelId)?.label;
  };

  // Must define all hooks before any early returns (React rules of hooks)
  const handlePostTutorialComplete = useCallback(() => {
    game.markPostTutorialSeen();
    setPanelMinimized(true);
  }, [game.markPostTutorialSeen]);

  // Wait for player data to load before rendering anything
  if (!game.player) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#000",
          color: "#0ff",
          fontFamily: "monospace",
          fontSize: "14px",
        }}
      >
        Initializing systems...
      </div>
    );
  }

  // Show intro lore sequence on first login (before tutorial)
  if (!game.player.hasSeenIntro) {
    return (
      <IntroSequence
        beats={INTRO_BEATS}
        onComplete={game.markIntroSeen}
        title="THE AGARICALIS SAGA"
        trackId="intro"
        onTrackRequest={handlers.handleTrackRequest}
        onAudioResume={audio.resume}
        narrationUrls={INTRO_NARRATION}
        narrationEnabled={narration.narrationEnabled}
        narrationVolume={narration.narrationVolume}
        setVolumeMultiplier={audio.setNarrationDuck}
      />
    );
  }

  if (
    game.player &&
    game.player.tutorialCompleted &&
    !game.player.hasSeenPostTutorial
  ) {
    if (effects.showPostTutorialScene) {
      return (
        <PixelScene
          scene={POST_TUTORIAL_SCENE}
          renderMode="fullscreen"
          onComplete={handlePostTutorialComplete}
          onSkip={handlePostTutorialComplete}
        />
      );
    }
    return (
      <IntroSequence
        beats={POST_TUTORIAL_BEATS}
        onComplete={() => effects.setShowPostTutorialScene(true)}
        title="THE FRONTIER AWAITS"
        buttonLabel="BEGIN YOUR JOURNEY"
        trackId="post-tutorial"
        onTrackRequest={handlers.handleTrackRequest}
        onAudioResume={audio.resume}
        narrationUrls={POST_TUTORIAL_NARRATION}
        narrationEnabled={narration.narrationEnabled}
        narrationVolume={narration.narrationVolume}
        setVolumeMultiplier={audio.setNarrationDuck}
      />
    );
  }

  return (
    <>
      <div
        className={`game-layout${drunk.intensity > 0 ? ` drunk-wobble--level-${Math.min(drunk.intensity, 6)}` : ""}`}
        style={
          drunk.intensity > 0
            ? { filter: `url(#drunk-wave-${Math.min(drunk.intensity, 6)})` }
            : undefined
        }
      >
        {/* SVG filters for wavy distortion */}
        {drunk.intensity > 0 && (
          <svg style={{ position: "absolute", width: 0, height: 0 }}>
            <defs>
              <filter id="drunk-wave-1">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.015 0.0"
                  numOctaves="1"
                  seed="1"
                >
                  <animate
                    attributeName="baseFrequency"
                    values="0.015 0.0;0.012 0.0;0.015 0.0"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  in="SourceGraphic"
                  scale="4"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
              <filter id="drunk-wave-2">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.012 0.0"
                  numOctaves="1"
                  seed="2"
                >
                  <animate
                    attributeName="baseFrequency"
                    values="0.012 0.0;0.008 0.0;0.012 0.0"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  in="SourceGraphic"
                  scale="8"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
              <filter id="drunk-wave-3">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.01 0.0"
                  numOctaves="2"
                  seed="3"
                >
                  <animate
                    attributeName="baseFrequency"
                    values="0.01 0.0;0.006 0.0;0.01 0.0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  in="SourceGraphic"
                  scale="14"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
              <filter id="drunk-wave-4">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.008 0.002"
                  numOctaves="2"
                  seed="4"
                >
                  <animate
                    attributeName="baseFrequency"
                    values="0.008 0.002;0.005 0.001;0.008 0.002"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  in="SourceGraphic"
                  scale="22"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
              <filter id="drunk-wave-5">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.007 0.003"
                  numOctaves="2"
                  seed="5"
                >
                  <animate
                    attributeName="baseFrequency"
                    values="0.007 0.003;0.004 0.001;0.007 0.003"
                    dur="1.4s"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  in="SourceGraphic"
                  scale="32"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
              <filter id="drunk-wave-6">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.006 0.004"
                  numOctaves="3"
                  seed="6"
                >
                  <animate
                    attributeName="baseFrequency"
                    values="0.006 0.004;0.003 0.002;0.006 0.004"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  in="SourceGraphic"
                  scale="45"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>
        )}
        {/* Drunk effect overlay (blur + color only) */}
        {drunk.intensity > 0 && (
          <div
            className={`drunk-overlay drunk-overlay--level-${Math.min(drunk.intensity, 6)}`}
          />
        )}

        {/* Screen-edge vignette flashes */}
        {effects.combatFlash && <div className="combat-vignette-flash" />}
        {effects.merchantFlash && <div className="merchant-vignette-flash" />}
        {effects.eventFlash && <div className="event-vignette-flash" />}
        {effects.encounterFlash && <div className="encounter-vignette-flash" />}
        {effects.tradeFlash && <div className="trade-vignette-flash" />}

        <ModalLayer
          aria={aria}
          toasts={toasts}
          dismissToast={dismissToast}
          eventOverlay={eventOverlay}
          narration={narration}
          showSPComplete={effects.showSPComplete}
          setShowSPComplete={effects.setShowSPComplete}
          showSettings={effects.showSettings}
          setShowSettings={effects.setShowSettings}
          showArcade={effects.showArcade}
          setShowArcade={effects.setShowArcade}
          chatMessages={effects.chatMessages}
          game={game}
          audio={audio}
          onLogout={onLogout}
          onCommand={handlers.onCommand}
          activePanel={activePanel}
          selectPanel={selectPanel}
          on={on}
          emit={emit}
          keybindings={bindings}
          keybindConflicts={getConflicts()}
          onRebind={rebind}
          onResetKeybind={resetKeybind}
          onResetAllKeybinds={resetAllKeybinds}
        />

        {/* Full-screen map background */}
        <div className="game-map-fullscreen">
          <MapArea
            combatFlash={effects.combatFlash}
            mapData={game.mapData}
            currentSectorId={game.player?.currentSectorId ?? null}
            adjacentSectorIds={
              game.sector?.adjacentSectors?.map((a: any) => a.sectorId) || []
            }
            onMoveToSector={handlers.handleMove}
            onCurrentSectorClick={() => {
              selectPanel("nav");
              setPanelMinimized(false);
            }}
          />
        </div>

        {/* Glassmorphism status bar */}
        <StatusBar
          player={game.player}
          paused={audio.paused}
          onTogglePause={audio.togglePause}
          onSkipTrack={audio.skip}
          onPrevTrack={audio.previous}
          canSkipTrack={audio.canSkip}
          canPrevTrack={audio.canPrevious}
          currentTrackId={audio.currentTrackId}
          onSettings={() => effects.setShowSettings((v) => !v)}
          onLogout={onLogout}
        />

        {/* Floating overlays */}
        <div className="game-main">
          <ActivityBar
            activePanel={activePanel}
            activeGroup={activeGroup}
            onSelectGroup={wrappedSelectGroup}
            onSelectTab={wrappedSelectTab}
            badges={badges}
            tabLabelOverrides={
              atStarMall
                ? { trade: "Starmall" }
                : activeOutpost
                  ? { trade: "Outpost" }
                  : undefined
            }
            groupBadge={groupBadge}
            keyToGroup={keyToGroup}
            onMapClick={() => setShow2DMap(true)}
            panelMinimized={panelMinimized}
            onRestorePanel={() => setPanelMinimized(false)}
            isAdmin={game.player?.username === "zaphodthebeebs"}
          />

          {/* Notification log — floating bar under status bar */}
          <div className="game-log-bar">
            <NotificationLog lines={game.lines} onClear={game.clearLines} />
          </div>

          {/* Bottom cards — independent, hidden individually or when 2D map is open */}
          {!show2DMap && (
            <div className="game-bottom-cards">
              {/* Panel card — only for non-modal panels */}
              {!panelMinimized &&
                !modalPanel &&
                !isModalTab(activePanel as PanelId) && (
                  <div className="game-panel-card">
                    <div className="game-card-header">
                      <button
                        className="game-card-toggle"
                        onClick={() => setPanelMinimized(true)}
                        title="Minimize panel"
                      >
                        [{"\u2212"}]
                      </button>
                      <span className="game-card-label">
                        {getPanelLabel(activePanel)}
                      </span>
                    </div>
                    <div className="game-panel-card__body">
                      <PanelRouter
                        activePanel={activePanel}
                        game={game}
                        refreshKey={effects.refreshKey}
                        setRefreshKey={effects.setRefreshKey}
                        activeOutpost={activeOutpost}
                        handleMove={handlers.handleMove}
                        handleFire={handlers.handleFire}
                        handleBuy={handlers.handleBuy}
                        handleSell={handlers.handleSell}
                        handleDock={handlers.handleDock}
                        handleUndock={handlers.handleUndock}
                        handleLiftoff={handlers.handleLiftoff}
                        handleActionButton={handlers.handleActionButton}
                        handleNPCClick={handlers.handleNPCClick}
                        handleItemUsed={handlers.handleItemUsed}
                        handleChatSend={handlers.handleChatSend}
                        selectPanel={selectPanel}
                        selectTab={wrappedSelectTab}
                        chatMessages={effects.chatMessages}
                        alliedPlayerIds={effects.alliedPlayerIds}
                        pendingAllianceIds={effects.pendingAllianceIds}
                        refreshAlliances={effects.refreshAlliances}
                        hasSyndicate={effects.hasSyndicate}
                        hasAlliance={effects.hasAlliance}
                        crewInitialTab={effects.crewInitialTab}
                        autoTalkNpcId={effects.autoTalkNpcId}
                        setShowArcade={effects.setShowArcade}
                        clearBadge={clearBadge}
                        aria={aria}
                        eventOverlay={eventOverlay}
                        showToast={showToast}
                        onDrink={drunk.addDrink}
                        combatV2Enabled={true}
                        onCombatV2Start={() => setShowCombatV2(true)}
                        onExplore={(planetId: string, planetName: string) =>
                          setPlanetExplorer({ planetId, planetName })
                        }
                      />
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Comm screen — Star Fox-style floating overlay */}
          <CommScreen message={commMessage} onDismiss={dismissComm} />

          {/* Floating context panel */}
          <ContextPanel
            player={game.player}
            chatMessages={effects.chatMessages}
            onChatSend={handlers.handleChatSend}
            onCommand={handlers.onCommand}
            hasSyndicate={effects.hasSyndicate}
            syndicateInfo={effects.syndicateInfo}
            hasAlliance={effects.hasAlliance}
            refreshKey={effects.refreshKey}
          />
        </div>

        {/* 2D map modal — rendered at top level for proper z-index */}
        {show2DMap && (
          <div
            className="map-modal-overlay"
            onClick={() => setShow2DMap(false)}
          >
            <div className="map-modal" onClick={(e) => e.stopPropagation()}>
              <div
                className="map-modal__header"
                style={{ flexDirection: "column", alignItems: "stretch" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span className="map-modal__title">SECTOR MAP</span>
                  <button
                    className="map-modal__close"
                    onClick={() => setShow2DMap(false)}
                  >
                    ✕
                  </button>
                </div>
                <div
                  className="map-commodity-filters map-commodity-filters--modal"
                  style={{ marginTop: 6 }}
                >
                  {(
                    [
                      ["buys_cyr", "Sell Cyr", "var(--cyan)"],
                      ["sells_cyr", "Buy Cyr", "var(--cyan)"],
                      ["buys_food", "Sell Food", "var(--green)"],
                      ["sells_food", "Buy Food", "var(--green)"],
                      ["buys_tech", "Sell Tech", "var(--purple)"],
                      ["sells_tech", "Buy Tech", "var(--purple)"],
                      ["buys_vedic", "Sell VCry", "var(--magenta, #c0f)"],
                      ["sells_vedic", "Buy VCry", "var(--magenta, #c0f)"],
                      ["sells_fuel", "Fuel", "var(--yellow)"],
                    ] as [CommodityFilter, string, string][]
                  ).map(([key, label, color]) => (
                    <button
                      key={key}
                      className={`map-filter-btn${effects.commodityFilter === key ? " map-filter-btn--active" : ""}`}
                      style={{
                        borderColor:
                          effects.commodityFilter === key ? color : undefined,
                        color:
                          effects.commodityFilter === key ? color : undefined,
                      }}
                      onClick={() =>
                        effects.setCommodityFilter(
                          effects.commodityFilter === key ? null : key,
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="map-modal__body">
                <SectorMap
                  mapData={game.mapData}
                  currentSectorId={game.player?.currentSectorId ?? null}
                  adjacentSectorIds={
                    game.sector?.adjacentSectors?.map((a: any) => a.sectorId) ||
                    []
                  }
                  onMoveToSector={(id) => {
                    handlers.handleMove(id);
                    setShow2DMap(false);
                  }}
                  commodityFilter={effects.commodityFilter}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals rendered OUTSIDE game-layout to avoid CSS filter breaking position:fixed */}
      {/* Drunk blur overlay covers modals too */}
      {drunk.intensity > 0 && modalPanel && (
        <div
          className={`drunk-overlay drunk-overlay--level-${Math.min(drunk.intensity, 6)}`}
          style={{ zIndex: 99 }}
        />
      )}
      {modalPanel === "trade" && atStarMall && (
        <StarmallModal
          outpostId={activeOutpost}
          onBuy={handlers.handleBuy}
          onSell={handlers.handleSell}
          credits={game.player?.credits ?? 0}
          energy={game.player?.energy ?? 0}
          maxEnergy={game.player?.maxEnergy ?? 100}
          playerLevel={game.player?.level}
          onAction={() => {
            game.refreshStatus();
            effects.setRefreshKey((k: number) => k + 1);
            aria.triggerTrade();
          }}
          onArcade={() => effects.setShowArcade(true)}
          showToast={showToast}
          onDrink={drunk.addDrink}
          onStoryEvent={(data: any) => eventOverlay.enqueueEvent(data)}
          onClose={() => setModalPanel(null)}
        />
      )}

      {modalPanel && !(modalPanel === "trade" && atStarMall) && (
        <PanelModal
          title={getPanelLabel(modalPanel) ?? modalPanel.toUpperCase()}
          accentColor={
            PANEL_GROUPS.find((g) => g.tabs.some((t) => t.id === modalPanel))
              ?.accentColor ?? "var(--cyan)"
          }
          onClose={() => setModalPanel(null)}
        >
          <PanelRouter
            activePanel={modalPanel}
            game={game}
            refreshKey={effects.refreshKey}
            setRefreshKey={effects.setRefreshKey}
            activeOutpost={activeOutpost}
            handleMove={handlers.handleMove}
            handleFire={handlers.handleFire}
            handleBuy={handlers.handleBuy}
            handleSell={handlers.handleSell}
            handleDock={handlers.handleDock}
            handleUndock={handlers.handleUndock}
            handleLiftoff={handlers.handleLiftoff}
            handleActionButton={handlers.handleActionButton}
            handleNPCClick={handlers.handleNPCClick}
            handleItemUsed={handlers.handleItemUsed}
            handleChatSend={handlers.handleChatSend}
            selectPanel={selectPanel}
            selectTab={wrappedSelectTab}
            chatMessages={effects.chatMessages}
            alliedPlayerIds={effects.alliedPlayerIds}
            pendingAllianceIds={effects.pendingAllianceIds}
            refreshAlliances={effects.refreshAlliances}
            hasSyndicate={effects.hasSyndicate}
            hasAlliance={effects.hasAlliance}
            crewInitialTab={effects.crewInitialTab}
            autoTalkNpcId={effects.autoTalkNpcId}
            setShowArcade={effects.setShowArcade}
            clearBadge={clearBadge}
            aria={aria}
            eventOverlay={eventOverlay}
            showToast={showToast}
            onDrink={drunk.addDrink}
            combatV2Enabled={true}
            onCombatV2Start={() => setShowCombatV2(true)}
            onExplore={(planetId: string, planetName: string) =>
              setPlanetExplorer({ planetId, planetName })
            }
          />
        </PanelModal>
      )}
      {/* Planet Explorer Modal — rendered when exploring a planet surface */}
      {planetExplorer && game.player?.id && (
        <PlanetExplorerModal
          planetId={planetExplorer.planetId}
          planetName={planetExplorer.planetName}
          playerId={game.player.id}
          on={on}
          emit={emit}
          onClose={() => {
            setPlanetExplorer(null);
            game.refreshStatus();
            game.refreshSector();
          }}
        />
      )}
      {/* Combat V2 Modal — rendered when in active combat session */}
      {showCombatV2 && game.player?.id && (
        <CombatV2Modal
          playerId={game.player.id}
          playerName={game.player.username}
          on={on}
          onClose={() => {
            setShowCombatV2(false);
            game.refreshStatus();
            game.refreshSector();
          }}
          onCommMessage={setCommMessage}
        />
      )}
    </>
  );
}
