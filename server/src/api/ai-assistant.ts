import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import db from "../db/connection";

const router = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// In-memory rate limiting: 10 req/player/min
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const SYSTEM_PROMPT = `You are ARIA (Advanced Reconnaissance & Intelligence Agent), the AI assistant aboard the player's ship in Cosmic Horizon, a multiplayer space strategy game.

You help players with:
- Game mechanics (trading, combat, exploration, planets, missions, NPCs)
- Strategy advice (trade routes, combat tactics, planet management)
- Command reference (the terminal uses text commands like: move, look, scan, dock, buy, sell, fire, flee, warp, etc.)
- Understanding game systems (energy, credits, factions, syndicates, alliances)

Key game facts:
- 5,000 sectors to explore, each with planets, outposts, and NPCs
- Trading: buy/sell cyrillium, food, tech at outposts. Prices vary by sector.
- Combat: fire <player> <energy>. Energy determines damage. Flee to escape.
- Planets: claim unclaimed planets, colonize with different races, upgrade for production
- Star Malls: dock at outposts with star malls for ships, upgrades, missions, refueling
- Energy regenerates over time. Most actions cost energy.
- Factions: earn fame by interacting with NPCs and completing missions
- Syndicates: player guilds with treasury, governance, shared planets

Keep responses concise (2-4 sentences). Use game terminology. Be helpful and in-character as a ship AI.`;

router.post("/ask", requireAuth, async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: "AI assistant is not configured" });
  }

  const playerId = req.session.playerId as string;
  const { question } = req.body;
  if (!question || typeof question !== "string" || question.length > 500) {
    return res.status(400).json({ error: "Question required (max 500 chars)" });
  }

  // Rate limit check
  const now = Date.now();
  const limit = rateLimits.get(playerId);
  if (limit && now < limit.resetAt) {
    if (limit.count >= 10) {
      const waitSec = Math.ceil((limit.resetAt - now) / 1000);
      return res
        .status(429)
        .json({ error: `Rate limited. Try again in ${waitSec}s.` });
    }
    limit.count++;
  } else {
    rateLimits.set(playerId, { count: 1, resetAt: now + 60000 });
  }

  try {
    // Get player context
    const player = await db("players").where({ id: playerId }).first();
    const ship = player?.current_ship_id
      ? await db("ships").where({ id: player.current_ship_id }).first()
      : null;

    const contextMsg = player
      ? `Player context: ${player.username}, sector ${player.current_sector_id}, ${player.energy} energy, ${player.credits} credits, ship: ${ship?.ship_type_id || "none"}, hull: ${ship?.hull_hp || 0}/${ship?.max_hull_hp || 0}`
      : "";

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(contextMsg ? [{ role: "system", content: contextMsg }] : []),
          { role: "user", content: question },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", response.status, await response.text());
      return res
        .status(502)
        .json({ error: "AI service temporarily unavailable" });
    }

    const data = (await response.json()) as any;
    const answer =
      data.choices?.[0]?.message?.content || "No response from ARIA.";

    res.json({ answer });
  } catch (err) {
    console.error("AI assistant error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
