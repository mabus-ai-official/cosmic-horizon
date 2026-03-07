import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";

import authRouter from "./api/auth";
import gameRouter from "./api/game";
import tradeRouter from "./api/trade";
import shipsRouter from "./api/ships";
import planetsRouter from "./api/planets";
import combatRouter from "./api/combat";
import socialRouter from "./api/social";
import deployablesRouter from "./api/deployables";
import storeRouter from "./api/store";
import starmallRouter from "./api/starmall";
import tutorialRouter from "./api/tutorial";
import missionsRouter from "./api/missions";
import eventsRouter from "./api/events";
import leaderboardsRouter from "./api/leaderboards";
import messagesRouter from "./api/messages";
import warpGatesRouter from "./api/warp-gates";
import notesRouter from "./api/notes";
import walletRouter from "./api/wallet";
import progressionRouter from "./api/progression";
import npcsRouter from "./api/npcs";
import tabletsRouter from "./api/tablets";
import craftingRouter from "./api/crafting";
import syndicateEconomyRouter from "./api/syndicate-economy";
import syndicateGovernanceRouter from "./api/syndicate-governance";
import sectorsRouter from "./api/sectors";
import tradeRoutesRouter from "./api/trade-routes";
import profileRouter from "./api/profile";
import adminRouter from "./api/admin";
import authMatrixRouter from "./api/auth-matrix";
import aiAssistantRouter from "./api/ai-assistant";
import planetTradesRouter from "./api/planet-trades";
import planetCombatRouter from "./api/planet-combat";
import { setupWebSocket } from "./ws/handlers";
import { startGameTick } from "./engine/game-tick";
import {
  loadTutorialState,
  blockDuringTutorial,
} from "./middleware/tutorial-sandbox";
import { loadSPContext, blockInSinglePlayer } from "./middleware/sp-mode";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

app.set("io", io);

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Session middleware
// In production, use connect-pg-simple with PostgreSQL
const BetterSqlite3 = require("better-sqlite3");
const SqliteStore = require("better-sqlite3-session-store")(session);
const sessionDb = new BetterSqlite3(
  path.join(__dirname, "..", "data", "sessions.sqlite"),
);

const sessionMiddleware = session({
  store: new SqliteStore({
    client: sessionDb,
    expired: { clear: true, intervalMs: 900000 },
  }),
  secret: process.env.SESSION_SECRET || "cosmic-horizon-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});

app.use(sessionMiddleware);

// Share session with Socket.io
io.engine.use(sessionMiddleware);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", game: "Cosmic Horizon" });
});

// API routes
app.use("/api/auth", authRouter);
app.use("/api/auth/matrix", authMatrixRouter);
app.use("/api/game", loadTutorialState, loadSPContext, gameRouter);
app.use("/api/trade", loadTutorialState, loadSPContext, tradeRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/tutorial", tutorialRouter);

// Routes blocked during tutorial
app.use(
  "/api/ships",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  shipsRouter,
);
app.use("/api/planets", loadTutorialState, loadSPContext, planetsRouter);
app.use(
  "/api/combat",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  combatRouter,
);
app.use(
  "/api/social",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  blockInSinglePlayer,
  socialRouter,
);
app.use(
  "/api/deployables",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  deployablesRouter,
);
app.use(
  "/api/store",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  storeRouter,
);
app.use(
  "/api/starmall",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  starmallRouter,
);
app.use(
  "/api/missions",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  missionsRouter,
);
app.use(
  "/api/events",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  eventsRouter,
);
app.use(
  "/api/leaderboards",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  blockInSinglePlayer,
  leaderboardsRouter,
);
app.use(
  "/api/messages",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  blockInSinglePlayer,
  messagesRouter,
);
app.use(
  "/api/warp-gates",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  warpGatesRouter,
);
app.use("/api/notes", loadTutorialState, loadSPContext, notesRouter);
app.use(
  "/api/progression",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  progressionRouter,
);
app.use(
  "/api/npcs",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  npcsRouter,
);
app.use(
  "/api/tablets",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  tabletsRouter,
);
app.use(
  "/api/crafting",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  craftingRouter,
);
app.use(
  "/api/syndicate-economy",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  blockInSinglePlayer,
  syndicateEconomyRouter,
);
app.use(
  "/api/syndicate-governance",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  blockInSinglePlayer,
  syndicateGovernanceRouter,
);
app.use(
  "/api/sectors",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  sectorsRouter,
);
app.use(
  "/api/trade-routes",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  tradeRoutesRouter,
);
app.use("/api/profile", loadTutorialState, loadSPContext, profileRouter);
app.use("/api/admin", adminRouter);
app.use("/api/ai", loadTutorialState, blockDuringTutorial, aiAssistantRouter);
app.use(
  "/api/planet-trades",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  planetTradesRouter,
);
app.use(
  "/api/planet-combat",
  loadTutorialState,
  blockDuringTutorial,
  loadSPContext,
  planetCombatRouter,
);

// WebSocket
setupWebSocket(io);

// Game tick
startGameTick(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Cosmic Horizon server running on port ${PORT}`);
});

export { app, server, io };
