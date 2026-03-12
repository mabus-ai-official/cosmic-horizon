import { useArcadeSession } from "./hooks/useArcadeSession";
import GameSelector from "./GameSelector";
import MatchmakingView from "./MatchmakingView";
import DrinkPhase from "./DrinkPhase";
import ResultsView from "./ResultsView";
import ScoreOverlay from "./ScoreOverlay";
import PhaserGameWrapper from "./PhaserGameWrapper";
import ArcadeShop from "./ArcadeShop";

interface ArcadeContainerProps {
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  emit: (event: string, data: any) => void;
  playerId: string;
  sectorPlayers: { id: string; username: string }[];
  onExit: () => void;
}

export default function ArcadeContainer({
  on,
  emit,
  playerId,
  sectorPlayers,
  onExit,
}: ArcadeContainerProps) {
  const arcade = useArcadeSession(on, emit, playerId);

  const opponentName = arcade.session.opponent?.username || "AI Opponent";
  const isAI = !arcade.session.opponent?.id;
  const gameType = arcade.session.gameType;

  const handleRoundComplete =
    gameType === "turret_defense"
      ? arcade.handleSubmitTurretResult
      : arcade.handleSubmitHits;

  switch (arcade.phase) {
    case "menu":
      return (
        <GameSelector
          sectorPlayers={sectorPlayers}
          playerId={playerId}
          onPlayAI={arcade.handlePlayAI}
          onChallenge={arcade.handleChallenge}
          onOpenShop={arcade.handleOpenShop}
          tokenBalance={arcade.tokenBalance}
          error={arcade.error}
        />
      );

    case "shop":
      return (
        <ArcadeShop
          tokenBalance={arcade.tokenBalance}
          onBalanceChange={arcade.setTokenBalance}
          onBack={arcade.handleCloseShop}
        />
      );

    case "matchmaking":
      return (
        <MatchmakingView
          pendingChallenge={arcade.pendingChallenge}
          onAccept={arcade.handleAcceptChallenge}
          onDecline={arcade.handleDeclineChallenge}
          onCancel={arcade.handleRematch}
          isChallenger={!arcade.pendingChallenge}
        />
      );

    case "playing":
      return (
        <div className="arcade-game-container">
          <ScoreOverlay
            round={arcade.session.round}
            maxRounds={arcade.session.maxRounds}
            myScore={arcade.session.myScore}
            opponentScore={arcade.session.opponentScore}
            opponentName={opponentName}
          />
          {arcade.roundStart && (
            <PhaserGameWrapper
              gameType={gameType}
              roundStart={arcade.roundStart}
              onRoundComplete={handleRoundComplete}
            />
          )}
        </div>
      );

    case "between_rounds":
      return (
        <DrinkPhase
          menu={arcade.drinkMenu}
          timeLimit={15}
          round={arcade.session.round - 1}
          onSelect={arcade.handleSelectDrink}
        />
      );

    case "results":
      return (
        <ResultsView
          myScore={arcade.session.myScore}
          opponentScore={arcade.session.opponentScore}
          winnerId={arcade.session.winnerId}
          playerId={playerId}
          opponentName={opponentName}
          isAI={isAI}
          rewardClaimed={arcade.session.rewardClaimed}
          roundResults={arcade.roundResults}
          onClaim={arcade.handleClaimReward}
          onRematch={arcade.handleRematch}
          onExit={onExit}
        />
      );

    default:
      return null;
  }
}
