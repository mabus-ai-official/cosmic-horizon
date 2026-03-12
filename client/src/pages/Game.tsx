/**
 * Game — main game component shell.
 * State ownership lives here; effects, handlers, and sub-components are extracted.
 */
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
import { useToast } from "../hooks/useToast";
import { useEventOverlay } from "../hooks/useEventOverlay";
import { POST_TUTORIAL_SCENE } from "../config/scenes/post-tutorial-scene";
import { useGameState } from "../hooks/useGameState";
import { useSocket } from "../hooks/useSocket";
import { useAudio } from "../hooks/useAudio";
import { useAria } from "../hooks/useAria";
import { useActivePanel } from "../hooks/useActivePanel";
import { useMusicMood } from "../config/music-moods";
import { PANELS } from "../types/panels";
import { useGameEffects } from "../hooks/useGameEffects";
import { useGameHandlers } from "../hooks/useGameHandlers";

interface GameProps {
  onLogout?: () => void;
}

export default function Game({ onLogout }: GameProps) {
  const game = useGameState();
  const { on, emit } = useSocket(game.player?.id ?? null);
  const audio = useAudio();
  const aria = useAria();
  const mood = useMusicMood();
  const {
    activePanel,
    activeGroup,
    selectPanel,
    selectGroup,
    selectTab,
    badges,
    incrementBadge,
    groupBadge,
  } = useActivePanel("nav");
  const { toasts, showToast, dismissToast } = useToast();
  const eventOverlay = useEventOverlay(showToast as any);

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

  // Show intro lore sequence on first login (before tutorial)
  if (game.player && !game.player.hasSeenIntro) {
    return (
      <IntroSequence
        beats={INTRO_BEATS}
        onComplete={game.markIntroSeen}
        title="THE AGARICALIS SAGA"
        trackId="intro"
        onTrackRequest={handlers.handleTrackRequest}
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
    if (effects.showPostTutorialScene) {
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
        onComplete={() => effects.setShowPostTutorialScene(true)}
        title="THE FRONTIER AWAITS"
        buttonLabel="BEGIN YOUR JOURNEY"
        trackId="post-tutorial"
        onTrackRequest={handlers.handleTrackRequest}
        onAudioResume={audio.resume}
      />
    );
  }

  return (
    <div className="game-layout">
      <ModalLayer
        aria={aria}
        toasts={toasts}
        dismissToast={dismissToast}
        eventOverlay={eventOverlay}
        showSPComplete={effects.showSPComplete}
        setShowSPComplete={effects.setShowSPComplete}
        showSettings={effects.showSettings}
        setShowSettings={effects.setShowSettings}
        showArcade={effects.showArcade}
        setShowArcade={effects.setShowArcade}
        chatMessages={effects.chatMessages}
        game={game}
        audio={audio}
        map3D={effects.map3D}
        setMap3D={effects.setMap3D}
        onLogout={onLogout}
        onCommand={handlers.onCommand}
        activePanel={activePanel}
        selectPanel={selectPanel}
        on={on}
        emit={emit}
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
        onSettings={() => effects.setShowSettings((v) => !v)}
        onLogout={onLogout}
      />
      <div className="game-main">
        <ActivityBar
          activePanel={activePanel}
          activeGroup={activeGroup}
          onSelectGroup={handlers.handleSelectGroup}
          onSelectTab={handlers.handleSelectTab}
          badges={badges}
          groupBadge={groupBadge}
        />
        <div className="game-center">
          <MapArea
            map3D={effects.map3D}
            setMap3D={effects.setMap3D}
            commodityFilter={effects.commodityFilter}
            setCommodityFilter={effects.setCommodityFilter}
            combatFlash={effects.combatFlash}
            mapData={game.mapData}
            currentSectorId={game.player?.currentSectorId ?? null}
            adjacentSectorIds={
              game.sector?.adjacentSectors?.map((a: any) => a.sectorId) || []
            }
            onMoveToSector={handlers.handleMove}
          />
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
              />
            </div>
            <div className="game-viewport-wrapper">
              <div className="panel-area-header">BRIDGE VIEW</div>
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
          <NotificationLog lines={game.lines} onClear={game.clearLines} />
        </div>
        <ContextPanel
          player={game.player}
          chatMessages={effects.chatMessages}
          onChatSend={handlers.handleChatSend}
          onCommand={handlers.onCommand}
          hasSyndicate={effects.hasSyndicate}
          hasAlliance={effects.hasAlliance}
          refreshKey={effects.refreshKey}
        />
      </div>
    </div>
  );
}
