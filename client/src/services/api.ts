import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

// Allow the socket hook to tell us which socket is ours so the server
// can exclude us from sync broadcasts (prevents double-refresh).
let _socketId: string | null = null;
export function setSocketId(id: string | null) {
  _socketId = id;
}

api.interceptors.request.use((config) => {
  if (_socketId) {
    config.headers["X-Socket-Id"] = _socketId;
  }
  return config;
});

// Persist JWT token so all requests include it as a Bearer header.
// This works alongside session cookies — whichever auth method reaches
// the server first wins.
function setToken(token: string | null) {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
  }
}

// Restore token on page load (survives refresh)
const savedToken = localStorage.getItem("token");
if (savedToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
}

// Auth
export const register = async (
  username: string,
  email: string,
  password: string,
  race: string,
  gameMode?: string,
) => {
  const res = await api.post("/auth/register", {
    username,
    email,
    password,
    race,
    gameMode,
  });
  if (res.data.token) setToken(res.data.token);
  return res;
};

export const login = async (username: string, password: string) => {
  const res = await api.post("/auth/login", { username, password });
  if (res.data.token) setToken(res.data.token);
  return res;
};

export const logout = async () => {
  const res = await api.post("/auth/logout");
  setToken(null);
  return res;
};

// Matrix widget token login — accepts a pre-issued JWT from the widget auth flow
export const loginWithToken = (token: string) => {
  setToken(token);
};

// Game
export const getStatus = () => api.get("/game/status");
export const moveTo = (sectorId: number) => api.post(`/game/move/${sectorId}`);
export const warpTo = (sectorId: number) =>
  api.post(`/game/warp-to/${sectorId}`);
export const getSector = () => api.get("/game/sector");
export const getNearestStarMall = () => api.get("/game/nearest-starmall");
export const getMap = () => api.get("/game/map");
export const scan = () => api.post("/game/scan");
export const useScanner = () => api.post("/game/use-scanner");
export const dock = () => api.post("/game/dock");
export const undock = () => api.post("/game/undock");
export const landOnPlanet = (planetId: string) =>
  api.post("/game/land", { planetId });
export const liftoff = () => api.post("/game/liftoff");

// Trade
export const getOutpost = (id: string) => api.get(`/trade/outpost/${id}`);
export const buyFromOutpost = (
  outpostId: string,
  commodity: string,
  quantity: number,
) => api.post("/trade/buy", { outpostId, commodity, quantity });
export const sellToOutpost = (
  outpostId: string,
  commodity: string,
  quantity: number,
) => api.post("/trade/sell", { outpostId, commodity, quantity });
export const getTradeDirectory = () => api.get("/trade/directory");

// Ships
export const getDealer = () => api.get("/ships/dealer");
export const buyShip = (shipTypeId: string) =>
  api.post(`/ships/buy/${shipTypeId}`);
export const switchShip = (shipId: string) =>
  api.post(`/ships/switch/${shipId}`);
export const toggleCloak = () => api.post("/ships/cloak");
export const ejectCargo = (commodity: string, quantity: number) =>
  api.post("/ships/eject-cargo", { commodity, quantity });

// Planets
export const getOwnedPlanets = () => api.get("/planets/owned");
export const getDiscoveredPlanets = () => api.get("/planets/discovered");
export const getPlanet = (id: string) => api.get(`/planets/${id}`);
export const claimPlanet = (id: string) => api.post(`/planets/${id}/claim`);
export const colonizePlanet = (id: string, quantity: number, race: string) =>
  api.post(`/planets/${id}/colonize`, { quantity, race });
export const collectColonists = (id: string, quantity: number, race: string) =>
  api.post(`/planets/${id}/collect-colonists`, { quantity, race });
export const depositFood = (id: string, quantity: number) =>
  api.post(`/planets/${id}/deposit-food`, { quantity });
export const depositColonists = (id: string, quantity: number, race: string) =>
  api.post(`/planets/${id}/deposit-colonists`, { quantity, race });
export const getProductionHistory = (id: string, hours?: number) =>
  api.get(`/planets/${id}/production-history`, {
    params: hours ? { hours } : {},
  });
export const upgradePlanet = (id: string) => api.post(`/planets/${id}/upgrade`);
export const namePlanet = (id: string, name: string) =>
  api.post(`/planets/${id}/name`, { name });

// Sectors
export const getSectorInfo = (sectorId: number) =>
  api.get(`/sectors/${sectorId}/info`);
export const claimSector = (sectorId: number, claimType?: string) =>
  api.post(`/sectors/${sectorId}/claim`, { claimType: claimType || "player" });
export const nameSector = (sectorId: number, name: string) =>
  api.post(`/sectors/${sectorId}/name`, { name });
export const conquerSector = (sectorId: number, claimType?: string) =>
  api.post(`/sectors/${sectorId}/conquer`, {
    claimType: claimType || "player",
  });
export const registerSectorFaction = (sectorId: number, factionId: string) =>
  api.post(`/sectors/${sectorId}/register-faction`, { factionId });

// Combat
export const fire = (targetPlayerId: string, energyToExpend: number) =>
  api.post("/combat/fire", { targetPlayerId, energyToExpend });
export const flee = () => api.post("/combat/flee");

// Social
export const toggleAlliance = (playerId: string) =>
  api.post(`/social/alliance/${playerId}`);
export const createSyndicate = (data: {
  name: string;
  motto?: string;
  description?: string;
  recruitment_mode?: string;
  min_level?: number;
  quorum_percent?: number;
  vote_duration_hours?: number;
  succession_rule?: string;
  treasury_withdrawal_limit?: number;
}) => api.post("/social/syndicate/create", data);
export const inviteToSyndicate = (playerId: string) =>
  api.post(`/social/syndicate/invite/${playerId}`);
export const getSyndicate = () => api.get("/social/syndicate");
export const placeBounty = (targetPlayerId: string, amount: number) =>
  api.post("/social/bounty", { targetPlayerId, amount });
export const getBounties = () => api.get("/social/bounties");
export const getBountyHistory = () => api.get("/social/bounties/history");
export const getClaimedBounties = () => api.get("/social/bounties/claimed");
export const getBountiesOnMe = () => api.get("/social/bounties/on-me");
export const getCombatLog = () => api.get("/social/combat-log");

export const getAlliances = () => api.get("/social/alliances");
export const getPendingAlliances = () => api.get("/social/alliance/pending");
export const acceptAlliance = (playerId: string) =>
  api.post(`/social/alliance/${playerId}/accept`);
export const rejectAlliance = (playerId: string) =>
  api.post(`/social/alliance/${playerId}/reject`);
export const toggleSyndicateAlliance = (syndicateId: string) =>
  api.post(`/social/syndicate/alliance/${syndicateId}`);

// Syndicate enhancements
export const leaveSyndicate = () => api.post("/social/syndicate/leave");
export const disbandSyndicate = () => api.post("/social/syndicate/disband");
export const promoteMember = (playerId: string) =>
  api.post(`/social/syndicate/promote/${playerId}`);
export const kickMember = (playerId: string) =>
  api.post(`/social/syndicate/kick/${playerId}`);
export const transferLeadership = (playerId: string) =>
  api.post(`/social/syndicate/transfer/${playerId}`);
export const depositToTreasury = (amount: number) =>
  api.post("/social/syndicate/deposit", { amount });
export const withdrawFromTreasury = (amount: number) =>
  api.post("/social/syndicate/withdraw", { amount });
export const updateCharter = (charter: string) =>
  api.post("/social/syndicate/charter", { charter });

// Deployables
export const deploy = (
  itemId: string,
  tollAmount?: number,
  buoyMessage?: string,
) => api.post("/deployables/deploy", { itemId, tollAmount, buoyMessage });
export const getSectorDeployables = () => api.get("/deployables/sector");
export const getMyDeployables = () => api.get("/deployables/mine");
export const removeDeployable = (id: string) =>
  api.delete(`/deployables/${id}`);
export const maintainDeployable = (id: string) =>
  api.post(`/deployables/${id}/maintain`);

// Store
export const getStoreCatalog = () => api.get("/store/catalog");
export const buyStoreItem = (itemId: string) =>
  api.post(`/store/buy/${itemId}`);
export const useStoreItem = (itemId: string, data?: any) =>
  api.post(`/store/use/${itemId}`, data);
export const getInventory = () => api.get("/store/inventory");
export const refuel = (quantity: number) =>
  api.post("/store/refuel", { quantity });

// Star Mall
export const getStarMallOverview = () => api.get("/starmall/overview");
export const getGarage = () => api.get("/starmall/garage");
export const storeShipInGarage = () => api.post("/starmall/garage/store");
export const retrieveShipFromGarage = (shipId: string) =>
  api.post(`/starmall/garage/retrieve/${shipId}`);
export const getSalvageOptions = () => api.get("/starmall/salvage");
export const salvageShip = (shipId: string) =>
  api.post(`/starmall/salvage/sell/${shipId}`);
export const getCantina = () => api.get("/starmall/cantina");
export const buyCantineIntel = () => api.post("/starmall/cantina/intel");
export const talkBartender = () => api.post("/starmall/cantina/talk");

// Single Player
export const transitionToMP = (force?: boolean) =>
  api.post("/game/transition-to-mp", { force });
export const transitionToSP = () => api.post("/game/transition-to-sp");

// Lore sequences
export const markIntroSeen = () => api.post("/game/seen-intro");
export const markPostTutorialSeen = () => api.post("/game/seen-post-tutorial");

// Tutorial
export const getTutorialStatus = () => api.get("/tutorial/status");
export const advanceTutorial = (action: string, count?: number) =>
  api.post("/tutorial/advance", { action, count });
export const skipTutorial = () => api.post("/tutorial/skip");

// Missions
export const getAvailableMissions = () => api.get("/missions/available");
export const acceptMission = (templateId: string) =>
  api.post(`/missions/accept/${templateId}`);
export const getActiveMissions = () => api.get("/missions/active");
export const getCompletedMissions = () => api.get("/missions/completed");
export const abandonMission = (missionId: string) =>
  api.post(`/missions/abandon/${missionId}`);
export const getClaimableMissions = () => api.get("/missions/claimable");
export const claimMission = (missionId: string) =>
  api.post(`/missions/claim/${missionId}`);

// Story Missions
export const getStoryProgress = () => api.get("/story/progress");
export const getStoryCurrent = () => api.get("/story/current");
export const acceptStoryMission = () => api.post("/story/accept");
export const claimStoryMission = (missionId: string) =>
  api.post(`/story/claim/${missionId}`);
export const abandonStoryMission = (missionId: string) =>
  api.post(`/story/abandon/${missionId}`);
export const getStoryCodex = () => api.get("/story/codex");
export const getStoryRecap = () => api.get("/story/recap");

// Sector Events
export const getSectorEvents = () => api.get("/events/sector");
export const investigateEvent = (eventId: string) =>
  api.post(`/events/investigate/${eventId}`);

// Leaderboards
export const getLeaderboardOverview = () => api.get("/leaderboards");
export const getLeaderboard = (category: string) =>
  api.get(`/leaderboards/${category}`);

// Progression
export const getProfile = () => api.get("/progression/profile");
export const getAchievements = () => api.get("/progression/achievements");
export const getRanks = () => api.get("/progression/ranks");

// Daily Missions
export const getDailyMissions = () => api.get("/daily-missions");
export const claimDailyMission = (id: string) =>
  api.post(`/daily-missions/${id}/claim`);

// Messages
export const getInbox = () => api.get("/messages/inbox");
export const getSentMessages = () => api.get("/messages/sent");
export const readMessage = (id: string) => api.get(`/messages/${id}`);
export const sendMessage = (
  recipientName: string,
  subject: string,
  body: string,
) => api.post("/messages/send", { recipientName, subject, body });
export const deleteMessage = (id: string) => api.delete(`/messages/${id}`);
export const getUnreadCount = () => api.get("/messages/unread-count");

// Notes
export const getNotes = (search?: string) =>
  api.get("/notes", { params: search ? { search } : {} });
export const createNote = (content: string) => api.post("/notes", { content });
export const deleteNote = (id: string) => api.delete(`/notes/${id}`);

// Ship Upgrades
export const getAvailableUpgrades = () => api.get("/starmall/garage/upgrades");
export const getShipUpgrades = () => api.get("/starmall/garage/ship-upgrades");
export const installUpgrade = (upgradeTypeId: string) =>
  api.post(`/starmall/garage/install/${upgradeTypeId}`);
export const uninstallUpgrade = (installId: string) =>
  api.post(`/starmall/garage/uninstall/${installId}`);

// Warp Gates
export const getSectorWarpGates = () => api.get("/warp-gates/sector");
export const buildWarpGate = (destinationSectorId: number) =>
  api.post("/warp-gates/build", { destinationSectorId });
export const useWarpGate = (gateId: string) =>
  api.post(`/warp-gates/use/${gateId}`);
export const setWarpGateToll = (gateId: string, tollAmount: number) =>
  api.post(`/warp-gates/set-toll/${gateId}`, { tollAmount });
export const getSyndicateWarpGates = () => api.get("/warp-gates/syndicate");

// Wallet
export const getWalletNonce = () => api.get("/wallet/nonce");
export const verifyWallet = (message: string, signature: string) =>
  api.post("/wallet/verify", { message, signature });
export const disconnectWallet = () => api.post("/wallet/disconnect");
export const getWalletBalance = () => api.get("/wallet/balance");
export const getWalletStatus = () => api.get("/wallet/status");

// NPCs
export const getNPCsInSector = () => api.get("/npcs/sector");
export const talkToNPC = (npcId: string, choiceIndex?: number) =>
  api.post(
    `/npcs/${npcId}/talk`,
    choiceIndex !== undefined ? { choiceIndex } : {},
  );
export const getContacts = () => api.get("/npcs/contacts");
export const getNPCDetail = (npcId: string) => api.get(`/npcs/${npcId}`);
export const markNPCEncountered = (npcId: string) =>
  api.post(`/npcs/${npcId}/encountered`);
export const getFactionReps = () => api.get("/npcs/factions");
export const getIntelLog = () => api.get("/npcs/intel");
export const getNPCVendor = (npcId: string) => api.get(`/npcs/${npcId}/vendor`);
export const buyFromNPCVendor = (npcId: string, itemId: string) =>
  api.post(`/npcs/${npcId}/vendor/buy`, { itemId });

// Tablets
export const getTablets = () => api.get("/tablets");
export const equipTablet = (tabletId: string, slot: number) =>
  api.post("/tablets/equip", { tabletId, slot });
export const unequipTablet = (slot: number) =>
  api.post("/tablets/unequip", { slot });
export const combineTablets = (tabletIds: string[]) =>
  api.post("/tablets/combine", { tabletIds });
export const getTabletRecipes = () => api.get("/tablets/recipes");
export const tradeTablet = (targetPlayerName: string, tabletId: string) =>
  api.post("/tablets/trade", { targetPlayerName, tabletId });

// Crafting
export const getPlayerResources = () => api.get("/crafting/resources");
export const getPlanetCraftingResources = (planetId: string) =>
  api.get(`/crafting/resources/planet/${planetId}`);
export const getRecipes = (query?: string) =>
  api.get(`/crafting/recipes${query || ""}`);
export const startCraft = (
  planetId: string,
  recipeId: string,
  batchSize?: number,
) => api.post("/crafting/craft", { planetId, recipeId, batchSize });
export const collectRefinery = (queueId: string) =>
  api.post("/crafting/collect", { queueId });
export const collectPlanetResources = (planetId: string) =>
  api.post("/crafting/collect-planet", { planetId });
export const collectAllRefinery = (planetId: string) =>
  api.post("/crafting/collect-all", { planetId });

// Planet Trades
export const offerPlanetTrade = (data: {
  recipientName: string;
  tradeType: "resource" | "planet";
  planetId?: string;
  resourceType?: string;
  quantity?: number;
  transferPlanetId?: string;
  price?: number;
}) => api.post("/planet-trades/offer", data);
export const getIncomingTrades = () => api.get("/planet-trades/incoming");
export const getOutgoingTrades = () => api.get("/planet-trades/outgoing");
export const acceptTrade = (offerId: string) =>
  api.post(`/planet-trades/${offerId}/accept`);
export const rejectTrade = (offerId: string) =>
  api.post(`/planet-trades/${offerId}/reject`);
export const cancelTrade = (offerId: string) =>
  api.post(`/planet-trades/${offerId}/cancel`);

// AI Assistant
export const askAI = (question: string) => api.post("/ai/ask", { question });

// Planet Combat
export const bombardPlanet = (planetId: string, energyToExpend: number) =>
  api.post("/planet-combat/bombard", { planetId, energyToExpend });
export const fortifyPlanet = (planetId: string, type: string, amount: number) =>
  api.post("/planet-combat/fortify", { planetId, type, amount });
export const getPlanetDefenses = (planetId: string) =>
  api.get(`/planet-combat/defenses/${planetId}`);

// Rare Spawns
export const getResourceEvents = () => api.get("/events/resource-events");
export const harvestEvent = (eventId: string, nodeIndex: number) =>
  api.post(`/events/harvest/${eventId}`, { nodeIndex });
export const salvageEvent = (eventId: string) =>
  api.post(`/events/salvage/${eventId}`);
export const attackGuardian = (eventId: string) =>
  api.post(`/events/attack-guardian/${eventId}`);

// Syndicate Economy — Pool
export const getSyndicatePool = () => api.get("/syndicate-economy/pool");
export const depositToPool = (resourceId: string, quantity: number) =>
  api.post("/syndicate-economy/pool/deposit", { resourceId, quantity });
export const withdrawFromPool = (resourceId: string, quantity: number) =>
  api.post("/syndicate-economy/pool/withdraw", { resourceId, quantity });
export const setPoolPermission = (playerId: string, level: string) =>
  api.post("/syndicate-economy/pool/permission", { playerId, level });
export const getPoolLog = (limit?: number) =>
  api.get("/syndicate-economy/pool/log", { params: limit ? { limit } : {} });

// Syndicate Economy — Factory
export const getSyndicateFactory = () => api.get("/syndicate-economy/factory");
export const designateFactory = (planetId: string) =>
  api.post("/syndicate-economy/factory/designate", { planetId });
export const revokeFactory = () =>
  api.post("/syndicate-economy/factory/revoke");

// Syndicate Economy — Projects
export const getMegaProjectDefinitions = () =>
  api.get("/syndicate-economy/projects/definitions");
export const getSyndicateProjects = () =>
  api.get("/syndicate-economy/projects");
export const startMegaProject = (
  projectTypeId: string,
  targetSectorId?: number,
) =>
  api.post("/syndicate-economy/projects/start", {
    projectTypeId,
    targetSectorId,
  });
export const contributeToProject = (
  projectId: string,
  resourceId: string | null,
  quantity: number,
  fromPool?: boolean,
) =>
  api.post(`/syndicate-economy/projects/${projectId}/contribute`, {
    resourceId,
    quantity,
    fromPool,
  });
export const getProjectDetail = (projectId: string) =>
  api.get(`/syndicate-economy/projects/${projectId}`);
export const cancelProject = (projectId: string) =>
  api.post(`/syndicate-economy/projects/${projectId}/cancel`);

// Syndicate Economy — Structures
export const getSyndicateStructures = () =>
  api.get("/syndicate-economy/structures");

// ── Syndicate Browse & Join ─────────────────────────────────
export const browseSyndicates = (params?: {
  search?: string;
  recruitment_mode?: string;
  min_members?: number;
  max_members?: number;
  sort_by?: string;
}) => api.get("/social/syndicates/browse", { params });

export const joinSyndicate = (syndicateId: string, message?: string) =>
  api.post(`/social/syndicate/${syndicateId}/join`, { message });

export const joinSyndicateByCode = (code: string) =>
  api.post("/social/syndicate/join-code", { code });

export const getJoinRequests = (syndicateId: string) =>
  api.get(`/social/syndicate/${syndicateId}/requests`);

export const reviewJoinRequest = (
  syndicateId: string,
  requestId: string,
  accept: boolean,
) =>
  api.post(`/social/syndicate/${syndicateId}/requests/${requestId}/review`, {
    accept,
  });

// ── Invite Codes ────────────────────────────────────────────
export const createInviteCode = (
  syndicateId: string,
  uses?: number,
  expires_hours?: number,
) =>
  api.post(`/social/syndicate/${syndicateId}/invite-code`, {
    uses,
    expires_hours,
  });

export const getInviteCodes = (syndicateId: string) =>
  api.get(`/social/syndicate/${syndicateId}/invite-codes`);

export const revokeInviteCode = (syndicateId: string, codeId: string) =>
  api.delete(`/social/syndicate/${syndicateId}/invite-code/${codeId}`);

// ── Roles & Permissions ────────────────────────────────────
export const getSyndicateRoles = (syndicateId: string) =>
  api.get(`/syndicate-governance/${syndicateId}/roles`);

export const createSyndicateRole = (
  syndicateId: string,
  name: string,
  permissions: string[],
  priority?: number,
) =>
  api.post(`/syndicate-governance/${syndicateId}/roles`, {
    name,
    permissions,
    priority,
  });

export const updateSyndicateRole = (
  syndicateId: string,
  roleId: string,
  data: { name?: string; permissions?: string[]; priority?: number },
) => api.put(`/syndicate-governance/${syndicateId}/roles/${roleId}`, data);

export const deleteSyndicateRole = (syndicateId: string, roleId: string) =>
  api.delete(`/syndicate-governance/${syndicateId}/roles/${roleId}`);

export const assignMemberRole = (
  syndicateId: string,
  playerId: string,
  roleId: string | null,
) =>
  api.post(`/syndicate-governance/${syndicateId}/members/${playerId}/role`, {
    role_id: roleId,
  });

// ── Governance Settings ─────────────────────────────────────
export const getSyndicateSettings = (syndicateId: string) =>
  api.get(`/syndicate-governance/${syndicateId}/settings`);

export const updateSyndicateSettings = (
  syndicateId: string,
  settings: Record<string, any>,
) => api.put(`/syndicate-governance/${syndicateId}/settings`, settings);

// ── Votes ───────────────────────────────────────────────────
export const getSyndicateVotes = (syndicateId: string) =>
  api.get(`/syndicate-governance/${syndicateId}/votes`);

export const getVoteDetail = (syndicateId: string, voteId: string) =>
  api.get(`/syndicate-governance/${syndicateId}/votes/${voteId}`);

export const proposeVote = (
  syndicateId: string,
  type: string,
  description: string,
  target_data?: any,
) =>
  api.post(`/syndicate-governance/${syndicateId}/votes`, {
    type,
    description,
    target_data,
  });

export const castVote = (syndicateId: string, voteId: string, choice: string) =>
  api.post(`/syndicate-governance/${syndicateId}/votes/${voteId}/cast`, {
    choice,
  });

// ── Governance Kick ─────────────────────────────────────────
export const governanceKick = (syndicateId: string, playerId: string) =>
  api.post(`/syndicate-governance/${syndicateId}/kick`, {
    player_id: playerId,
  });

// Trade History
export const getTradeHistory = (params?: {
  commodity?: string;
  direction?: string;
  limit?: number;
  offset?: number;
}) => api.get("/trade-history", { params });

// ── Trade Routes & Caravans ───────────────────────────────
export const getTradeRoutes = () => api.get("/trade-routes");
export const createTradeRoute = (
  sourceType: string,
  sourceId: string,
  destPlanetId: string,
  fuelPaid: boolean,
) =>
  api.post("/trade-routes", { sourceType, sourceId, destPlanetId, fuelPaid });
export const deleteTradeRoute = (id: string) =>
  api.delete(`/trade-routes/${id}`);
export const toggleRouteFuel = (id: string, fuelPaid: boolean) =>
  api.patch(`/trade-routes/${id}`, { fuelPaid });
export const resumeRoute = (id: string) =>
  api.post(`/trade-routes/${id}/resume`);
export const getSectorCaravans = () => api.get("/trade-routes/caravans");
export const ransackCaravan = (caravanId: string) =>
  api.post("/trade-routes/ransack", { caravanId });
export const escortCaravan = (caravanId: string) =>
  api.post("/trade-routes/escort", { caravanId });
export const getRouteLogs = (routeId: string) =>
  api.get(`/trade-routes/${routeId}/logs`);
export const scoutCaravans = () => api.post("/trade-routes/scout");

// ── Profile ─────────────────────────────────────────────
export const getPlayerProfile = () => api.get("/profile");
export const getProfileActivity = (limit?: number, before?: string) => {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (before) params.set("before", before);
  const qs = params.toString();
  return api.get(`/profile/activity${qs ? "?" + qs : ""}`);
};
export const getProfileMilestones = () => api.get("/profile/milestones");

// ── Account Settings ──────────────────────────────────────
export const changeUsername = (newUsername: string) =>
  api.post("/auth/change-username", { newUsername });
export const changeRace = (newRace: string, password: string) =>
  api.post("/auth/change-race", { newRace, password });
export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post("/auth/change-password", { currentPassword, newPassword });
export const deleteAccount = (password: string) =>
  api.delete("/auth/account", { data: { password } });

export default api;
