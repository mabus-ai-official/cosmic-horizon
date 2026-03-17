/**
 * Game — main game component shell.
 * State ownership lives here; effects, handlers, and sub-components are extracted.
 */
import { useState, useCallback } from "react";
import StatusBar from "../components/StatusBar";
import IntroSequence, {
  INTRO_BEATS,
  POST_TUTORIAL_BEATS,
} from "../components/IntroSequence";
import PixelScene from "../components/PixelScene";
import SectorViewport from "../components/viewport/SectorViewport";
import ActivityBar from "../components/ActivityBar";
import PixelSprite from "../components/PixelSprite";
import ContextPanel from "../components/ContextPanel";
import NotificationLog from "../components/NotificationLog";
import FloatingNumbers from "../components/FloatingNumbers";
import PanelRouter from "../components/PanelRouter";
import ModalLayer from "../components/ModalLayer";
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
import { PANELS, type PanelId } from "../types/panels";
import { useGameEffects } from "../hooks/useGameEffects";
import { useGameHandlers } from "../hooks/useGameHandlers";
import { useKeybindings } from "../hooks/useKeybindings";
import { useNarration } from "../hooks/useNarration";
import {
  INTRO_NARRATION,
  POST_TUTORIAL_NARRATION,
} from "../config/narration-manifest";

interface GameProps {
  onLogout?: () => void;
}

export default function Game({ onLogout }: GameProps) {
  const [panelMinimized, setPanelMinimized] = useState(true);
  const [viewportMinimized, setViewportMinimized] = useState(true);
  const [show2DMap, setShow2DMap] = useState(false);
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

  // All useCallback handlers for user interactions
  const handlers = useGameHandlers({
    game,
    emit,
    aria,
    audio,
    selectPanel,
    selectGroup,
    selectTab,
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

  // Must define all hooks before any early returns (React rules of hooks)
  const handlePostTutorialComplete = useCallback(() => {
    game.markPostTutorialSeen();
    setPanelMinimized(true);
    setViewportMinimized(true);
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
    <div className="game-layout">
      {/* Screen-edge red vignette flash for combat/ambush */}
      {effects.combatFlash && <div className="combat-vignette-flash" />}
      {/* Magenta vignette flash for merchant encounter */}
      {effects.merchantFlash && <div className="merchant-vignette-flash" />}

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
        muted={audio.muted}
        paused={audio.paused}
        onToggleMute={audio.toggleMute}
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
          onSelectGroup={handlers.handleSelectGroup}
          onSelectTab={handlers.handleSelectTab}
          badges={badges}
          groupBadge={groupBadge}
          keyToGroup={keyToGroup}
          onMapClick={() => setShow2DMap(true)}
          panelMinimized={panelMinimized}
          onRestorePanel={() => setPanelMinimized(false)}
          viewportMinimized={viewportMinimized}
          onToggleViewport={() => setViewportMinimized((v) => !v)}
        />

        {/* Notification log — floating bar under status bar */}
        <div className="game-log-bar">
          <NotificationLog lines={game.lines} onClear={game.clearLines} />
        </div>

        {/* Bottom cards — independent, hidden individually or when 2D map is open */}
        {!show2DMap && (
          <div className="game-bottom-cards">
            {/* Panel card (left) */}
            {!panelMinimized && (
              <div className="game-panel-card">
                <div className="game-card-header">
                  <button
                    className="game-card-toggle"
                    onClick={() => setPanelMinimized(true)}
                    title="Minimize panel"
                  >
                    [{"\u2212"}]
                  </button>
                  <PixelSprite
                    spriteKey={
                      PANELS.find((p) => p.id === activePanel)?.spriteKey ??
                      "icon_nav"
                    }
                    size={14}
                  />
                  <span className="game-card-label">
                    {PANELS.find((p) => p.id === activePanel)?.label}
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
                    selectTab={selectTab}
                    chatMessages={effects.chatMessages}
                    alliedPlayerIds={effects.alliedPlayerIds}
                    pendingAllianceIds={effects.pendingAllianceIds}
                    refreshAlliances={effects.refreshAlliances}
                    hasSyndicate={effects.hasSyndicate}
                    hasAlliance={effects.hasAlliance}
                    crewInitialTab={effects.crewInitialTab}
                    autoTalkNpcId={effects.autoTalkNpcId}
                    setShowArcade={effects.setShowArcade}
                    aria={aria}
                    eventOverlay={eventOverlay}
                    showToast={showToast}
                  />
                </div>
              </div>
            )}

            {/* Bridge view card (right) */}
            {!viewportMinimized && (
              <div className="game-viewport-card">
                <div className="game-card-header">
                  <button
                    className="game-card-toggle"
                    onClick={() => setViewportMinimized(true)}
                    title="Minimize viewscreen"
                  >
                    [{"\u2212"}]
                  </button>
                  <span className="game-card-label">VIEWSCREEN</span>
                </div>
                <div className="game-viewport-card__body">
                  <SectorViewport
                    actionScene={game.inlineScene}
                    ambientScene={effects.ambientScene}
                    onActionComplete={game.dequeueScene}
                    sectorId={game.player?.currentSectorId}
                    shipType={game.player?.currentShip?.shipTypeId}
                    shake={effects.combatShake}
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
            )}
          </div>
        )}

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
        <div className="map-modal-overlay" onClick={() => setShow2DMap(false)}>
          <div className="map-modal" onClick={(e) => e.stopPropagation()}>
            <div className="map-modal__header">
              <span className="map-modal__title">SECTOR MAP</span>
              <div className="map-commodity-filters map-commodity-filters--modal">
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
              <button
                className="map-modal__close"
                onClick={() => setShow2DMap(false)}
              >
                ✕
              </button>
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
  );
}
