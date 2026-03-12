import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: `${API_BASE}/api/arcade`,
  withCredentials: true,
});

// Restore token on load
const savedToken = localStorage.getItem("token");
if (savedToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
}

export async function challengePlayer(
  targetId: string,
  gameType = "asteroid_mining",
) {
  const { data } = await api.post("/challenge", { targetId, gameType });
  return data as { challengeId: string; expiresAt: string };
}

export async function acceptChallenge(challengeId: string) {
  const { data } = await api.post(`/challenge/${challengeId}/accept`);
  return data as { sessionId: string };
}

export async function declineChallenge(challengeId: string) {
  await api.post(`/challenge/${challengeId}/decline`);
}

export async function startAIMatch(
  gameType = "asteroid_mining",
  difficulty = "medium",
) {
  const { data } = await api.post("/challenge/ai", { gameType, difficulty });
  return data as {
    sessionId: string;
    opponent: { id: string | null; username: string };
    gameType: string;
    isPlayer1: boolean;
  };
}

export async function getSession(sessionId: string) {
  const { data } = await api.get(`/session/${sessionId}`);
  return data;
}

export async function submitRoundResult(
  sessionId: string,
  hitTimings: number[],
) {
  const { data } = await api.post(`/session/${sessionId}/round-result`, {
    hitTimings,
  });
  return data;
}

export async function selectDrink(sessionId: string, drinkId: string) {
  const { data } = await api.post(`/session/${sessionId}/drink`, { drinkId });
  return data;
}

export async function startRound(sessionId: string) {
  const { data } = await api.post(`/session/${sessionId}/start-round`);
  return data;
}

export async function claimReward(sessionId: string) {
  const { data } = await api.post(`/session/${sessionId}/claim`);
  return data as {
    credits: number;
    xp: number;
    tokens: number;
    totalXp: number;
    level: number;
    levelUp: any;
  };
}

export async function getShopItems() {
  const { data } = await api.get("/shop");
  return data as {
    balance: number;
    items: {
      id: string;
      name: string;
      description: string;
      slot: string;
      stat_bonus: number;
      token_price: number;
      max_stack: number;
    }[];
  };
}

export async function buyShopItem(upgradeTypeId: string) {
  const { data } = await api.post(`/shop/buy/${upgradeTypeId}`);
  return data as {
    installed: boolean;
    installId: string;
    name: string;
    slot: string;
    effectiveBonus: number;
    newBalance: number;
  };
}

export async function getTokenBalance() {
  const { data } = await api.get("/shop/balance");
  return data as { balance: number };
}

export async function submitTurretResult(
  sessionId: string,
  turretResult: {
    wavesCompleted: number;
    enemiesKilled: number;
    baseHPRemaining: number;
  },
) {
  const { data } = await api.post(`/session/${sessionId}/round-result`, {
    turretResult,
  });
  return data;
}
