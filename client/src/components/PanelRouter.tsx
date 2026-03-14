/**
 * PanelRouter — renders the active panel based on the current panel ID.
 * Extracted from Game.tsx's renderActivePanel() switch statement.
 */
import MapPanel from "./MapPanel";
import AriaPanel from "./AriaPanel";
import TradeTable from "./TradeTable";
import TradeRoutesPanel from "./TradeRoutesPanel";
import TradeOffersPanel from "./TradeOffersPanel";
import TradeComputerPanel from "./TradeComputerPanel";
import MallPanel from "./MallPanel";
import CombatGroupPanel from "./CombatGroupPanel";
import ActiveMissionsPanel from "./ActiveMissionsPanel";
import ExplorePanel from "./ExplorePanel";
import PlanetsPanel from "./PlanetsPanel";
import CrewGroupPanel from "./CrewGroupPanel";
import GearGroupPanel from "./GearGroupPanel";
import InventoryResourcePanel from "./InventoryResourcePanel";
import CommsGroupPanel from "./CommsGroupPanel";
import SyndicateGroupPanel from "./SyndicateGroupPanel";
import WalletPanel from "./WalletPanel";
import ActionsPanel from "./ActionsPanel";
import NotesPanel from "./NotesPanel";
import IntelLogPanel from "./IntelLogPanel";
import TradeHistoryPanel from "./TradeHistoryPanel";
import ProfilePanel from "./ProfilePanel";
import CodexPanel from "./CodexPanel";
import type { ChatMessage, ChatChannel } from "./SectorChatPanel";
import {
  hasSeenFirstTime,
  markFirstTimeSeen,
  FIRST_TIME_EVENTS,
} from "../config/first-time-events";

interface PanelRouterProps {
  activePanel: string;
  game: any;
  refreshKey: number;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  activeOutpost: string | null;
  handleMove: (sectorId: number) => void;
  handleFire: (targetId: string, energy: number) => void;
  handleBuy: (outpostId: string, commodity: string, qty: number) => any;
  handleSell: (outpostId: string, commodity: string, qty: number) => any;
  handleDock: () => void;
  handleUndock: () => void;
  handleLiftoff: () => void;
  handleActionButton: (cmd: string) => void;
  handleNPCClick: (npcId: string) => void;
  handleItemUsed: () => void;
  handleChatSend: (message: string, channel?: ChatChannel) => void;
  selectPanel: (id: any) => void;
  selectTab: (id: any) => void;
  chatMessages: ChatMessage[];
  alliedPlayerIds: string[];
  pendingAllianceIds: { fromId: string; fromName: string }[];
  refreshAlliances: () => void;
  hasSyndicate: boolean;
  hasAlliance: boolean;
  crewInitialTab: "players" | "npcs" | "contacts" | undefined;
  autoTalkNpcId: string | null;
  setShowArcade: React.Dispatch<React.SetStateAction<boolean>>;
  aria: any;
  eventOverlay: any;
}

export default function PanelRouter({
  activePanel,
  game,
  refreshKey,
  setRefreshKey,
  activeOutpost,
  handleMove,
  handleFire,
  handleBuy,
  handleSell,
  handleDock,
  handleUndock,
  handleLiftoff,
  handleActionButton,
  handleNPCClick,
  handleItemUsed,
  handleChatSend,
  selectPanel,
  selectTab,
  chatMessages,
  alliedPlayerIds,
  pendingAllianceIds,
  refreshAlliances,
  hasSyndicate,
  hasAlliance,
  crewInitialTab,
  autoTalkNpcId,
  setShowArcade,
  aria,
  eventOverlay,
}: PanelRouterProps) {
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
          hasScanner={!!game.player?.currentShip?.hasPlanetaryScanner}
          hasStarMall={!!game.sector?.hasStarMall}
          onDock={handleDock}
          onUndock={handleUndock}
          onLandClick={() => selectPanel("planets")}
          onLiftoff={handleLiftoff}
          exploredSectorIds={game.mapData?.sectors?.map((s: any) => s.id)}
          alliedPlayerIds={alliedPlayerIds}
          bare
        />
      );
    case "aria":
      return <AriaPanel bare onBack={() => selectTab("nav")} />;
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
            onArcade={() => setShowArcade(true)}
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
            if (data.type === "journey_begin") {
              eventOverlay.enqueueEvent({
                category: "story_accept",
                title: data.title,
                subtitle: data.subtitle,
                body: data.body,
                narrationUrl: data.narrationUrl,
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
                narrationUrl: data.narrationUrl,
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
            } else if (data.type === "mission_complete") {
              eventOverlay.enqueueEvent({
                category: "mission_complete",
                title: data.title,
                subtitle: data.subtitle,
                body: data.body,
                narrationUrl: data.narrationUrl,
                colorScheme: "green",
                duration: 6000,
                priority: "interstitial",
                dismissable: true,
              });
            } else {
              eventOverlay.enqueueEvent({
                category: "story_accept",
                title: data.title,
                subtitle: data.subtitle,
                body: data.body,
                narrationUrl: data.narrationUrl,
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
          bare
        />
      );
    case "gear":
      return (
        <GearGroupPanel
          refreshKey={refreshKey}
          onItemUsed={handleItemUsed}
          atStarMall={!!activeOutpost && !!game.sector?.hasStarMall}
          bare
        />
      );
    case "inventory":
      return (
        <InventoryResourcePanel
          refreshKey={refreshKey}
          onAddLine={game.addLine}
          onRefreshStatus={game.refreshStatus}
          onCommand={handleActionButton}
          colonistsByRace={game.player?.currentShip?.colonistsByRace}
          sectorPlayers={game.sector?.players}
          playerId={game.player?.id}
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
    default:
      return null;
  }
}
